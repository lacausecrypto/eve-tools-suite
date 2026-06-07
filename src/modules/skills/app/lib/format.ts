/** Formatage durée / SP pour le planificateur de compétences. */

export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 min";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} j`);
  if (h) parts.push(`${h} h`);
  if (m && d === 0) parts.push(`${m} min`);
  return parts.length ? parts.join(" ") : "< 1 min";
}

export function fmtSp(sp: number): string {
  if (!Number.isFinite(sp)) return "—";
  if (sp >= 1e6) return (sp / 1e6).toFixed(2) + " M";
  if (sp >= 1e3) return (sp / 1e3).toFixed(1) + " k";
  return Math.round(sp).toString();
}
