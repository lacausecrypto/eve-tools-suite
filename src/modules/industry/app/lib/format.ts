/** Formatage compact pour l'Industry Tracker — pur. */

/** ISK compact signé : 12.3 M, -4.21 B, 540 K… */
export function fmtIsk(n: number): string {
  if (!isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(2)} B`;
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(2)} M`;
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)} K`;
  return `${sign}${Math.round(a)}`;
}

/** Entier avec séparateurs de milliers. */
export function fmtInt(n: number): string {
  if (!isFinite(n)) return "—";
  return Math.round(n).toLocaleString();
}

/** Pourcentage signé à une décimale. */
export function fmtPct(n: number): string {
  if (!isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)} %`;
}

/** Durée compacte depuis des secondes : 2j 3h, 4h 12m, 38m, 45s. */
export function fmtDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "—";
  const s = Math.round(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}j ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
