/**
 * **Cotations de marché pour les widgets** — couche de cache au-dessus de l'API
 * ESI (`fetchMarket` + `computeStats`). Plusieurs widgets de dashboard peuvent
 * suivre les mêmes types : on mutualise les requêtes (dédup en vol + cache TTL)
 * et on **limite la concurrence** pour ne pas saturer le quota d'erreurs ESI sur
 * une grosse watchlist. 100 % ESI publique, aucun login.
 */
import { fetchMarket, fetchTypeInfo } from "../api";
import { computeStats } from "./compute";
import type { MarketStats } from "./types";
import type { ScopeId } from "./regions";

export const QUOTE_TTL = 5 * 60_000;

const statsCache = new Map<string, { ts: number; data: MarketStats }>();
const statsInflight = new Map<string, Promise<MarketStats>>();
const nameCache = new Map<number, string>();

// — Limiteur de concurrence (au plus N requêtes carnet simultanées) —
let active = 0;
const waiters: (() => void)[] = [];
async function withLimit<T>(fn: () => Promise<T>, max = 4): Promise<T> {
  if (active >= max) await new Promise<void>((r) => waiters.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

/** Âge (ms) de la cotation en cache pour un couple portée/type (∞ si absente). */
export function quoteAge(scope: ScopeId, typeId: number): number {
  const hit = statsCache.get(`${scope}:${typeId}`);
  return hit ? Date.now() - hit.ts : Number.POSITIVE_INFINITY;
}

/** Cotation (stats de tête) d'un type pour une portée, cachée TTL + dédupliquée. */
export async function getQuote(
  scope: ScopeId,
  typeId: number,
  force = false,
): Promise<MarketStats> {
  const key = `${scope}:${typeId}`;
  const hit = statsCache.get(key);
  if (!force && hit && Date.now() - hit.ts < QUOTE_TTL) return hit.data;

  const existing = statsInflight.get(key);
  if (existing) return existing;

  const p = withLimit(async () => {
    const orders = await fetchMarket(scope, typeId);
    const stats = computeStats(orders);
    statsCache.set(key, { ts: Date.now(), data: stats });
    statsInflight.delete(key);
    return stats;
  }).catch((e) => {
    statsInflight.delete(key);
    throw e;
  });
  statsInflight.set(key, p);
  return p;
}

/** Nom canonique d'un type (caché). Repli `#<id>` si la résolution échoue. */
export async function getTypeName(typeId: number): Promise<string> {
  const m = nameCache.get(typeId);
  if (m) return m;
  try {
    const info = await fetchTypeInfo(typeId);
    nameCache.set(typeId, info.name);
    return info.name;
  } catch {
    return `#${typeId}`;
  }
}
