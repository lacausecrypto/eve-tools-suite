/**
 * Moteur de **profit net** — frais de courtier + taxe de vente, dérivables des
 * skills. Tout est paramétrable (les valeurs de base EVE évoluent ; on expose un
 * % effectif éditable, plus un calcul d'aide depuis les skills).
 */
import type { FeeConfig, SellStrategy } from "./types";

/** Valeurs de base EVE (éditables côté UI via le % effectif). */
const BROKER_BASE = 3.0; // % de base au placement d'ordre (station PNJ)
const BROKER_PER_LEVEL = 0.3; // réduction par niveau de Broker Relations (points de %)
const BROKER_MIN = 1.0; // plancher pratique
const TAX_BASE = 7.5; // % de base de la taxe de vente
const TAX_PER_LEVEL = 0.11; // réduction multiplicative par niveau d'Accounting

/** Frais de courtier effectif (%) depuis Broker Relations. */
export function brokerFromSkill(level: number): number {
  return Math.max(BROKER_MIN, BROKER_BASE - BROKER_PER_LEVEL * level);
}

/** Taxe de vente effective (%) depuis Accounting. */
export function taxFromSkill(level: number): number {
  return TAX_BASE * (1 - TAX_PER_LEVEL * level);
}

/** Recalcule les % effectifs depuis les niveaux de skill. */
export function recomputeFees(f: FeeConfig): FeeConfig {
  return {
    ...f,
    brokerFeePct: round2(brokerFromSkill(f.brokerRelations)),
    salesTaxPct: round2(taxFromSkill(f.accounting)),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface FlipResult {
  buyCost: number; // coût total d'acquisition / unité (achat + courtier)
  sellRevenue: number; // produit net de revente / unité (− courtier − taxe)
  netPerUnit: number;
  marginPct: number; // net / coût investi
}

/**
 * **Station trading** : on place un ordre d'**achat** à `buy`, puis un ordre de
 * **vente** à `sell`. Courtier payé aux deux placements ; taxe à la vente.
 */
export function flipProfit(buy: number, sell: number, f: FeeConfig): FlipResult {
  const broker = f.brokerFeePct / 100;
  const tax = f.salesTaxPct / 100;
  const buyCost = buy * (1 + broker);
  const sellRevenue = sell * (1 - broker - tax);
  const netPerUnit = sellRevenue - buyCost;
  const marginPct = buyCost > 0 ? (netPerUnit / buyCost) * 100 : 0;
  return { buyCost, sellRevenue, netPerUnit, marginPct };
}

/**
 * **Arbitrage** : acheter au hub source en consommant les ordres de vente
 * (`srcSell`, marché immédiat — pas de courtier), revendre au hub dest selon la
 * stratégie :
 *  - `buyOrders` : vendre **aux ordres d'achat** (`dstBuy`), immédiat, taxe seule ;
 *  - `relist`    : **reposter un ordre de vente** au `dstSell` (courtier + taxe).
 */
export function arbitrageProfit(
  srcSell: number,
  dstBuy: number | null,
  dstSell: number | null,
  strategy: SellStrategy,
  f: FeeConfig,
): { netPerUnit: number; roiPct: number } {
  const broker = f.brokerFeePct / 100;
  const tax = f.salesTaxPct / 100;
  let revenue = 0;
  if (strategy === "buyOrders") {
    revenue = (dstBuy ?? 0) * (1 - tax);
  } else {
    revenue = (dstSell ?? 0) * (1 - broker - tax);
  }
  const cost = srcSell;
  const netPerUnit = revenue - cost;
  const roiPct = cost > 0 ? (netPerUnit / cost) * 100 : 0;
  return { netPerUnit, roiPct };
}
