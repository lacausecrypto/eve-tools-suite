/**
 * Frais de marché dérivés des skills — **pur** (formules canoniques EVE).
 *
 * - **Courtage** (Broker Relations) : 3 % de base, −0,3 %/niveau, plancher 1 %
 *   (hors bonus de standing, non modélisés ici). Renvoyé en fraction (0–1).
 * - **Taxe de vente** (Accounting) : 7,5 % de base, réduite de 11 %/niveau.
 *
 * Volontairement local (formule stable) pour ne pas coupler au module `trade`.
 */

/** Courtage en fraction (0–1) pour un niveau de Broker Relations (0–5). */
export function brokerFeeFromSkill(level: number): number {
  const lvl = Math.min(5, Math.max(0, level));
  return Math.max(0.01, 0.03 - 0.003 * lvl);
}

/** Taxe de vente en fraction (0–1) pour un niveau d'Accounting (0–5). */
export function salesTaxFromSkill(level: number): number {
  const lvl = Math.min(5, Math.max(0, level));
  return 0.075 * (1 - 0.11 * lvl);
}
