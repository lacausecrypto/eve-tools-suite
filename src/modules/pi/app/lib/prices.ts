/**
 * Prix **Jita** en direct via le **client ESI conforme** de la suite.
 *
 * - Résolution nom de marchandise → `type_id` par `POST /universe/ids/`
 *   (public, mis en cache mémoire + persistant, namespace `pi`).
 * - Meilleur prix au **Jita 4-4** (station 60003760) dans **The Forge**
 *   (région 10000002) via `/markets/{region}/orders/` (pagination gérée),
 *   avec repli région si aucun ordre à la station.
 *
 * Le client ESI de la suite pose le User-Agent et respecte le cache `expires`.
 */
import { esi, esiPost } from "@/core/esi/client";
import { kv } from "@/core/storage";
import { logger } from "@/core/log";

const FORGE_REGION = 10000002;
const JITA_44 = 60003760;
const MAX_PAGES = 10;

const log = logger("pi-prices");
const store = kv("pi");
const idCache = new Map<string, number>();

interface IdsResponse {
  inventory_types?: { id: number; name: string }[];
}
interface MarketOrder {
  price: number;
  location_id: number;
}

/** Résout des noms de marchandises en `type_id` (caché mémoire + persistant). */
export async function resolveTypeIds(
  names: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const missing: string[] = [];

  for (const name of names) {
    const mem = idCache.get(name);
    if (mem) {
      out.set(name, mem);
      continue;
    }
    const raw = await store.get(`tid:${name}`);
    const id = raw ? parseInt(raw, 10) : NaN;
    if (Number.isFinite(id)) {
      idCache.set(name, id);
      out.set(name, id);
    } else {
      missing.push(name);
    }
  }

  if (missing.length) {
    try {
      const res = await esiPost<IdsResponse>("/universe/ids/", missing);
      for (const it of res.inventory_types ?? []) {
        idCache.set(it.name, it.id);
        out.set(it.name, it.id);
        void store.set(`tid:${it.name}`, String(it.id)).catch(() => {});
      }
    } catch (e) {
      log.warn("resolveTypeIds failed", e);
    }
  }
  return out;
}

async function ordersAllPages(
  typeId: number,
  orderType: "sell" | "buy",
): Promise<MarketOrder[]> {
  const first = await esi<MarketOrder[]>({
    path: `/markets/${FORGE_REGION}/orders/`,
    query: { type_id: typeId, order_type: orderType, page: 1 },
  });
  let orders = first.data ?? [];
  const pages = Math.min(first.pages || 1, MAX_PAGES);
  for (let p = 2; p <= pages; p++) {
    const r = await esi<MarketOrder[]>({
      path: `/markets/${FORGE_REGION}/orders/`,
      query: { type_id: typeId, order_type: orderType, page: p },
    });
    orders = orders.concat(r.data ?? []);
  }
  return orders;
}

/** Meilleur prix (vente = min, achat = max) au Jita 4-4, repli région. */
async function bestPrice(
  typeId: number,
  orderType: "sell" | "buy",
): Promise<number | null> {
  const orders = await ordersAllPages(typeId, orderType);
  const atJita = orders.filter((o) => o.location_id === JITA_44);
  const pool = atJita.length ? atJita : orders;
  if (!pool.length) return null;
  const prices = pool.map((o) => o.price);
  return orderType === "sell" ? Math.min(...prices) : Math.max(...prices);
}

export interface JitaPrice {
  sell: number | null;
  buy: number | null;
}

/** Prix Jita (vente + achat) d'une marchandise par son nom. */
export async function jitaPrice(commodityName: string): Promise<JitaPrice> {
  const ids = await resolveTypeIds([commodityName]);
  const id = ids.get(commodityName);
  if (!id) return { sell: null, buy: null };
  const [sell, buy] = await Promise.all([
    bestPrice(id, "sell"),
    bestPrice(id, "buy"),
  ]);
  return { sell, buy };
}

/** Raccourci : prix de **vente** Jita d'une marchandise (ou `null`). */
export async function jitaSell(commodityName: string): Promise<number | null> {
  return (await jitaPrice(commodityName)).sell;
}
