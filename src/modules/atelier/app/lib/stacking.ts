/**
 * Pénalités d'**empilement** (stacking) EVE. Au-delà du module le plus efficace,
 * chaque module supplémentaire voit son bonus réduit par
 *   p_i = exp(−(i / 2.67)²),  i = 0, 1, 2, …
 * Les modules sont triés du plus fort au plus faible avant application.
 */

/** Facteur de pénalité du i-ème module (0-indexé), trié par efficacité. */
export function penalty(i: number): number {
  return Math.exp(-((i / 2.67) ** 2));
}

/**
 * Combine une liste de **multiplicateurs de résonance** (chacun < 1 améliore la
 * résist) en appliquant la pénalité d'empilement, et renvoie le multiplicateur
 * de résonance résultant (à appliquer à la résonance de base de la coque).
 *
 * result = Π (1 + (m_k − 1) · p_k),  trié par |m_k − 1| décroissant.
 */
export function combineResonance(multipliers: number[]): number {
  const sorted = multipliers
    .map((m) => ({ m, strength: Math.abs(m - 1) }))
    .sort((a, b) => b.strength - a.strength);
  let factor = 1;
  for (let i = 0; i < sorted.length; i++) {
    factor *= 1 + (sorted[i].m - 1) * penalty(i);
  }
  return factor;
}
