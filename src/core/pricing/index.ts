/**
 * Service de **prix marché partagé** de la suite — source unique pour résoudre
 * les noms en `type_id`, charger le carnet d'ordres Jita (avec **VWAP** pondéré
 * par la quantité), les prix ajustés (EIV) et des cotations agrégées rapides.
 *
 * Mutualise ce que mining / industry / market / trade refaisaient chacun de leur
 * côté. Tout passe par le client ESI conforme (User-Agent posé côté Rust en
 * desktop, cache `expires`, quota d'erreurs). Fuzzwork (tiers) sert au chemin
 * « beaucoup de types, prix simple » (valorisation d'inventaire).
 */
import { esi, esiGet, esiPost } from "@/core/esi/client";
import { thirdPartyJson } from "@/core/http/thirdParty";

/** Région The Forge (Jita) et station Jita IV-4 Caldari Navy Assembly Plant. */
export const FORGE_REGION = 10000002;
export const JITA_4_4 = 60003760;
const FUZZWORK_AGG = "https://market.fuzzwork.co.uk/aggregates/";
const MAX_BOOK_PAGES = 10;

/** Un ordre du carnet (prix + volume restant). */
export interface Order {
  price: number;
  volume: number;
}

/** Carnet d'un type : ordres d'achat (prix décroissant) et de vente (croissant). */
export interface TypeBook {
  buy: Order[];
  sell: Order[];
}

/** Cotation simple (meilleur achat / vente). */
export interface Quote {
  buy: number;
  sell: number;
}

// ───────────────────────── Primitives pures (testables) ─────────────────────

/**
 * Prix effectif **VWAP** pour traiter `qty` unités : on consomme les ordres du
 * meilleur au pire (le tableau est supposé déjà trié dans le bon sens) jusqu'à
 * couvrir la quantité, et on renvoie la moyenne pondérée par le volume pris.
 * Si le carnet ne couvre pas tout, VWAP du disponible. 0 si carnet vide.
 */
export function effectivePrice(orders: Order[], qty: number): number {
  if (orders.length === 0) return 0;
  if (qty <= 0) return orders[0].price;
  let remaining = qty;
  let isk = 0;
  let vol = 0;
  for (const o of orders) {
    const take = Math.min(remaining, o.volume);
    isk += take * o.price;
    vol += take;
    remaining -= take;
    if (remaining <= 0) break;
  }
  return vol > 0 ? isk / vol : 0;
}

/** Meilleur prix du carnet (premier ordre), 0 si vide. */
export function bestPrice(orders: Order[]): number {
  return orders[0]?.price ?? 0;
}

// ───────────────────────── Résolution noms → type_id ────────────────────────

const idCache = new Map<string, { id: number; name: string }>();

interface IdsResponse {
  inventory_types?: { id: number; name: string }[];
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Résout des noms exacts en `{ id, name canonique }` (caché mémoire). */
export async function resolveTypeIds(
  names: string[],
): Promise<Map<string, { id: number; name: string }>> {
  const out = new Map<string, { id: number; name: string }>();
  const todo: string[] = [];
  for (const n of names) {
    const key = n.trim().toLowerCase();
    if (!key) continue;
    const c = idCache.get(key);
    if (c) out.set(key, c);
    else todo.push(n.trim());
  }
  for (const part of chunk([...new Set(todo)], 200)) {
    try {
      const data = await esiPost<IdsResponse>("/universe/ids/", part);
      for (const t of data.inventory_types ?? []) {
        const entry = { id: t.id, name: t.name };
        idCache.set(t.name.toLowerCase(), entry);
        out.set(t.name.toLowerCase(), entry);
      }
    } catch {
      /* lot ignoré */
    }
  }
  return out;
}

// ───────────────────────── Prix ajustés (EIV) ───────────────────────────────

let adjustedCache: Map<number, number> | null = null;

interface PricesRow {
  type_id: number;
  adjusted_price?: number;
}

/** Prix ajustés globaux d'ESI (`/markets/prices/`), base de l'EIV. Cachés. */
export async function loadAdjustedPrices(): Promise<Map<number, number>> {
  if (adjustedCache) return adjustedCache;
  const map = new Map<number, number>();
  try {
    const rows = await esiGet<PricesRow[]>("/markets/prices/");
    for (const r of rows) {
      if (r.adjusted_price != null) map.set(r.type_id, r.adjusted_price);
    }
  } catch {
    /* EIV dégradé si indisponible */
  }
  adjustedCache = map;
  return map;
}

// ───────────────────────── Carnets Jita (VWAP) ──────────────────────────────

const bookCache = new Map<number, TypeBook>();

interface RawOrder {
  price: number;
  volume_remain: number;
  is_buy_order: boolean;
  location_id: number;
}

/** Charge le carnet Jita IV-4 d'un type (toutes pages), trié, caché. */
async function fetchBook(typeId: number): Promise<TypeBook> {
  const cached = bookCache.get(typeId);
  if (cached) return cached;
  const buy: Order[] = [];
  const sell: Order[] = [];
  const first = await esi<RawOrder[]>({
    path: `/markets/${FORGE_REGION}/orders/`,
    query: { type_id: typeId, order_type: "all", page: 1 },
  }).catch(() => null);
  if (first) {
    const pages = Math.min(first.pages || 1, MAX_BOOK_PAGES);
    const all = [...(first.data ?? [])];
    for (let p = 2; p <= pages; p++) {
      const r = await esi<RawOrder[]>({
        path: `/markets/${FORGE_REGION}/orders/`,
        query: { type_id: typeId, order_type: "all", page: p },
      }).catch(() => null);
      if (r?.data) all.push(...r.data);
    }
    for (const o of all) {
      if (o.location_id !== JITA_4_4) continue;
      (o.is_buy_order ? buy : sell).push({ price: o.price, volume: o.volume_remain });
    }
  }
  buy.sort((a, b) => b.price - a.price); // meilleur achat d'abord
  sell.sort((a, b) => a.price - b.price); // meilleure vente d'abord
  const book: TypeBook = { buy, sell };
  bookCache.set(typeId, book);
  return book;
}

/** Charge les carnets de plusieurs types (concurrence limitée). */
export async function loadJitaBooks(ids: number[]): Promise<Map<number, TypeBook>> {
  const out = new Map<number, TypeBook>();
  const unique = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  let i = 0;
  const worker = async () => {
    while (i < unique.length) {
      const id = unique[i++];
      out.set(id, await fetchBook(id));
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, unique.length) }, worker));
  return out;
}

// ───────────────────────── Cotations agrégées (Fuzzwork) ────────────────────

const quoteCache = new Map<number, Quote>();

interface FuzzAgg {
  buy?: { max?: string };
  sell?: { min?: string };
}

/**
 * Cotations simples (meilleur achat/vente) pour **beaucoup de types** en peu
 * d'appels, via Fuzzwork — idéal pour valoriser un inventaire (pas de VWAP).
 */
export async function loadJitaQuotes(ids: number[]): Promise<Map<number, Quote>> {
  const out = new Map<number, Quote>();
  const todo: number[] = [];
  for (const id of ids) {
    const c = quoteCache.get(id);
    if (c) out.set(id, c);
    else if (Number.isFinite(id) && id > 0) todo.push(id);
  }
  for (const part of chunk([...new Set(todo)], 100)) {
    try {
      const data = await thirdPartyJson<Record<string, FuzzAgg>>(
        `${FUZZWORK_AGG}?station=${JITA_4_4}&types=${part.join(",")}`,
      );
      for (const [id, row] of Object.entries(data)) {
        const q: Quote = { buy: Number(row.buy?.max) || 0, sell: Number(row.sell?.min) || 0 };
        quoteCache.set(Number(id), q);
        out.set(Number(id), q);
      }
    } catch {
      /* lot ignoré */
    }
  }
  return out;
}

/** Vide tous les caches de prix (forcer un rafraîchissement). */
export function clearPricingCaches(): void {
  adjustedCache = null;
  bookCache.clear();
  quoteCache.clear();
}
