/**
 * Adaptateur marché de l'Industry Tracker — s'appuie sur le **service de prix
 * core partagé** (`@/core/pricing`). Deux chemins :
 *  - `buildRecipePriceMap` : carnet réel + **VWAP** pondéré par la quantité du
 *    job (matériaux achetés en mangeant le carnet de vente ; produit vendu en
 *    mangeant le carnet d'achat). Précis pour les gros volumes.
 *  - `buildPriceMap` : cotations agrégées Fuzzwork (meilleur achat/vente), pour
 *    valoriser un inventaire de **beaucoup** de types sans VWAP.
 */
import {
  bestPrice,
  clearPricingCaches,
  effectivePrice,
  loadAdjustedPrices,
  loadJitaBooks,
  loadJitaQuotes,
  resolveTypeIds as coreResolveTypeIds,
} from "@/core/pricing";
import {
  effectiveMe,
  requiredQuantity,
  type Price,
  type PriceMap,
  type Recipe,
} from "./industry";

/** Résout des noms exacts en `{ id, name }` (délégué au service core). */
export const resolveTypeIds = coreResolveTypeIds;

/** Vide les caches marché (délégué au service core). */
export const clearMarketCaches = clearPricingCaches;

/**
 * `PriceMap` **quantité-consciente** d'une recette :
 *  - matériau : `buy` = meilleur ordre d'achat (ordre que tu poses) ; `sell` =
 *    VWAP pour acheter la quantité requise en mangeant le carnet de vente.
 *  - produit : `sell` = meilleur ordre de vente (ordre que tu poses) ; `buy` =
 *    VWAP pour vendre la production en mangeant le carnet d'achat.
 */
export async function buildRecipePriceMap(recipe: Recipe): Promise<PriceMap> {
  const me = effectiveMe(recipe);
  const ids = [
    recipe.outputTypeId,
    ...recipe.materials.map((m) => m.typeId),
  ].filter((id) => id > 0);
  const [adjusted, books] = await Promise.all([
    loadAdjustedPrices(),
    loadJitaBooks(ids),
  ]);

  const map: PriceMap = {};

  for (const m of recipe.materials) {
    if (m.typeId <= 0) continue;
    const book = books.get(m.typeId);
    const adj = adjusted.get(m.typeId) ?? 0;
    const hasData = (book && (book.buy.length > 0 || book.sell.length > 0)) || adj > 0;
    if (!hasData) continue;
    const qty = requiredQuantity(m.baseQty, recipe.runs, me, recipe.facilityMaterialBonus);
    map[m.typeId] = {
      buy: book ? bestPrice(book.buy) : 0,
      sell: book ? effectivePrice(book.sell, qty) : 0,
      adjusted: adj,
    } as Price;
  }

  if (recipe.outputTypeId > 0) {
    const book = books.get(recipe.outputTypeId);
    const adj = adjusted.get(recipe.outputTypeId) ?? 0;
    const hasData = (book && (book.buy.length > 0 || book.sell.length > 0)) || adj > 0;
    if (hasData) {
      const units = Math.max(0, recipe.outputPerRun * recipe.runs);
      map[recipe.outputTypeId] = {
        buy: book ? effectivePrice(book.buy, units) : 0,
        sell: book ? bestPrice(book.sell) : 0,
        adjusted: adj,
      } as Price;
    }
  }

  return map;
}

/**
 * `PriceMap` simple (meilleur achat/vente Fuzzwork + prix ajusté) pour un
 * ensemble de types — chemin « valorisation d'inventaire » (beaucoup de types).
 */
export async function buildPriceMap(typeIds: number[]): Promise<PriceMap> {
  const ids = [...new Set(typeIds.filter((n) => Number.isFinite(n) && n > 0))];
  const [adjusted, quotes] = await Promise.all([
    loadAdjustedPrices(),
    loadJitaQuotes(ids),
  ]);
  const map: PriceMap = {};
  for (const id of ids) {
    const q = quotes.get(id);
    const adj = adjusted.get(id) ?? 0;
    if (q || adj > 0) {
      map[id] = { buy: q?.buy ?? 0, sell: q?.sell ?? 0, adjusted: adj } as Price;
    }
  }
  return map;
}
