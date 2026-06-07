/**
 * Câblage réseau de l'arbre build-vs-buy : injecte les services réels (résolution
 * de noms, blueprint Fuzzwork, prix Jita) dans le cœur pur `buildCostTree`.
 *
 * Astuce : `resolveProduct` (async) **précharge et cache** le prix d'achat du
 * type, si bien que `buyUnitPrice` (sync) le lit ensuite — l'arbre découvrant ses
 * types au fil de l'expansion, on ne peut pas tout précharger d'avance.
 */
import { fetchBlueprintForProduct } from "./blueprint";
import { buildPriceMap, resolveTypeIds } from "./market";
import { buildCostTree, type TreeNode } from "./buildtree";
import type { CostInputs } from "./industry";

export interface TreeRunOptions {
  me: number;
  facilityMaterialBonus: number;
  inputs: CostInputs;
  maxDepth?: number;
  maxNodes?: number;
}

export async function runBuildTree(
  rootName: string,
  rootQty: number,
  opts: TreeRunOptions,
): Promise<TreeNode> {
  const priceCache = new Map<number, number>();

  const resolveProduct = async (name: string) => {
    const m = await resolveTypeIds([name]);
    const r = m.get(name.trim().toLowerCase());
    if (!r) return null;
    if (!priceCache.has(r.id)) {
      const pm = await buildPriceMap([r.id]);
      priceCache.set(r.id, pm[r.id]?.[opts.inputs.materialBasis] ?? 0);
    }
    return { typeId: r.id, name: r.name };
  };

  const installRate =
    opts.inputs.systemCostIndex + opts.inputs.facilityTax + opts.inputs.sccSurcharge;

  return buildCostTree(rootName, rootQty, {
    resolveProduct,
    getBlueprint: fetchBlueprintForProduct,
    buyUnitPrice: (id) => priceCache.get(id) ?? 0,
    installRate,
    me: opts.me,
    facilityMaterialBonus: opts.facilityMaterialBonus,
    maxDepth: opts.maxDepth ?? 4,
    maxNodes: opts.maxNodes ?? 80,
  });
}
