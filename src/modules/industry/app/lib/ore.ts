/**
 * Sourcing « build-from-ore » — **pur**. Réutilise la table de retraitement du
 * module Mining (`REPROCESS`, générée du SDE) pour répondre : « pour ce minéral,
 * quel minerai est le plus efficace, et combien en faut-il ? »
 *
 * Indice **par minéral** (base mono-minéral) — un minerai rend plusieurs
 * minéraux, donc c'est une piste de sourcing, pas un solveur d'optimisation
 * multi-minéral. Étiqueté comme tel dans l'UI.
 */
import { REPROCESS } from "@/modules/mining/app/data/reprocess";

/** Une source de minerai pour un minéral. */
export interface OreSource {
  /** Nom du minerai (clé REPROCESS, minuscule). */
  ore: string;
  /** Rendement du minéral par **unité** de minerai (avant taux de raffinage). */
  yieldPerUnit: number;
}

/** Minerais rendant `mineralName`, meilleur rendement d'abord (top `limit`). */
export function oreSources(mineralName: string, limit = 3): OreSource[] {
  const target = mineralName.trim().toLowerCase();
  const out: OreSource[] = [];
  for (const [ore, yields] of Object.entries(REPROCESS)) {
    const hit = yields.find((y) => y.m.toLowerCase() === target);
    if (hit && hit.q > 0) out.push({ ore, yieldPerUnit: hit.q });
  }
  out.sort((a, b) => b.yieldPerUnit - a.yieldPerUnit);
  return out.slice(0, limit);
}

/**
 * Unités de minerai nécessaires pour obtenir `mineralQty` d'un minéral, au taux
 * de raffinage `refineRate` (0–1, ex. 0.906 en structure max skills).
 */
export function oreUnitsFor(
  mineralQty: number,
  yieldPerUnit: number,
  refineRate: number,
): number {
  const effective = yieldPerUnit * Math.max(0, Math.min(1, refineRate));
  if (effective <= 0) return 0;
  return Math.ceil(mineralQty / effective);
}

/** Vrai si un nom correspond à un minéral présent dans la table de retraitement. */
export function isMineral(name: string): boolean {
  return oreSources(name, 1).length > 0;
}
