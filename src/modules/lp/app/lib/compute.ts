/**
 * Calcul **ISK / point de loyauté** — **pur** (testable au Node).
 *
 * Pour chaque offre du LP store : on **vend** l'item reçu (prix Jita, moins les
 * frais de vente) et on **achète** les éventuels items requis (prix de vente
 * Jita), on retranche le coût ISK de l'offre, et on divise le profit par le
 * coût en LP.
 */

/** Cotation d'un type (prix unitaires + volume d'ordres pour la liquidité). */
export interface Quote {
  buy: number;
  sell: number;
  /** Volume total des ordres de vente (proxy de liquidité). */
  sellVolume: number;
}

export interface RawOffer {
  offerId: number;
  typeId: number;
  quantity: number;
  lpCost: number;
  iskCost: number;
  requiredItems: { typeId: number; quantity: number }[];
}

/** Comment on valorise l'item reçu : vente patiente (sell) ou dump (buy). */
export type OutBasis = "sell" | "buy";

export interface RequiredLine {
  typeId: number;
  name: string;
  qty: number;
  unit: number;
  total: number;
}

export interface PricedOffer {
  offerId: number;
  typeId: number;
  name: string;
  quantity: number;
  lpCost: number;
  iskCost: number;
  required: RequiredLine[];
  /** Prix unitaire de revente retenu (selon la base). */
  outUnit: number;
  /** Revenu net de la vente (après frais). */
  revenue: number;
  /** Coût total : ISK de l'offre + items requis. */
  cost: number;
  profit: number;
  /** ISK par LP (0 si offre sans coût LP). */
  iskPerLp: number;
  /** Liquidité de l'item reçu (volume d'ordres de vente). */
  sellVolume: number;
}

export interface FeeConfig {
  /** Taxe de vente (%) appliquée au revenu. */
  salesTaxPct: number;
  /** Frais de courtage (%) appliqué au revenu. */
  brokerPct: number;
}

const q = (m: Map<number, Quote>, id: number): Quote => m.get(id) ?? { buy: 0, sell: 0, sellVolume: 0 };

/** Valorise une offre. `names` mappe les type_id en noms. */
export function priceOffer(
  offer: RawOffer,
  quotes: Map<number, Quote>,
  names: Map<number, string>,
  outBasis: OutBasis,
  fees: FeeConfig,
): PricedOffer {
  const out = q(quotes, offer.typeId);
  const outUnit = outBasis === "buy" ? out.buy : out.sell;
  const feeFactor = 1 - (fees.salesTaxPct + fees.brokerPct) / 100;
  const revenue = offer.quantity * outUnit * feeFactor;

  const required: RequiredLine[] = offer.requiredItems.map((r) => {
    const unit = q(quotes, r.typeId).sell; // on achète les items requis au prix de vente
    return { typeId: r.typeId, name: names.get(r.typeId) ?? `#${r.typeId}`, qty: r.quantity, unit, total: r.quantity * unit };
  });
  const requiredCost = required.reduce((s, r) => s + r.total, 0);
  const cost = offer.iskCost + requiredCost;
  const profit = revenue - cost;

  return {
    offerId: offer.offerId,
    typeId: offer.typeId,
    name: names.get(offer.typeId) ?? `#${offer.typeId}`,
    quantity: offer.quantity,
    lpCost: offer.lpCost,
    iskCost: offer.iskCost,
    required,
    outUnit,
    revenue,
    cost,
    profit,
    iskPerLp: offer.lpCost > 0 ? profit / offer.lpCost : 0,
    sellVolume: out.sellVolume,
  };
}

/** Valorise et trie toutes les offres par ISK/LP décroissant. */
export function priceOffers(
  offers: RawOffer[],
  quotes: Map<number, Quote>,
  names: Map<number, string>,
  outBasis: OutBasis,
  fees: FeeConfig,
): PricedOffer[] {
  return offers
    .map((o) => priceOffer(o, quotes, names, outBasis, fees))
    .sort((a, b) => b.iskPerLp - a.iskPerLp);
}

/** Combien d'unités d'une offre pour dépenser `lp` LP, et le profit total. */
export function convertWithLp(offer: PricedOffer, lp: number): { runs: number; profit: number; lpUsed: number } {
  if (offer.lpCost <= 0 || offer.profit <= 0) return { runs: 0, profit: 0, lpUsed: 0 };
  const runs = Math.floor(lp / offer.lpCost);
  return { runs, profit: runs * offer.profit, lpUsed: runs * offer.lpCost };
}
