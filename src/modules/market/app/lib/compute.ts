/** Agrégats de marché : moyennes pondérées 5 %, volumes, marge, filtrage. */
import type { MarketOrder, MarketStats, OrderFilters } from "./types";

/**
 * Moyenne de prix **pondérée par le volume** sur les 5 % de meilleur volume.
 * Vente : on part des moins chers (ce qu'on consommerait en achetant) ; achat :
 * on part des plus chers (ce qu'on toucherait en vendant). Reproduit la colonne
 * « Average Sell/Buy (5%) » d'eve-tycoon.
 */
export function weightedTopPercent(
  orders: MarketOrder[],
  side: "sell" | "buy",
  pct = 0.05,
): number | null {
  if (!orders.length) return null;
  const sorted = [...orders].sort((a, b) =>
    side === "sell" ? a.price - b.price : b.price - a.price,
  );
  const totalVol = sorted.reduce((s, o) => s + o.volumeRemain, 0);
  if (totalVol <= 0) return null;
  const target = totalVol * pct;

  let taken = 0;
  let weighted = 0;
  for (const o of sorted) {
    const take = Math.min(o.volumeRemain, target - taken);
    if (take <= 0) break;
    weighted += o.price * take;
    taken += take;
    if (taken >= target) break;
  }
  // Si le 5 % est trop fin pour atteindre un ordre, on prend le meilleur ordre.
  if (taken <= 0) return sorted[0].price;
  return weighted / taken;
}

/** Statistiques de tête à partir d'un carnet d'ordres (déjà filtré par scope). */
export function computeStats(orders: MarketOrder[]): MarketStats {
  const sells = orders.filter((o) => !o.isBuy);
  const allBuys = orders.filter((o) => o.isBuy);

  const avgSell = weightedTopPercent(sells, "sell");
  const bestSell = sells.length ? Math.min(...sells.map((o) => o.price)) : null;

  // Achats « sains » pour les agrégats : on écarte les ordres d'achat aberrants
  // au-dessus de la meilleure vente (scams / arbitrage inter-régions) qui
  // rendraient la marge et le spread faussement négatifs. Les tables, elles,
  // affichent toujours **tous** les ordres bruts.
  const saneBuys =
    bestSell != null ? allBuys.filter((o) => o.price <= bestSell) : allBuys;
  const buys = saneBuys.length ? saneBuys : allBuys;

  const avgBuy = weightedTopPercent(buys, "buy");
  const bestBuy = buys.length ? Math.max(...buys.map((o) => o.price)) : null;
  const sellVolume = sells.reduce((s, o) => s + o.volumeRemain, 0);
  const buyVolume = allBuys.reduce((s, o) => s + o.volumeRemain, 0);

  const margin = avgSell != null && avgBuy != null ? avgSell - avgBuy : null;
  const marginPct = margin != null && avgBuy ? (margin / avgBuy) * 100 : null;

  return {
    avgSell,
    avgBuy,
    bestSell,
    bestBuy,
    sellVolume,
    buyVolume,
    margin,
    marginPct,
  };
}

/** Applique les filtres utilisateur à un ordre. */
export function passesFilters(o: MarketOrder, f: OrderFilters): boolean {
  if (f.priceMin != null && o.price < f.priceMin) return false;
  if (f.priceMax != null && o.price > f.priceMax) return false;
  if (f.qtyMin != null && o.volumeRemain < f.qtyMin) return false;
  if (f.qtyMax != null && o.volumeRemain > f.qtyMax) return false;

  const sec = o.security ?? 0;
  const isHigh = sec >= 0.45;
  const isLow = sec >= 0.05 && sec < 0.45;
  const isNull = sec < 0.05;
  if (isHigh && !f.high) return false;
  if (isLow && !f.low) return false;
  if (isNull && !f.null) return false;

  if (f.npcOnly && o.isStructure) return false;

  if (f.locationRegex.trim()) {
    try {
      const re = new RegExp(f.locationRegex, "i");
      if (!re.test(o.locationName ?? "")) return false;
    } catch {
      // Regex invalide : on n'exclut rien (l'UI peut signaler l'erreur).
    }
  }
  return true;
}

/** Filtre un carnet entier. */
export function filterOrders(orders: MarketOrder[], f: OrderFilters): MarketOrder[] {
  return orders.filter((o) => passesFilters(o, f));
}
