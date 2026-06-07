/** Types du module Market Browser. */

/** Ordre de marché ESI normalisé (+ champs enrichis après résolution univers). */
export interface MarketOrder {
  orderId: number;
  typeId: number;
  isBuy: boolean;
  price: number;
  volumeRemain: number;
  volumeTotal: number;
  minVolume: number;
  /** Portée d'un ordre d'achat ("station", "region", "solarsystem", "1".."40"). */
  range: string;
  locationId: number;
  systemId: number;
  /** Région d'où provient l'ordre (connue au moment de la requête). */
  regionId: number;
  /** Horodatage ISO d'émission (= « dernière modification » côté ESI). */
  issued: string;
  /** Durée de l'ordre en jours (issued + duration = expiration). */
  duration: number;

  // — Champs enrichis (résolus via le service univers) —
  regionName?: string;
  systemName?: string;
  security?: number;
  locationName?: string;
  isStructure?: boolean;
}

/** Détails d'un type d'objet (vaisseau, module, minerai…). */
export interface TypeInfo {
  typeId: number;
  name: string;
  description?: string;
  groupId?: number;
  volume?: number;
}

/** Un point d'historique journalier (ESI `/markets/{region}/history/`). */
export interface HistoryDay {
  date: string;
  average: number;
  highest: number;
  lowest: number;
  volume: number;
  orderCount: number;
}

/** Statistiques de tête (moyennes 5 %, volumes, marge). */
export interface MarketStats {
  avgSell: number | null;
  avgBuy: number | null;
  bestSell: number | null;
  bestBuy: number | null;
  sellVolume: number;
  buyVolume: number;
  margin: number | null;
  marginPct: number | null;
}

/** Filtres appliqués côté client sur le carnet d'ordres. */
export interface OrderFilters {
  priceMin: number | null;
  priceMax: number | null;
  qtyMin: number | null;
  qtyMax: number | null;
  /** Inclure le high-sec (≥ 0.5). */
  high: boolean;
  /** Inclure le low-sec (0.1–0.4). */
  low: boolean;
  /** Inclure le null-sec (≤ 0.0). */
  null: boolean;
  /** Filtre regex sur le nom de localisation (station/structure). */
  locationRegex: string;
  /** Exclure les structures joueur (garder uniquement les stations PNJ). */
  npcOnly: boolean;
}

export const DEFAULT_FILTERS: OrderFilters = {
  priceMin: null,
  priceMax: null,
  qtyMin: null,
  qtyMax: null,
  high: true,
  low: true,
  null: true,
  locationRegex: "",
  npcOnly: false,
};
