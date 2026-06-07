/**
 * Solveur de **compression / cible de minéraux** — **pur**. Étant donné des
 * besoins en minéraux, trouve un **mix de minerai compressé** quasi-optimal
 * (heuristique gloutonne) qui couvre la cible au moindre coût ISK, après
 * rendement de reprocessing.
 *
 * Glouton : à chaque étape on choisit le minerai dont la **valeur des minéraux
 * encore nécessaires** apportée par ISK dépensé est maximale, et on en ajoute
 * juste assez pour satisfaire entièrement le minéral le plus « facile » (moins
 * d'overshoot), puis on réévalue. Converge et reste proche de l'optimum.
 */
import type { Ore } from "../data/ore";

export interface OreCandidate {
  ore: Ore;
  /** Prix unitaire d'achat (minerai compressé), ISK. */
  cost: number;
  /** Rendement par **unité** : materialId → quantité (déjà multipliée par le taux). */
  perUnit: Map<number, number>;
}

export interface PlanLine {
  ore: Ore;
  units: number;
  cost: number;
  volume: number;
}

export interface CompressionPlan {
  lines: PlanLine[];
  /** Minéraux produits (peut dépasser la cible). */
  produced: Map<number, number>;
  totalCost: number;
  totalVolume: number;
  /** Cibles non couvertes (aucun minerai dispo) → minéral → déficit restant. */
  shortfall: Map<number, number>;
}

/** Construit les candidats : rendement par unité (× taux) et coût. */
export function buildCandidates(ores: Ore[], rate: number, costOf: (id: number) => number): OreCandidate[] {
  const out: OreCandidate[] = [];
  for (const ore of ores) {
    const cost = costOf(ore.id);
    if (cost <= 0) continue; // pas de prix → inutilisable
    const perUnit = new Map<number, number>();
    for (const m of ore.mats) perUnit.set(m.m, (m.q / ore.portion) * rate);
    out.push({ ore, cost, perUnit });
  }
  return out;
}

/**
 * Résout la cible. `targets` : minéral → quantité voulue. `price` : valeur ISK
 * d'un minéral (pour pondérer la couverture). `maxIters` borne de sécurité.
 */
export function solveCompression(
  targets: Map<number, number>,
  candidates: OreCandidate[],
  price: (id: number) => number,
  maxIters = 100000,
): CompressionPlan {
  const deficit = new Map<number, number>();
  for (const [m, q] of targets) if (q > 0) deficit.set(m, q);

  const units = new Map<number, { ore: Ore; cost: number; n: number }>();
  let iters = 0;

  while (anyPositive(deficit) && iters++ < maxIters) {
    let best: OreCandidate | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      let coverageValue = 0;
      for (const [m, def] of deficit) {
        const y = c.perUnit.get(m);
        if (y && y > 0 && def > 0) coverageValue += Math.min(def, y) * Math.max(1, price(m));
      }
      if (coverageValue <= 0) continue;
      const score = coverageValue / c.cost;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (!best) break; // plus rien ne couvre les déficits

    // Combien d'unités : juste assez pour zéro-er le minéral le plus facile.
    let add = Infinity;
    for (const [m, def] of deficit) {
      const y = best.perUnit.get(m);
      if (y && y > 0 && def > 0) add = Math.min(add, Math.ceil(def / y));
    }
    if (!Number.isFinite(add) || add <= 0) break;

    const rec = units.get(best.ore.id) ?? { ore: best.ore, cost: best.cost, n: 0 };
    rec.n += add;
    units.set(best.ore.id, rec);

    for (const [m, y] of best.perUnit) {
      const def = deficit.get(m);
      if (def == null) continue;
      const left = def - y * add;
      if (left <= 0) deficit.delete(m);
      else deficit.set(m, left);
    }
  }

  // Construit le plan + le total produit.
  const produced = new Map<number, number>();
  const lines: PlanLine[] = [];
  let totalCost = 0;
  let totalVolume = 0;
  for (const { ore, cost, n } of units.values()) {
    lines.push({ ore, units: n, cost: n * cost, volume: n * ore.volume });
    totalCost += n * cost;
    totalVolume += n * ore.volume;
    for (const m of ore.mats) produced.set(m.m, (produced.get(m.m) ?? 0) + Math.floor((m.q / ore.portion) * n));
  }
  lines.sort((a, b) => b.cost - a.cost);

  return { lines, produced, totalCost, totalVolume, shortfall: new Map(deficit) };
}

function anyPositive(m: Map<number, number>): boolean {
  for (const v of m.values()) if (v > 0) return true;
  return false;
}
