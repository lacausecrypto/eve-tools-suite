/** Petits formatages pour l'Academy. */

export function pct(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)} %`;
}
