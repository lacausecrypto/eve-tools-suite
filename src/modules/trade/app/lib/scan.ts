/** Logique pure d'analyse : classement station-trading & arbitrage. */
import { flipProfit } from "./fees";
import type { FeeConfig, StationAgg, StationDeal, ArbitrageDeal } from "./types";

/** Part réaliste du volume quotidien qu'un flipper peut capter. */
export const CAPTURE_SHARE = 0.2;

export interface StationParams {
  /** Capital disponible (ISK) — plafonne la quantité par opportunité. */
  budget: number;
  /** Marge nette minimale (%). */
  minMarginPct: number;
  /** Prix unitaire minimal (évite le bruit à 1 ISK). */
  minPrice: number;
  /** Prix unitaire maximal (0/null = pas de plafond). */
  maxPrice: number | null;
  /** Volume minimal sur le carnet (vente). */
  minSellVol: number;
}

export const DEFAULT_STATION_PARAMS: StationParams = {
  budget: 1_000_000_000,
  minMarginPct: 5,
  minPrice: 100_000,
  maxPrice: null,
  minSellVol: 1,
};

/**
 * Pré-classement des opportunités de station-trading depuis les agrégats du
 * carnet (avant enrichissement par l'historique). Trié par marge nette %.
 */
export function rankStation(
  aggs: StationAgg[],
  prices: Map<number, number>,
  fees: FeeConfig,
  p: StationParams,
  limit = 250,
): StationDeal[] {
  const out: StationDeal[] = [];
  for (const a of aggs) {
    if (a.bestBuy == null || a.bestSell == null) continue;
    if (a.bestSell < p.minPrice) continue;
    if (p.maxPrice && a.bestSell > p.maxPrice) continue;
    if (a.sellVol < p.minSellVol) continue;

    const flip = flipProfit(a.bestBuy, a.bestSell, fees);
    if (flip.netPerUnit <= 0) continue;
    if (flip.marginPct < p.minMarginPct) continue;
    if (flip.buyCost > p.budget) continue; // pas même une unité dans le budget

    out.push({
      typeId: a.typeId,
      name: `#${a.typeId}`,
      bestBuy: a.bestBuy,
      bestSell: a.bestSell,
      refPrice: prices.get(a.typeId) ?? null,
      sellers: a.sellers,
      buyers: a.buyers,
      sellVol: a.sellVol,
      buyVol: a.buyVol,
      netPerUnit: flip.netPerUnit,
      marginPct: flip.marginPct,
    });
  }
  // Pré-classement **pondéré par la liquidité** : profit unitaire net × débit du
  // carnet (min des volumes achat/vente). On évite ainsi de gaspiller les slots
  // d'enrichissement historique sur des objets à marge énorme mais illiquides.
  const score = (d: StationDeal) => d.netPerUnit * Math.min(d.sellVol, d.buyVol);
  out.sort((x, y) => score(y) - score(x));
  return out.slice(0, limit);
}

/**
 * Finalise un deal avec son volume quotidien (historique) : quantité réaliste
 * captable / jour, ISK échangés / jour, profit net attendu / jour.
 */
export function finalizeStation(
  deal: StationDeal,
  dailyVolume: number,
  fees: FeeConfig,
  p: StationParams,
): StationDeal {
  const broker = fees.brokerFeePct / 100;
  const buyCost = deal.bestBuy * (1 + broker);
  const maxByBudget = buyCost > 0 ? Math.floor(p.budget / buyCost) : 0;
  const perDayQty = Math.max(
    0,
    Math.min(Math.floor(CAPTURE_SHARE * dailyVolume), maxByBudget),
  );
  const dailyIskVolume = dailyVolume * (deal.refPrice ?? deal.bestSell);
  return {
    ...deal,
    dailyVolume,
    dailyIskVolume,
    perDayQty,
    expectedDailyProfit: perDayQty * deal.netPerUnit,
  };
}

/** Re-tri par profit net attendu / jour (après enrichissement historique). */
export function sortByExpectedProfit(deals: StationDeal[]): StationDeal[] {
  return [...deals].sort(
    (a, b) => (b.expectedDailyProfit ?? -1) - (a.expectedDailyProfit ?? -1),
  );
}

/** Tri des opportunités d'arbitrage. */
export type ArbitrageSort = "total" | "perM3" | "roi";

export function sortArbitrage(deals: ArbitrageDeal[], by: ArbitrageSort): ArbitrageDeal[] {
  const key = (d: ArbitrageDeal) =>
    by === "total" ? d.totalNet : by === "perM3" ? d.netPerM3 : d.roiPct;
  return [...deals].sort((a, b) => key(b) - key(a));
}
