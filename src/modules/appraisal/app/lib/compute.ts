/** Calculs d'appraisal — **purs** (testables au Node). */

export type Basis = "buy" | "sell" | "split";

/** Item résolu, indépendant du hub (volume, EIV). */
export interface ResolvedItem {
  typeId: number;
  name: string;
  qty: number;
  eiv: number;
  volume: number;
}

/** Cotation (prix unitaires) d'un type sur un hub. */
export interface Quote {
  buy: number;
  sell: number;
}

/** Une ligne valorisée (prix **unitaires**) pour un hub donné. */
export interface PricedLine extends ResolvedItem {
  buy: number;
  sell: number;
}

/** Construit les lignes valorisées d'un hub. */
export function pricedLines(items: ResolvedItem[], quotes: Record<number, Quote>): PricedLine[] {
  return items.map((it) => ({ ...it, buy: quotes[it.typeId]?.buy ?? 0, sell: quotes[it.typeId]?.sell ?? 0 }));
}

/** Totaux achat/vente d'un hub (sans construire les lignes). */
export function hubTotals(items: ResolvedItem[], quotes: Record<number, Quote>): { buy: number; sell: number } {
  let buy = 0;
  let sell = 0;
  for (const it of items) {
    buy += it.qty * (quotes[it.typeId]?.buy ?? 0);
    sell += it.qty * (quotes[it.typeId]?.sell ?? 0);
  }
  return { buy, sell };
}

export interface Totals {
  buy: number;
  sell: number;
  split: number;
  eiv: number;
  volume: number;
  /** Nombre d'unités cumulées. */
  units: number;
  /** Nombre de lignes (types distincts). */
  lines: number;
}

const sum = (lines: PricedLine[], f: (l: PricedLine) => number) => lines.reduce((s, l) => s + f(l), 0);

export function computeTotals(lines: PricedLine[]): Totals {
  const buy = sum(lines, (l) => l.qty * l.buy);
  const sell = sum(lines, (l) => l.qty * l.sell);
  return {
    buy,
    sell,
    split: (buy + sell) / 2,
    eiv: sum(lines, (l) => l.qty * l.eiv),
    volume: sum(lines, (l) => l.qty * l.volume),
    units: sum(lines, (l) => l.qty),
    lines: lines.length,
  };
}

/** Prix unitaire d'une ligne selon la base choisie. */
export function unitPrice(l: PricedLine, basis: Basis): number {
  if (basis === "buy") return l.buy;
  if (basis === "sell") return l.sell;
  return (l.buy + l.sell) / 2;
}

/** Valeur totale d'une ligne selon la base (pour le tri). */
export function lineValue(l: PricedLine, basis: Basis): number {
  return l.qty * unitPrice(l, basis);
}

/**
 * Résumé texte copiable (pour partage hors-app). **Pur** : les en-têtes
 * localisés sont fournis par l'appelant (déjà traduits via `t(...)`).
 */
export function summaryText(
  lines: PricedLine[],
  labels: { header: string; totals: string },
): string {
  const rows = lines
    .slice()
    .sort((a, b) => lineValue(b, "split") - lineValue(a, "split"))
    .map((l) => `${l.name}\t${l.qty}\t${Math.round(l.qty * (l.buy + l.sell) / 2)}`);
  return [labels.header, labels.totals, "", ...rows].join("\n");
}
