/**
 * Arbre de coût **build-vs-buy** multi-niveau. Pour chaque composant, on compare
 * « acheter » au marché vs « fabriquer » (récursivement) et on retient le moins
 * cher — le vrai coût d'un produit complexe (parts T2, composants capitaux…).
 *
 * Les dépendances (résolution produit, blueprint, prix) sont **injectées** : le
 * cœur de décision est ainsi testable sans réseau. Le coût d'installation est
 * **estimé** (`installRate × valeur marché des intrants`) — approximation de
 * l'EIV suffisante pour un arbre de planification, étiquetée comme telle.
 */
import { requiredQuantity, type ActivityType } from "./industry";
import type { ResolvedBlueprint } from "./blueprint";

export type NodeMode = "buy" | "build" | "leaf";

export interface TreeNode {
  typeId: number;
  name: string;
  /** Quantité requise de cet item dans l'arbre. */
  qty: number;
  mode: NodeMode;
  /** Coût unitaire retenu (le moins cher entre acheter et fabriquer). */
  unitCost: number;
  /** Coût total retenu = unitCost × qty. */
  totalCost: number;
  /** Prix d'achat unitaire au marché (référence de comparaison). */
  buyUnitCost: number;
  /** Coût unitaire de fabrication (si un blueprint existe). */
  buildUnitCost?: number;
  children?: TreeNode[];
  /** ISK économisés en fabriquant plutôt qu'en achetant (≥0 si build retenu). */
  savedByBuilding?: number;
}

export interface TreeDeps {
  /** Nom → { typeId, name canonique } (ou null). */
  resolveProduct: (name: string) => Promise<{ typeId: number; name: string } | null>;
  /** Blueprint résolu d'un produit (ou null si non fabricable). */
  getBlueprint: (name: string) => Promise<ResolvedBlueprint | null>;
  /** Prix d'achat unitaire au marché d'un type (0 si inconnu). */
  buyUnitPrice: (typeId: number) => number;
  /** Taux d'installation (index système + taxe + SCC) appliqué à l'EIV estimé. */
  installRate: number;
  /** ME appliqué aux blueprints fabriqués (fabrication ; 0 pour réactions). */
  me: number;
  /** Réduction matériaux structure/rigs (fraction 0–1). */
  facilityMaterialBonus: number;
  /** Profondeur maximale d'expansion. */
  maxDepth: number;
  /** Nombre maximal de nœuds (garde-fou). */
  maxNodes: number;
}

function meFor(activity: ActivityType, me: number): number {
  return activity === "reaction" ? 0 : me;
}

/**
 * Construit l'arbre de coût optimisé pour `rootQty` unités de `rootName`.
 * Récursif : un nœud est « build » seulement si fabriquer revient moins cher que
 * d'acheter (et dans les limites de profondeur/nœuds).
 */
export async function buildCostTree(
  rootName: string,
  rootQty: number,
  deps: TreeDeps,
): Promise<TreeNode> {
  let nodeCount = 0;

  async function expand(name: string, qty: number, depth: number): Promise<TreeNode> {
    const prod = await deps.resolveProduct(name);
    const typeId = prod?.typeId ?? 0;
    const canonical = prod?.name ?? name;
    const buyUnit = typeId > 0 ? deps.buyUnitPrice(typeId) : 0;

    const leaf = (): TreeNode => ({
      typeId,
      name: canonical,
      qty,
      mode: typeId > 0 ? "buy" : "leaf",
      unitCost: buyUnit,
      totalCost: buyUnit * qty,
      buyUnitCost: buyUnit,
    });

    if (depth >= deps.maxDepth || nodeCount >= deps.maxNodes) return leaf();

    const bp = await deps.getBlueprint(name);
    if (!bp || bp.materials.length === 0 || bp.outputPerRun <= 0) return leaf();

    const runs = Math.max(1, Math.ceil(qty / bp.outputPerRun));
    const me = meFor(bp.activity, deps.me);

    const children: TreeNode[] = [];
    for (const m of bp.materials) {
      if (nodeCount >= deps.maxNodes) break;
      nodeCount += 1;
      const reqQty = requiredQuantity(m.baseQty, runs, me, deps.facilityMaterialBonus);
      children.push(await expand(m.name, reqQty, depth + 1));
    }

    const childrenTotal = children.reduce((s, c) => s + c.totalCost, 0);
    // EIV estimé ≈ valeur d'achat marché des intrants (proxy de adjusted_price).
    const eivProxy = children.reduce((s, c) => s + c.buyUnitCost * c.qty, 0);
    const install = deps.installRate * eivProxy;
    const produced = runs * bp.outputPerRun;
    const buildUnit = produced > 0 ? (childrenTotal + install) / produced : Infinity;
    const buildTotal = buildUnit * qty;
    const buyTotal = buyUnit * qty;

    // Fabrique si c'est moins cher (ou si pas de prix d'achat connu).
    const shouldBuild = buyUnit <= 0 || buildTotal < buyTotal;
    if (!shouldBuild) return leaf();

    return {
      typeId,
      name: canonical,
      qty,
      mode: "build",
      unitCost: buildUnit,
      totalCost: buildTotal,
      buyUnitCost: buyUnit,
      buildUnitCost: buildUnit,
      children,
      savedByBuilding: buyTotal > 0 ? buyTotal - buildTotal : 0,
    };
  }

  return expand(rootName, rootQty, 0);
}

/** Coût total « tout acheter » de l'arbre (référence vs build optimisé). */
export function buyAllCost(node: TreeNode): number {
  return node.buyUnitCost * node.qty;
}

/** Nombre de nœuds « build » dans l'arbre (composants fabriqués). */
export function countBuilt(node: TreeNode): number {
  const self = node.mode === "build" ? 1 : 0;
  return self + (node.children?.reduce((s, c) => s + countBuilt(c), 0) ?? 0);
}
