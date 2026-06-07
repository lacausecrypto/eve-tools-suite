/**
 * Accès marché du Trade Co-Pilot — **ESI publique uniquement** (web + desktop,
 * sans `CLIENT_ID`, EULA-safe). Tout passe par le client ESI conforme.
 *
 * Points lourds maîtrisés :
 *  - balayage **région-wide** (`/markets/{region}/orders/` sans type_id, paginé)
 *    avec **concurrence bornée**, **progression** et **annulation** ;
 *  - agrégation **en flux** filtrée à la station du hub (mémoire maîtrisée) ;
 *  - enrichissement historique limité aux **meilleurs candidats**.
 */
import { esi, esiGet, esiPost } from "@/core/esi/client";
import { kv } from "@/core/storage";
import { track } from "@/core/analytics";
import { logger } from "@/core/log";
import type { StationAgg } from "./lib/types";
import type { Level } from "./lib/depth";

const log = logger("trade");
const store = kv("trade");

const MAX_SCAN_PAGES = 450; // The Forge ≈ 409 pages
const SCAN_CONCURRENCY = 12;
const TYPE_PAGES_CAP = 20; // ordres par type (un hub) : largement suffisant
const HISTORY_DAYS = 20;

interface RawOrder {
  type_id: number;
  location_id: number;
  volume_remain: number;
  price: number;
  is_buy_order: boolean;
}

/** Exécute `fn` sur les items avec une concurrence bornée. */
async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ————————————————————————————————————————————————————————————————
// Résolution noms ↔ ids & métadonnées
// ————————————————————————————————————————————————————————————————

const idByName = new Map<string, number>();

interface IdsResponse {
  inventory_types?: { id: number; name: string }[];
}

/** Résout des **noms exacts** EVE en `{id, name}` (caché mémoire + persistant). */
export async function resolveTypeNames(
  names: string[],
): Promise<{ id: number; name: string }[]> {
  const out: { id: number; name: string }[] = [];
  const missing: string[] = [];
  for (const raw of names) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    const mem = idByName.get(key);
    if (mem) {
      out.push({ id: mem, name: raw.trim() });
      continue;
    }
    const persisted = await store.get(`id:${key}`).catch(() => null);
    const pid = persisted ? parseInt(persisted, 10) : NaN;
    if (Number.isFinite(pid)) {
      idByName.set(key, pid);
      out.push({ id: pid, name: raw.trim() });
    } else missing.push(raw.trim());
  }
  for (const part of chunk([...new Set(missing)], 200)) {
    try {
      const res = await esiPost<IdsResponse>("/universe/ids/", part);
      for (const it of res.inventory_types ?? []) {
        idByName.set(it.name.toLowerCase(), it.id);
        out.push({ id: it.id, name: it.name });
        void store.set(`id:${it.name.toLowerCase()}`, String(it.id)).catch(() => {});
      }
    } catch (e) {
      log.warn("resolveTypeNames failed", e);
    }
  }
  return out;
}

interface TypeMeta {
  name: string;
  packagedVolume: number;
}
const metaCache = new Map<number, TypeMeta>();

/** Nom + volume **packaged** (m³) d'un type, caché mémoire + persistant. */
export async function fetchTypeMeta(typeId: number): Promise<TypeMeta> {
  const mem = metaCache.get(typeId);
  if (mem) return mem;
  const persisted = await store.get(`t:${typeId}`).catch(() => null);
  if (persisted) {
    try {
      const v = JSON.parse(persisted) as TypeMeta;
      metaCache.set(typeId, v);
      return v;
    } catch {
      /* ignore */
    }
  }
  const raw = await esiGet<{ name: string; volume?: number; packaged_volume?: number }>(
    `/universe/types/${typeId}/`,
  );
  const v: TypeMeta = {
    name: raw.name,
    packagedVolume: raw.packaged_volume ?? raw.volume ?? 0,
  };
  metaCache.set(typeId, v);
  void store.set(`t:${typeId}`, JSON.stringify(v)).catch(() => {});
  return v;
}

/** Résout en lot les noms d'un ensemble d'ids (pour étiqueter les résultats). */
export async function fetchNames(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  await mapPool([...new Set(ids)], 16, async (id) => {
    try {
      out.set(id, (await fetchTypeMeta(id)).name);
    } catch {
      out.set(id, `#${id}`);
    }
  });
  return out;
}

// ————————————————————————————————————————————————————————————————
// Prix de référence (un seul appel pour ~16 000 types)
// ————————————————————————————————————————————————————————————————

let refPrices: Map<number, number> | null = null;

/** `average_price` global par type (`/markets/prices/`), caché session. */
export async function fetchReferencePrices(): Promise<Map<number, number>> {
  if (refPrices) return refPrices;
  const map = new Map<number, number>();
  try {
    const rows = await esiGet<{ type_id: number; average_price?: number }[]>(
      "/markets/prices/",
    );
    for (const r of rows) if (r.average_price != null) map.set(r.type_id, r.average_price);
  } catch (e) {
    log.warn("fetchReferencePrices failed", e);
  }
  refPrices = map;
  return map;
}

// ————————————————————————————————————————————————————————————————
// Balayage région-wide (station trading)
// ————————————————————————————————————————————————————————————————

export interface ScanToken {
  cancelled: boolean;
}

/** Réduit une page d'ordres dans l'agrégat, filtrée à la station du hub. */
function reducePage(orders: RawOrder[], station: number, agg: Map<number, StationAgg>) {
  for (const o of orders) {
    if (o.location_id !== station) continue;
    let a = agg.get(o.type_id);
    if (!a) {
      a = {
        typeId: o.type_id,
        bestBuy: null,
        bestSell: null,
        buyVol: 0,
        sellVol: 0,
        buyers: 0,
        sellers: 0,
      };
      agg.set(o.type_id, a);
    }
    if (o.is_buy_order) {
      a.buyVol += o.volume_remain;
      a.buyers += 1;
      if (a.bestBuy == null || o.price > a.bestBuy) a.bestBuy = o.price;
    } else {
      a.sellVol += o.volume_remain;
      a.sellers += 1;
      if (a.bestSell == null || o.price < a.bestSell) a.bestSell = o.price;
    }
  }
}

/**
 * Balaye tous les ordres d'une région et agrège par type **à la station** du hub.
 * `onProgress(done, total)` suit l'avancement ; `token.cancelled` interrompt.
 */
export async function scanStation(
  region: number,
  station: number,
  onProgress: (done: number, total: number) => void,
  token: ScanToken,
): Promise<StationAgg[]> {
  track("trade_station_scanned");
  const agg = new Map<number, StationAgg>();
  const first = await esi<RawOrder[]>({
    path: `/markets/${region}/orders/`,
    query: { order_type: "all", page: 1 },
  });
  const total = Math.min(first.pages || 1, MAX_SCAN_PAGES);
  reducePage(first.data ?? [], station, agg);
  let done = 1;
  onProgress(done, total);

  const rest: number[] = [];
  for (let p = 2; p <= total; p++) rest.push(p);

  await mapPool(rest, SCAN_CONCURRENCY, async (p) => {
    if (token.cancelled) return;
    try {
      const r = await esi<RawOrder[]>({
        path: `/markets/${region}/orders/`,
        query: { order_type: "all", page: p },
      });
      reducePage(r.data ?? [], station, agg);
    } catch (e) {
      log.warn(`scan page ${p} failed`, e);
    } finally {
      onProgress(++done, total);
    }
  });

  return [...agg.values()];
}

/** Ladders complets (vente + achat) **par type**, à une station. */
export type StationLadders = Map<number, { sells: Level[]; buys: Level[] }>;

/**
 * Balaye toute la région et conserve les **ladders par type** à la station — la
 * base du scan d'arbitrage **full-market** : un seul balayage donne le carnet de
 * **tous** les objets (au lieu de 2 appels par candidat). Mémoire bornée à la
 * station du hub.
 */
export async function scanStationLadders(
  region: number,
  station: number,
  onProgress: (done: number, total: number) => void,
  token: ScanToken,
): Promise<StationLadders> {
  const map: StationLadders = new Map();
  const push = (orders: RawOrder[]) => {
    for (const o of orders) {
      if (o.location_id !== station) continue;
      let e = map.get(o.type_id);
      if (!e) {
        e = { sells: [], buys: [] };
        map.set(o.type_id, e);
      }
      (o.is_buy_order ? e.buys : e.sells).push({ price: o.price, vol: o.volume_remain });
    }
  };

  const first = await esi<RawOrder[]>({
    path: `/markets/${region}/orders/`,
    query: { order_type: "all", page: 1 },
  });
  const total = Math.min(first.pages || 1, MAX_SCAN_PAGES);
  push(first.data ?? []);
  let done = 1;
  onProgress(done, total);

  const rest: number[] = [];
  for (let p = 2; p <= total; p++) rest.push(p);
  await mapPool(rest, SCAN_CONCURRENCY, async (p) => {
    if (token.cancelled) return;
    try {
      const r = await esi<RawOrder[]>({
        path: `/markets/${region}/orders/`,
        query: { order_type: "all", page: p },
      });
      push(r.data ?? []);
    } catch (e) {
      log.warn(`ladder scan page ${p} failed`, e);
    } finally {
      onProgress(++done, total);
    }
  });

  for (const e of map.values()) {
    e.sells.sort((a, b) => a.price - b.price);
    e.buys.sort((a, b) => b.price - a.price);
  }
  return map;
}

// ————————————————————————————————————————————————————————————————
// Ordres d'un type à une station (arbitrage) & historique
// ————————————————————————————————————————————————————————————————

export interface StationQuote {
  sellMin: number | null;
  sellVol: number;
  buyMax: number | null;
  buyVol: number;
  /** Carnet de **vente** trié par prix croissant (achat depuis le marché). */
  sells: Level[];
  /** Carnet d'**achat** trié par prix décroissant (revente immédiate). */
  buys: Level[];
}

/**
 * Cote complète d'un type à une station : meilleurs prix + volumes **et** les
 * ladders triés, indispensables au calcul d'arbitrage réaliste (profondeur).
 */
export async function fetchTypeAtStation(
  region: number,
  station: number,
  typeId: number,
): Promise<StationQuote> {
  const sells: Level[] = [];
  const buys: Level[] = [];
  const first = await esi<RawOrder[]>({
    path: `/markets/${region}/orders/`,
    query: { type_id: typeId, order_type: "all", page: 1 },
  });
  const pages = Math.min(first.pages || 1, TYPE_PAGES_CAP);
  const fold = (orders: RawOrder[]) => {
    for (const o of orders) {
      if (o.location_id !== station) continue;
      if (o.is_buy_order) buys.push({ price: o.price, vol: o.volume_remain });
      else sells.push({ price: o.price, vol: o.volume_remain });
    }
  };
  fold(first.data ?? []);
  for (let p = 2; p <= pages; p++) {
    const r = await esi<RawOrder[]>({
      path: `/markets/${region}/orders/`,
      query: { type_id: typeId, order_type: "all", page: p },
    });
    fold(r.data ?? []);
  }
  sells.sort((a, b) => a.price - b.price);
  buys.sort((a, b) => b.price - a.price);
  return {
    sellMin: sells[0]?.price ?? null,
    sellVol: sells.reduce((s, l) => s + l.vol, 0),
    buyMax: buys[0]?.price ?? null,
    buyVol: buys.reduce((s, l) => s + l.vol, 0),
    sells,
    buys,
  };
}

/** Volume quotidien moyen d'un type (région), sur les derniers jours. */
export async function fetchDailyVolume(region: number, typeId: number): Promise<number> {
  try {
    const raw = await esiGet<{ volume: number }[]>(`/markets/${region}/history/`, {
      type_id: typeId,
    });
    const recent = (raw ?? []).slice(-HISTORY_DAYS);
    if (!recent.length) return 0;
    return recent.reduce((s, d) => s + d.volume, 0) / recent.length;
  } catch {
    return 0;
  }
}

// ————————————————————————————————————————————————————————————————
// Stations → systèmes & sauts (route publique)
// ————————————————————————————————————————————————————————————————

const systemOfStation = new Map<number, number>();

/** Système d'une station (caché) — pour le calcul des sauts. */
export async function stationSystem(stationId: number): Promise<number | null> {
  const mem = systemOfStation.get(stationId);
  if (mem) return mem;
  const persisted = await store.get(`ss:${stationId}`).catch(() => null);
  const pid = persisted ? parseInt(persisted, 10) : NaN;
  if (Number.isFinite(pid)) {
    systemOfStation.set(stationId, pid);
    return pid;
  }
  try {
    const raw = await esiGet<{ system_id: number }>(`/universe/stations/${stationId}/`);
    systemOfStation.set(stationId, raw.system_id);
    void store.set(`ss:${stationId}`, String(raw.system_id)).catch(() => {});
    return raw.system_id;
  } catch (e) {
    log.warn("stationSystem failed", e);
    return null;
  }
}

const routeCache = new Map<string, number>();

/**
 * Nombre de sauts entre deux systèmes — ESI publique. `secure` privilégie la
 * **route haute-sécurité** (`flag=secure`) ; sinon la plus courte (`shortest`).
 */
export async function jumpsBetween(
  fromSystem: number,
  toSystem: number,
  secure = false,
): Promise<number | null> {
  if (fromSystem === toSystem) return 0;
  const flag = secure ? "secure" : "shortest";
  const key = `${fromSystem}-${toSystem}-${flag}`;
  const mem = routeCache.get(key);
  if (mem != null) return mem;
  try {
    const route = await esiGet<number[]>(`/route/${fromSystem}/${toSystem}/`, { flag });
    const jumps = Math.max(0, (route?.length ?? 1) - 1);
    routeCache.set(key, jumps);
    return jumps;
  } catch (e) {
    log.warn("jumpsBetween failed", e);
    return null;
  }
}
