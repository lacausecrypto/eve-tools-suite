/**
 * Profondeur de carnet — calculs **réalistes** d'arbitrage qui parcourent les
 * piles d'ordres (ladders) au lieu de prendre « meilleur prix × quantité ».
 *
 * On apparie les ordres de **vente source** (les moins chers, ce qu'on achète)
 * aux ordres d'**achat destination** (les plus chers, ce qu'on encaisse) tant que
 * c'est **profitable**, et borné par le **budget** : on obtient la quantité
 * optimale réelle, le coût et le produit nets effectifs.
 */

/** Un niveau de carnet (prix + volume restant). */
export interface Level {
  price: number;
  vol: number;
}

export interface MatchResult {
  qty: number; // unités réellement échangées
  cost: number; // coût d'acquisition total (sans courtier ; achat au marché)
  revenue: number; // produit de revente total (déjà net de taxe / frais)
}

const EMPTY: MatchResult = { qty: 0, cost: 0, revenue: 0 };

/** Copie défensive d'un ladder (les fonctions consomment les volumes). */
const clone = (levels: Level[]): Level[] => levels.map((l) => ({ ...l }));

/**
 * Stratégie « vendre aux ordres d'achat » : on achète les ventes source les moins
 * chères et on les revend aux achats destination les plus chers, **unité par
 * unité tant que la marge est positive** (taxe incluse) et que le budget suit.
 */
export function matchToBuyOrders(
  srcSells: Level[],
  dstBuys: Level[],
  taxFrac: number,
  budget: number,
): MatchResult {
  if (!srcSells.length || !dstBuys.length) return EMPTY;
  const sells = clone(srcSells); // prix croissant
  const buys = clone(dstBuys); // prix décroissant
  let i = 0;
  let j = 0;
  let qty = 0;
  let cost = 0;
  let revenue = 0;

  while (i < sells.length && j < buys.length) {
    const sp = sells[i].price;
    const unitNet = buys[j].price * (1 - taxFrac); // produit net par unité revendue
    if (unitNet - sp <= 0) break; // plus rentable

    let take = Math.min(sells[i].vol, buys[j].vol);
    const remainingBudget = budget - cost;
    if (sp * take > remainingBudget) take = Math.floor(remainingBudget / sp);
    if (take <= 0) break;

    qty += take;
    cost += sp * take;
    revenue += unitNet * take;
    sells[i].vol -= take;
    buys[j].vol -= take;
    if (sells[i].vol <= 0) i++;
    if (buys[j].vol <= 0) j++;
  }
  return { qty, cost, revenue };
}

/**
 * Stratégie « reposter un ordre de vente » : on achète les ventes source les
 * moins chères tant qu'elles restent sous le **prix de revente net** visé au hub
 * destination (courtier + taxe déjà déduits), borné par le budget.
 */
export function matchRelist(
  srcSells: Level[],
  listNetUnit: number,
  budget: number,
): MatchResult {
  if (!srcSells.length || listNetUnit <= 0) return EMPTY;
  const sells = clone(srcSells);
  let qty = 0;
  let cost = 0;

  for (let i = 0; i < sells.length; i++) {
    const sp = sells[i].price;
    if (listNetUnit - sp <= 0) break; // plus rentable
    let take = sells[i].vol;
    const remainingBudget = budget - cost;
    if (sp * take > remainingBudget) take = Math.floor(remainingBudget / sp);
    if (take <= 0) break;
    qty += take;
    cost += sp * take;
  }
  return { qty, cost, revenue: qty * listNetUnit };
}
