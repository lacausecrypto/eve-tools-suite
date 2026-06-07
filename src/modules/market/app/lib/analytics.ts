/** Analytique pure du Market Browser : moyennes mobiles, plages, profondeur. */
import type { HistoryDay, MarketOrder } from "./types";

export type Range = "1m" | "3m" | "1y" | "all";

export const RANGE_DAYS: Record<Range, number> = {
  "1m": 30,
  "3m": 90,
  "1y": 365,
  all: Number.POSITIVE_INFINITY,
};

/**
 * Moyenne mobile simple sur `window` jours. Renvoie un tableau aligné sur
 * `values` (les `window-1` premiers éléments valent `null`).
 */
export function sma(values: number[], window: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

/** Volume quotidien moyen sur les `window` derniers jours. */
export function avgDailyVolume(days: HistoryDay[], window = 30): number {
  const recent = days.slice(-window);
  if (!recent.length) return 0;
  return recent.reduce((s, d) => s + d.volume, 0) / recent.length;
}

/** Jours d'écoulement = stock sur le carnet / volume quotidien moyen. */
export function daysToClear(sellVolumeOnBook: number, avgDaily: number): number | null {
  if (avgDaily <= 0) return null;
  return sellVolumeOnBook / avgDaily;
}

export interface DepthPoint {
  price: number;
  cum: number;
}

/**
 * Courbe de profondeur cumulée pour un côté du carnet.
 * - `sell` : trié par prix croissant (depuis le meilleur ask vers le haut) ;
 * - `buy`  : trié par prix décroissant (depuis le meilleur bid vers le bas).
 * `cum` est le volume cumulé **après** ce niveau de prix (staircase).
 */
export function cumulativeDepth(orders: MarketOrder[], side: "sell" | "buy"): DepthPoint[] {
  const sorted = [...orders].sort((a, b) =>
    side === "sell" ? a.price - b.price : b.price - a.price,
  );
  const out: DepthPoint[] = [];
  let cum = 0;
  for (const o of sorted) {
    cum += o.volumeRemain;
    out.push({ price: o.price, cum });
  }
  return out;
}

export interface DepthModel {
  buy: DepthPoint[];
  sell: DepthPoint[];
  bestBuy: number | null;
  bestSell: number | null;
  /** Domaine de prix affiché (resserré autour du spread, queues écartées). */
  domainMin: number;
  domainMax: number;
  /** Volume cumulé max dans le domaine (échelle Y). */
  maxCum: number;
}

/**
 * Construit le modèle de profondeur, en resserrant le domaine de prix à une
 * **bande autour de la médiane** des prix d'ordres. Robuste aux ordres « queue »
 * extrêmes (achat à 0.01 ISK, vente à 1000× le marché) qui écrasaient l'échelle :
 * les points hors-domaine sont **retirés du tracé** (et du calcul d'échelle Y).
 */
export function buildDepth(
  sells: MarketOrder[],
  buys: MarketOrder[],
  band = 0.6,
): DepthModel | null {
  const sell = cumulativeDepth(sells, "sell");
  const buy = cumulativeDepth(buys, "buy");
  if (!sell.length && !buy.length) return null;

  const bestSell = sell.length ? sell[0].price : null;
  const bestBuy = buy.length ? buy[0].price : null;

  // Centre robuste = **médiane** des prix d'ordres : insensible à une poignée
  // d'ordres extrêmes (quel que soit leur volume), contrairement au meilleur
  // bid/ask ou à une couverture par volume cumulé (qu'un seul gros ordre lointain
  // suffisait à fausser).
  const prices = [...sells, ...buys]
    .map((o) => o.price)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  const center = prices.length
    ? prices[Math.floor(prices.length / 2)]
    : (bestSell ?? bestBuy ?? 1);

  let domainMin = center * (1 - band);
  let domainMax = center * (1 + band);
  if (!(domainMin < domainMax)) {
    domainMin = center * 0.99;
    domainMax = center * 1.01 || 1;
  }

  // On **retire** les points hors-cadre du tracé (sinon leur palier se dessine
  // écrasé sur les bords — le pic parasite observé). Le `cum` conservé reste la
  // vraie profondeur cumulée jusqu'à ce prix.
  const inDomain = (pts: DepthPoint[]) =>
    pts.filter((p) => p.price >= domainMin && p.price <= domainMax);
  const buyClip = inDomain(buy);
  const sellClip = inDomain(sell);

  const maxCum = Math.max(
    buyClip.reduce((m, p) => Math.max(m, p.cum), 0),
    sellClip.reduce((m, p) => Math.max(m, p.cum), 0),
    1,
  );

  return { buy: buyClip, sell: sellClip, bestBuy, bestSell, domainMin, domainMax, maxCum };
}
