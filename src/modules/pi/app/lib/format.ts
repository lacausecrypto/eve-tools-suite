/** Formatage compact des nombres / ISK pour le simulateur PI. */

export function fmtIsk(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(2) + " Md";
  if (a >= 1e6) return (v / 1e6).toFixed(2) + " M";
  if (a >= 1e3) return (v / 1e3).toFixed(1) + " k";
  return Math.round(v).toString();
}

export function fmtNum(v: number, digits = 0): string {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function fmtHours(h: number): string {
  if (!Number.isFinite(h)) return "∞";
  if (h < 1) return Math.round(h * 60) + " min";
  if (h < 48) return h.toFixed(1) + " h";
  return (h / 24).toFixed(1) + " j";
}

/** Durée signée en ms → libellé relatif compact (négatif = passé). */
export function fmtCountdown(ms: number): string {
  const past = ms < 0;
  const m = Math.round(Math.abs(ms) / 60000);
  let label: string;
  if (m < 60) label = `${m} min`;
  else if (m < 60 * 48) label = `${(m / 60).toFixed(1)} h`;
  else label = `${(m / 1440).toFixed(1)} j`;
  return past ? `−${label}` : label;
}
