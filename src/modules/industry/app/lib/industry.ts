/**
 * Cœur de calcul de l'Industry & Asset Cost Tracker — **pur, sans dépendance**
 * (donc unitairement vérifiable hors React/réseau).
 *
 * Implémente les formules d'industrie d'EVE Online telles que documentées par
 * CCP / EVE University :
 *  - **Material Efficiency (ME)** : quantité requise par job, avec bonus de
 *    structure/rigs et arrondi EVE (round 2 décimales puis ceil, plancher = runs).
 *  - **EIV** (Estimated Item Value) : Σ quantités *de base* × `adjusted_price`
 *    (prix de référence global d'ESI `/markets/prices/`), indépendant du ME.
 *  - **Coût d'installation** : EIV × (index de coût système + taxe structure +
 *    surtaxe SCC). La surtaxe SCC est un forfait CCP (1,5 % à ce jour).
 *  - **Profit** : revenu de vente net (taxes/courtage) − coût total.
 *
 * Réf. : wiki.eveuniversity.org/Manufacturing & /Blueprint (formule matériaux et
 * coût d'install). Les valeurs marché sont injectées (cf. `market.ts`).
 */

/** Surtaxe « SCC » forfaitaire appliquée par CCP au coût d'install (1,5 %). */
export const DEFAULT_SCC_SURCHARGE = 0.015;

/** Un matériau d'entrée, quantité **de base** (ME 0) pour **un seul run**. */
export interface Material {
  typeId: number;
  name: string;
  baseQty: number;
}

/**
 * Type d'activité industrielle. Différence clé : les **réactions** n'ont pas de
 * Material Efficiency (le ME est ignoré) ni de Time Efficiency de blueprint.
 */
export type ActivityType = "manufacturing" | "reaction";

/** Recette de fabrication (ou réaction). */
export interface Recipe {
  outputTypeId: number;
  outputName: string;
  /** Unités produites par run (ex. 1 vaisseau, 100 munitions). */
  outputPerRun: number;
  runs: number;
  /** Material Efficiency du blueprint, 0–10 (%). Ignoré pour les réactions. */
  me: number;
  /**
   * Réduction matériaux cumulée de la structure + rigs, en **fraction** (0–1).
   * Ex. Raitaru + rig T1 ≈ 0.021 ; à 0 pour une station NPC.
   */
  facilityMaterialBonus: number;
  materials: Material[];
  /** Activité (défaut `manufacturing`). */
  activity?: ActivityType;
  /** Time Efficiency du blueprint, 0–20 (%). Ignoré pour les réactions. */
  te?: number;
  /** Temps **de base** par run (secondes, blueprint TE 0). 0 si inconnu. */
  baseTimePerRun?: number;
  /** Réduction de temps cumulée structure + rigs + skills, fraction (0–1). */
  facilityTimeBonus?: number;
}

/** ME effectif : 0 pour les réactions, sinon le ME du blueprint. */
export function effectiveMe(recipe: Recipe): number {
  return recipe.activity === "reaction" ? 0 : recipe.me;
}

/**
 * Durée totale du job (secondes) : `baseTime × runs × (1−TE/100) × (1−bonus)`.
 * Le TE ne s'applique qu'à la fabrication. Renvoie 0 si le temps de base est
 * inconnu (saisie manuelle ou blueprint non chargé).
 */
export function buildTimeSeconds(recipe: Recipe): number {
  const base = recipe.baseTimePerRun ?? 0;
  if (base <= 0 || recipe.runs <= 0) return 0;
  const te = recipe.activity === "reaction" ? 0 : (recipe.te ?? 0);
  const bonus = recipe.facilityTimeBonus ?? 0;
  return base * recipe.runs * (1 - te / 100) * (1 - bonus);
}

/** Base de prix d'un type : achat (buy max), vente (sell min) et prix ajusté ESI. */
export interface Price {
  buy: number;
  sell: number;
  adjusted: number;
}

export type PriceMap = Record<number, Price | undefined>;

/** Quel côté du carnet utiliser pour valoriser. */
export type PriceBasis = "buy" | "sell";

export interface CostInputs {
  /** Index de coût du système pour l'activité (0–1), ex. 0.05. */
  systemCostIndex: number;
  /** Taxe d'installation de la structure (0–1), ex. 0.0025. */
  facilityTax: number;
  /** Surtaxe SCC (0–1). Défaut `DEFAULT_SCC_SURCHARGE`. */
  sccSurcharge: number;
  /** Base de prix des **matériaux** d'entrée. */
  materialBasis: PriceBasis;
  /** Base de prix du **produit** vendu. */
  productBasis: PriceBasis;
  /** Taxe de vente (0–1), ex. 0.045. */
  salesTax: number;
  /** Frais de courtage à la vente (0–1), ex. 0.03 (0 en ordre immédiat). */
  brokerFee: number;
}

/** Arrondi à `d` décimales (stabilise les flottants avant `ceil`). */
export function roundTo(x: number, d: number): number {
  const f = 10 ** d;
  return Math.round((x + Number.EPSILON) * f) / f;
}

/**
 * Quantité requise d'un matériau pour le **job entier** (tous les runs), après
 * ME + bonus de structure. Formule EVE : `round(base × runs × mod, 2)` puis
 * `ceil`, avec un plancher de `runs` (chaque run consomme au moins 1 unité).
 */
export function requiredQuantity(
  baseQty: number,
  runs: number,
  me: number,
  facilityMaterialBonus: number,
): number {
  if (baseQty <= 0 || runs <= 0) return 0;
  const modifier = (1 - me / 100) * (1 - facilityMaterialBonus);
  const raw = baseQty * runs * modifier;
  return Math.max(runs, Math.ceil(roundTo(raw, 2)));
}

/** Une ligne de matériau résolue (quantité réelle + coût). */
export interface MaterialLine {
  typeId: number;
  name: string;
  baseQty: number;
  /** Quantité réelle pour le job (après ME), tous runs confondus. */
  quantity: number;
  unitPrice: number;
  cost: number;
  /** Vrai si aucun prix n'a été trouvé pour ce type. */
  missingPrice: boolean;
}

/** Prix unitaire d'un type selon la base, 0 si absent. */
function priceOf(prices: PriceMap, typeId: number, basis: PriceBasis): number {
  const p = prices[typeId];
  return p ? p[basis] : 0;
}

/**
 * EIV (Estimated Item Value) : Σ (quantité **de base** par run × `adjusted_price`)
 * × runs. N'utilise **pas** le ME (c'est la base du coût d'installation).
 */
export function estimatedItemValue(recipe: Recipe, prices: PriceMap): number {
  const perRun = recipe.materials.reduce((sum, m) => {
    const adj = prices[m.typeId]?.adjusted ?? 0;
    return sum + m.baseQty * adj;
  }, 0);
  return perRun * Math.max(0, recipe.runs);
}

/**
 * Coût d'installation du job : `EIV × (index système + taxe structure + SCC)`.
 */
export function jobInstallCost(eiv: number, inputs: CostInputs): number {
  const rate = inputs.systemCostIndex + inputs.facilityTax + inputs.sccSurcharge;
  return Math.max(0, eiv * rate);
}

/** Résultat complet d'un calcul de coût/profit. */
export interface CostResult {
  lines: MaterialLine[];
  materialCost: number;
  eiv: number;
  installCost: number;
  totalCost: number;
  unitsProduced: number;
  /** Coût de revient par unité produite. */
  unitCost: number;
  productUnitPrice: number;
  grossRevenue: number;
  netRevenue: number;
  profit: number;
  /** Marge nette = profit / revenu net (%). */
  marginPct: number;
  /** Retour sur investissement = profit / coût total (%). */
  roiPct: number;
  /** Durée totale du job (secondes). 0 si temps inconnu. */
  timeSeconds: number;
  /** Unités produites par heure (0 si temps inconnu). */
  unitsPerHour: number;
  /** Profit par **heure** de job (la métrique reine). 0 si temps inconnu. */
  profitPerHour: number;
  /** Vrai si au moins un matériau (ou le produit) n'a pas de prix. */
  hasMissingPrices: boolean;
}

/** Calcule coût de revient, valeur de vente et profit d'une recette. */
export function computeCost(
  recipe: Recipe,
  prices: PriceMap,
  inputs: CostInputs,
): CostResult {
  const me = effectiveMe(recipe);
  const lines: MaterialLine[] = recipe.materials.map((m) => {
    const quantity = requiredQuantity(
      m.baseQty,
      recipe.runs,
      me,
      recipe.facilityMaterialBonus,
    );
    const unitPrice = priceOf(prices, m.typeId, inputs.materialBasis);
    return {
      typeId: m.typeId,
      name: m.name,
      baseQty: m.baseQty,
      quantity,
      unitPrice,
      cost: quantity * unitPrice,
      missingPrice: !prices[m.typeId],
    };
  });

  const materialCost = lines.reduce((s, l) => s + l.cost, 0);
  const eiv = estimatedItemValue(recipe, prices);
  const installCost = jobInstallCost(eiv, inputs);
  const totalCost = materialCost + installCost;

  const unitsProduced = Math.max(0, recipe.outputPerRun * recipe.runs);
  const unitCost = unitsProduced > 0 ? totalCost / unitsProduced : 0;

  const productUnitPrice = priceOf(prices, recipe.outputTypeId, inputs.productBasis);
  const grossRevenue = productUnitPrice * unitsProduced;
  const feeRate = clamp01(inputs.salesTax + inputs.brokerFee);
  const netRevenue = grossRevenue * (1 - feeRate);
  const profit = netRevenue - totalCost;
  const marginPct = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
  const roiPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  const timeSeconds = buildTimeSeconds(recipe);
  const hours = timeSeconds / 3600;
  const unitsPerHour = hours > 0 ? unitsProduced / hours : 0;
  const profitPerHour = hours > 0 ? profit / hours : 0;

  const hasMissingPrices =
    lines.some((l) => l.missingPrice) || !prices[recipe.outputTypeId];

  return {
    lines,
    materialCost,
    eiv,
    installCost,
    totalCost,
    unitsProduced,
    unitCost,
    productUnitPrice,
    grossRevenue,
    netRevenue,
    profit,
    marginPct,
    roiPct,
    timeSeconds,
    unitsPerHour,
    profitPerHour,
    hasMissingPrices,
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
