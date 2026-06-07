/** Types du module Trade Co-Pilot (scanner d'opportunités + profit net). */

/** Paramètres de frais — base du moteur de profit net. */
export interface FeeConfig {
  /** Frais de courtier **effectif** en % (placement d'ordre). */
  brokerFeePct: number;
  /** Taxe de vente **effective** en % (à la vente). */
  salesTaxPct: number;
  // Aides au calcul depuis les skills (informatif / recalcul) :
  accounting: number; // 0–5 (réduit la taxe de vente)
  brokerRelations: number; // 0–5 (réduit le courtier)
}

export const DEFAULT_FEES: FeeConfig = {
  brokerFeePct: 3.0,
  salesTaxPct: 7.5,
  accounting: 0,
  brokerRelations: 0,
};

/** Agrégat par type d'objet, à **une station** (issu du balayage région-wide). */
export interface StationAgg {
  typeId: number;
  bestBuy: number | null; // meilleur ordre d'achat (max)
  bestSell: number | null; // meilleur ordre de vente (min)
  buyVol: number; // volume d'achat sur le carnet
  sellVol: number; // volume de vente sur le carnet
  buyers: number; // nb d'ordres d'achat
  sellers: number; // nb d'ordres de vente
}

/** Opportunité de station-trading (flip ordre d'achat → ordre de vente). */
export interface StationDeal {
  typeId: number;
  name: string;
  bestBuy: number;
  bestSell: number;
  refPrice: number | null; // /markets/prices average (référence)
  sellers: number;
  buyers: number;
  sellVol: number;
  buyVol: number;
  netPerUnit: number; // profit net / unité après frais
  marginPct: number; // marge nette en %
  // Enrichi par l'historique (top candidats) :
  dailyVolume?: number; // volume moyen / jour
  dailyIskVolume?: number; // ISK échangés / jour
  perDayQty?: number; // quantité réaliste capturable / jour
  expectedDailyProfit?: number; // profit net attendu / jour
}

/** Stratégie de revente pour l'arbitrage. */
export type SellStrategy = "buyOrders" | "relist";

/** Opportunité d'arbitrage inter-hubs (acheter au hub A, vendre au hub B). */
export interface ArbitrageDeal {
  typeId: number;
  name: string;
  srcSell: number; // meilleur prix d'achat (sell min au hub source)
  dstBuy: number | null; // meilleur achat au hub dest (revente immédiate)
  dstSell: number | null; // sell min au hub dest (référence relist)
  /** Prix d'acquisition **moyen effectif** (profondeur consommée). */
  effSrc: number;
  /** Prix de revente **moyen effectif net** (profondeur / liste). */
  effDst: number;
  packagedVolume: number; // m³ / unité (packaged)
  refPrice: number | null;
  netPerUnit: number; // profit net / unité (selon stratégie)
  netPerM3: number; // profit net / m³
  roiPct: number; // retour sur capital investi
  feasibleQty: number; // unités réalisables (profondeur & budget)
  totalNet: number; // profit net total réalisable
  srcSellVol: number;
  dstBuyVol: number;
}

/** Métadonnées d'un hub commercial. */
export interface Hub {
  id: string;
  label: string; // ex. "Jita"
  region: number;
  station: number;
  /** Résolu à l'exécution (station → système) pour le calcul des sauts. */
  systemId?: number;
}
