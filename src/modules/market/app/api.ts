/**
 * Accès marché — **ESI publique uniquement** (aucun login requis ; fonctionne en
 * web comme en desktop, sans `CLIENT_ID`). Tout passe par le client ESI conforme
 * de la suite (User-Agent posé côté Rust en desktop, respect du cache `expires`,
 * surveillance du quota d'erreurs).
 */
import { esi, esiGet, esiPost } from "@/core/esi/client";
import { kv } from "@/core/storage";
import { track } from "@/core/analytics";
import { resolveNames } from "@/core/universe";
import { logger } from "@/core/log";
import type { HistoryDay, MarketOrder, TypeInfo } from "./lib/types";
import { REGION_NAMES, SCOPES, STRUCTURE_ID_FLOOR, type ScopeId } from "./lib/regions";

const log = logger("market");
const store = kv("market");

const MAX_PAGES = 30; // garde-fou (Jita ≈ 1–3 pages par type)

// — Caches mémoire (session) —
const idByName = new Map<string, number>(); // nom minuscule → type_id
const typeInfoCache = new Map<number, TypeInfo>();
const systemCache = new Map<number, { name: string; security: number }>();

// ————————————————————————————————————————————————————————————————
// Résolution noms → type_id (catalogue + recherche)
// ————————————————————————————————————————————————————————————————

interface IdsResponse {
  inventory_types?: { id: number; name: string }[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Résout une liste de **noms exacts** EVE en `{nom canonique, type_id}` via
 * `POST /universe/ids/` (caché mémoire + persistant). Les noms inconnus sont
 * simplement absents du résultat.
 */
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
    } else {
      missing.push(raw.trim());
    }
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
      log.warn("resolveTypeNames batch failed", e);
    }
  }
  return out;
}

/** Détails d'un type (nom canonique, volume, groupe), caché. */
export async function fetchTypeInfo(typeId: number): Promise<TypeInfo> {
  const mem = typeInfoCache.get(typeId);
  if (mem) return mem;
  const raw = await esiGet<{
    type_id: number;
    name: string;
    description?: string;
    group_id?: number;
    volume?: number;
  }>(`/universe/types/${typeId}/`);
  const info: TypeInfo = {
    typeId,
    name: raw.name,
    description: raw.description,
    groupId: raw.group_id,
    volume: raw.volume,
  };
  typeInfoCache.set(typeId, info);
  return info;
}

const routeCache = new Map<string, number>();

/**
 * Nombre de **sauts** entre deux systèmes (route la plus courte), via ESI public
 * `/route/{origin}/{destination}/`. `0` si même système ; caché par paire.
 */
export async function fetchRoute(origin: number, destination: number): Promise<number> {
  if (origin === destination) return 0;
  const key = `${origin}>${destination}`;
  const cached = routeCache.get(key);
  if (cached != null) return cached;
  const ids = await esiGet<number[]>(`/route/${origin}/${destination}/`, {
    flag: "shortest",
  });
  const jumps = Math.max(0, ids.length - 1);
  routeCache.set(key, jumps);
  return jumps;
}

// ————————————————————————————————————————————————————————————————
// Carnet d'ordres
// ————————————————————————————————————————————————————————————————

interface RawOrder {
  order_id: number;
  type_id: number;
  location_id: number;
  system_id: number;
  volume_total: number;
  volume_remain: number;
  min_volume: number;
  price: number;
  is_buy_order: boolean;
  duration: number;
  issued: string;
  range: string;
}

/** Tous les ordres (achat + vente) d'un type dans une région (pagination gérée). */
async function regionOrders(regionId: number, typeId: number): Promise<MarketOrder[]> {
  const first = await esi<RawOrder[]>({
    path: `/markets/${regionId}/orders/`,
    query: { type_id: typeId, order_type: "all", page: 1 },
  });
  let raw = first.data ?? [];
  const pages = Math.min(first.pages || 1, MAX_PAGES);
  for (let p = 2; p <= pages; p++) {
    const r = await esi<RawOrder[]>({
      path: `/markets/${regionId}/orders/`,
      query: { type_id: typeId, order_type: "all", page: p },
    });
    raw = raw.concat(r.data ?? []);
  }
  return raw.map((o) => ({
    orderId: o.order_id,
    typeId: o.type_id,
    isBuy: o.is_buy_order,
    price: o.price,
    volumeRemain: o.volume_remain,
    volumeTotal: o.volume_total,
    minVolume: o.min_volume,
    range: o.range,
    locationId: o.location_id,
    systemId: o.system_id,
    regionId,
    issued: o.issued,
    duration: o.duration,
    regionName: REGION_NAMES[regionId],
  }));
}

/** Détails d'un système (nom + sécurité), caché mémoire + persistant. */
async function systemInfo(systemId: number): Promise<{ name: string; security: number } | null> {
  const mem = systemCache.get(systemId);
  if (mem) return mem;
  const persisted = await store.get(`sys:${systemId}`).catch(() => null);
  if (persisted) {
    try {
      const v = JSON.parse(persisted) as { name: string; security: number };
      systemCache.set(systemId, v);
      return v;
    } catch {
      /* ignore */
    }
  }
  try {
    const raw = await esiGet<{ name: string; security_status: number }>(
      `/universe/systems/${systemId}/`,
    );
    const v = { name: raw.name, security: raw.security_status };
    systemCache.set(systemId, v);
    void store.set(`sys:${systemId}`, JSON.stringify(v)).catch(() => {});
    return v;
  } catch (e) {
    log.warn(`systemInfo failed for ${systemId}`, e);
    return null;
  }
}

/** Enrichit les ordres : noms de système (+ sécurité) et de station/structure. */
async function enrichOrders(orders: MarketOrder[]): Promise<MarketOrder[]> {
  const systemIds = [...new Set(orders.map((o) => o.systemId).filter(Boolean))];
  const stationIds = [
    ...new Set(
      orders
        .map((o) => o.locationId)
        .filter((id) => id > 0 && id < STRUCTURE_ID_FLOOR),
    ),
  ];

  const [systems, stations] = await Promise.all([
    Promise.all(systemIds.map((id) => systemInfo(id).then((v) => [id, v] as const))),
    resolveNames(stationIds),
  ]);
  const sysMap = new Map(systems);

  for (const o of orders) {
    const sys = sysMap.get(o.systemId);
    if (sys) {
      o.systemName = sys.name;
      o.security = sys.security;
    }
    if (o.locationId >= STRUCTURE_ID_FLOOR) {
      o.isStructure = true;
      o.locationName = sys ? `${sys.name} · Structure joueur` : "Structure joueur";
    } else {
      o.locationName = stations.get(o.locationId)?.name ?? `Station #${o.locationId}`;
    }
  }
  return orders;
}

/** Charge et enrichit tout le carnet d'un type pour une portée de marché. */
export async function fetchMarket(scopeId: ScopeId, typeId: number): Promise<MarketOrder[]> {
  track("market_item_viewed", { scope: scopeId });
  const scope = SCOPES[scopeId];
  const perRegion = await Promise.all(
    scope.regions.map((r) => regionOrders(r, typeId)),
  );
  const all = perRegion.flat();
  return enrichOrders(all);
}

// ————————————————————————————————————————————————————————————————
// Historique
// ————————————————————————————————————————————————————————————————

interface RawHistory {
  date: string;
  average: number;
  highest: number;
  lowest: number;
  volume: number;
  order_count: number;
}

/** Historique journalier d'un type dans la région d'historique de la portée. */
export async function fetchHistory(scopeId: ScopeId, typeId: number): Promise<HistoryDay[]> {
  const region = SCOPES[scopeId].historyRegion;
  const raw = await esiGet<RawHistory[]>(`/markets/${region}/history/`, {
    type_id: typeId,
  });
  return (raw ?? []).map((d) => ({
    date: d.date,
    average: d.average,
    highest: d.highest,
    lowest: d.lowest,
    volume: d.volume,
    orderCount: d.order_count,
  }));
}
