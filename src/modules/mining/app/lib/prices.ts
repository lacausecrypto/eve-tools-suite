/**
 * Valorisation des minerais — prix Jita EFFECTIF en fonction de la quantité.
 *
 * Au lieu d'un prix unitaire fixe, on « descend » dans le carnet d'ordres d'ACHAT
 * de Jita (du meilleur prix au moins bon) en consommant le volume de chaque ordre
 * jusqu'à couvrir la quantité réellement extraite. Le prix retenu est la moyenne
 * pondérée par le volume des ordres consommés (VWAP) → ce que tu toucherais
 * réellement en vendant tout le minerai. Plus la quantité est grande, plus le prix
 * descend (on mange le carnet) : c'est fidèle au marché.
 *
 *  - type_id : résolus localement (table embarquée) → aucun POST réseau.
 *  - carnet d'ordres : ESI /markets/.../orders/ (GET) — source principale.
 *  - Fuzzwork (percentile) : secours si le carnet est vide.
 * Chaîne de repli : forme demandée → autre forme → minerai de base → sell.
 */

import type { ValuationForm } from "@mining/types";
import { ORE_TYPE_IDS } from "@mining/data/oreTypeIds";
import { esi, esiPost } from "@/core/esi/client";
import { thirdPartyJson } from "@/core/http/thirdParty";

const FORGE_REGION = 10000002; // The Forge (région de Jita)
const JITA_4_4 = 60003760;
const FUZZWORK = "https://market.fuzzwork.co.uk/aggregates/";

const typeIdCache = new Map<string, number>();
// Cache des carnets/quotes le temps de la session d'onglet.
const bookCache = new Map<number, BuyOrder[]>();
const fuzzCache = new Map<number, Quote>();

export type PriceSource = "exact" | "form" | "base" | "sell" | "manual";

export interface OreQty {
  ore: string;
  qty: number;
}

export interface PriceResult {
  prices: Record<string, number>; // prix effectif / unité, indexé par minerai
  sources: Record<string, PriceSource>;
  missing: string[];
}

interface Quote {
  buy: number;
  sell: number;
}

interface BuyOrder {
  price: number;
  volume: number;
}

export function baseOf(ore: string): string {
  return ore.replace(/\s+(?:I{1,3}|IV)-Grade$/i, "").trim();
}

function compressed(name: string): string {
  return `Compressed ${name}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Résout les noms en type_id : table locale d'abord, ESI POST seulement si inconnu. */
async function resolveTypeIds(names: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const todo: string[] = [];
  for (const n of names) {
    const key = n.toLowerCase();
    const cached = typeIdCache.get(key);
    if (cached) {
      result.set(key, cached);
      continue;
    }
    const local = ORE_TYPE_IDS[key];
    if (local) {
      typeIdCache.set(key, local);
      result.set(key, local);
      continue;
    }
    todo.push(n);
  }
  // Repli ESI via le client conforme (User-Agent + quota d'erreurs côté Rust).
  for (const part of chunk([...new Set(todo)], 200)) {
    try {
      const data = await esiPost<{ inventory_types?: { id: number; name: string }[] }>(
        "/universe/ids/",
        part,
      );
      for (const t of data.inventory_types ?? []) {
        typeIdCache.set(t.name.toLowerCase(), t.id);
        result.set(t.name.toLowerCase(), t.id);
      }
    } catch {
      /* on continue */
    }
  }
  return result;
}

interface RawOrder {
  price: number;
  volume_remain: number;
  is_buy_order: boolean;
  location_id: number;
}

/** Carnet d'ordres d'achat @ Jita pour un type, trié du meilleur prix au pire. */
async function fetchBuyBook(typeId: number): Promise<BuyOrder[]> {
  if (bookCache.has(typeId)) return bookCache.get(typeId)!;
  const orders: BuyOrder[] = [];
  let page = 1;
  let pages = 1;
  // ESI via le client conforme : User-Agent posé côté Rust, quota d'erreurs
  // surveillé, cache `expires` respecté.
  do {
    let res;
    try {
      res = await esi<RawOrder[]>({
        path: `/markets/${FORGE_REGION}/orders/`,
        query: { type_id: typeId, order_type: "buy", page },
      });
    } catch {
      break;
    }
    pages = res.pages || 1;
    for (const o of res.data) {
      if (o.location_id === JITA_4_4 && o.is_buy_order) {
        orders.push({ price: o.price, volume: o.volume_remain });
      }
    }
    page++;
  } while (page <= pages && page <= 5);
  orders.sort((a, b) => b.price - a.price);
  bookCache.set(typeId, orders);
  return orders;
}

/** Charge les carnets de plusieurs types, en parallèle (concurrence limitée). */
async function loadBooks(ids: number[]): Promise<Map<number, BuyOrder[]>> {
  const out = new Map<number, BuyOrder[]>();
  const unique = [...new Set(ids)];
  let i = 0;
  const worker = async () => {
    while (i < unique.length) {
      const id = unique[i++];
      out.set(id, await fetchBuyBook(id));
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, unique.length) }, worker));
  return out;
}

/**
 * Prix effectif (VWAP) pour vendre `qty` unités dans le carnet d'achat : on
 * consomme les ordres du meilleur au pire jusqu'à couvrir la quantité.
 */
export function effectivePrice(book: BuyOrder[], qty: number): number {
  if (book.length === 0) return 0;
  if (qty <= 0) return book[0].price; // pas de quantité → meilleur ordre
  let remaining = qty;
  let isk = 0;
  let vol = 0;
  for (const o of book) {
    const take = Math.min(remaining, o.volume);
    isk += take * o.price;
    vol += take;
    remaining -= take;
    if (remaining <= 0) break;
  }
  // Si le carnet ne couvre pas toute la quantité, VWAP de ce qui est disponible.
  return vol > 0 ? isk / vol : 0;
}

/** Secours Fuzzwork (percentile) si un carnet est vide. */
async function fetchFuzzwork(ids: number[]): Promise<Map<number, Quote>> {
  const quotes = new Map<number, Quote>();
  const todo = [...new Set(ids)].filter((id) => !fuzzCache.has(id));
  for (const id of ids) {
    const c = fuzzCache.get(id);
    if (c) quotes.set(id, c);
  }
  for (const part of chunk(todo, 200)) {
    try {
      const data = await thirdPartyJson<
        Record<string, { buy: { percentile: string }; sell: { percentile: string } }>
      >(`${FUZZWORK}?station=${JITA_4_4}&types=${part.join(",")}`);
      for (const [id, row] of Object.entries(data)) {
        const q = {
          buy: Number(row.buy?.percentile) || 0,
          sell: Number(row.sell?.percentile) || 0,
        };
        fuzzCache.set(Number(id), q);
        quotes.set(Number(id), q);
      }
    } catch {
      /* on continue */
    }
  }
  return quotes;
}

function applyChain(
  oreQtys: OreQty[],
  form: ValuationForm,
  ids: Map<string, number>,
  books: Map<number, BuyOrder[]>,
  quotes: Map<number, Quote>
): PriceResult {
  const preferCompressed = form === "compressed";
  const idOf = (name: string) => ids.get(name.toLowerCase());

  const prices: Record<string, number> = {};
  const sources: Record<string, PriceSource> = {};
  const missing: string[] = [];

  for (const { ore, qty } of oreQtys) {
    const base = baseOf(ore);
    const order: { name: string; src: PriceSource }[] = [
      { name: preferCompressed ? compressed(ore) : ore, src: "exact" },
      { name: preferCompressed ? ore : compressed(ore), src: "form" },
      { name: preferCompressed ? compressed(base) : base, src: "base" },
      { name: preferCompressed ? base : compressed(base), src: "base" },
    ];

    let picked = 0;
    let source: PriceSource | null = null;

    // 1) carnet d'ordres (prix effectif selon la quantité)
    for (const o of order) {
      const id = idOf(o.name);
      const book = id ? books.get(id) : undefined;
      if (book && book.length > 0) {
        const p = effectivePrice(book, qty);
        if (p > 0) {
          picked = p;
          source = o.src;
          break;
        }
      }
    }
    // 2) secours Fuzzwork (percentile, par unité)
    if (!picked) {
      for (const o of order) {
        const id = idOf(o.name);
        const q = id ? quotes.get(id) : undefined;
        if (q && q.buy > 0) {
          picked = q.buy;
          source = o.src;
          break;
        }
      }
    }
    // 3) dernier recours : prix de vente
    if (!picked) {
      for (const o of order) {
        const id = idOf(o.name);
        const q = id ? quotes.get(id) : undefined;
        if (q && q.sell > 0) {
          picked = q.sell;
          source = "sell";
          break;
        }
      }
    }

    if (picked > 0 && source) {
      prices[ore] = picked;
      sources[ore] = source;
    } else {
      missing.push(ore);
    }
  }
  return { prices, sources, missing };
}

async function loadAll(oreQtys: OreQty[]): Promise<{
  ids: Map<string, number>;
  books: Map<number, BuyOrder[]>;
  quotes: Map<number, Quote>;
}> {
  const allNames = new Set<string>();
  for (const { ore } of oreQtys) {
    const base = baseOf(ore);
    [ore, compressed(ore), base, compressed(base)].forEach((n) =>
      allNames.add(n)
    );
  }
  const ids = await resolveTypeIds([...allNames]);
  const idList = [...new Set([...ids.values()])];
  const [books, quotes] = await Promise.all([
    loadBooks(idList),
    fetchFuzzwork(idList),
  ]);
  return { ids, books, quotes };
}

/** Prix effectif (quantité prise en compte) pour une forme. */
export async function fetchOrePrices(
  oreQtys: OreQty[],
  form: ValuationForm = "raw"
): Promise<PriceResult> {
  const unique = oreQtys.filter((o) => o.ore);
  if (unique.length === 0) return { prices: {}, sources: {}, missing: [] };
  const { ids, books, quotes } = await loadAll(unique);
  return applyChain(unique, form, ids, books, quotes);
}

/** Prix effectif pour les DEUX formes en une seule passe (bascule instantanée côté UI). */
export async function fetchOrePricesBoth(
  oreQtys: OreQty[]
): Promise<{ raw: PriceResult; compressed: PriceResult }> {
  const unique = oreQtys.filter((o) => o.ore);
  if (unique.length === 0) {
    const empty = { prices: {}, sources: {}, missing: [] };
    return { raw: empty, compressed: empty };
  }
  const { ids, books, quotes } = await loadAll(unique);
  return {
    raw: applyChain(unique, "raw", ids, books, quotes),
    compressed: applyChain(unique, "compressed", ids, books, quotes),
  };
}

/** Vide les caches marché (carnets + Fuzzwork) pour forcer un rafraîchissement. */
export function clearPriceCaches(): void {
  bookCache.clear();
  fuzzCache.clear();
}
