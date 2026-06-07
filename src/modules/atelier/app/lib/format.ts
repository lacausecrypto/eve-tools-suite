/** Formatage pour l'Atelier de Fit. */

const NUM = new Intl.NumberFormat("fr-FR");

export function fmtHp(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + " M";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + " k";
  return NUM.format(Math.round(v));
}

export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return (v * 100).toFixed(digits) + " %";
}

export function fmtSec(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (v === Infinity) return "∞";
  if (v >= 60) return `${Math.floor(v / 60)} min ${Math.round(v % 60)} s`;
  return v.toFixed(1) + " s";
}
