/** Formatage des nombres / ISK / temps pour le Market Browser. */

/** Traducteur passé par les composants (clés « market. »). Voir messages.ts. */
type T = (key: string, vars?: Record<string, string | number>) => string;

const FULL = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const QTY = new Intl.NumberFormat("en-US");

/** ISK complet, groupé (ex. « 200 000 000,00 ISK »). */
export function fmtIskFull(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return FULL.format(v) + " ISK";
}

/** ISK compact (ex. « 210M », « 5.43M », « 1.20B »). */
export function fmtIskShort(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return (v / 1e12).toFixed(2) + "T";
  if (a >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (v / 1e3).toFixed(2) + "k";
  return v.toFixed(2);
}

/** Quantité entière groupée. */
export function fmtQty(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return QTY.format(Math.round(v));
}

/** Statut de sécurité arrondi à une décimale (« 0.9 », « 0.0 », « -0.1 »). */
export function fmtSec(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  // EVE arrondit vers le haut au-dessus de 0, sauf 0.0.
  const rounded = sec > 0 && sec < 0.05 ? 0.1 : Math.round(sec * 10) / 10;
  return rounded.toFixed(1);
}

/** Classe de couleur Tailwind selon le statut de sécurité. */
export function secColor(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "text-muted-foreground";
  if (sec >= 0.5) return "text-success";
  if (sec >= 0.1) return "text-amber-400";
  return "text-destructive";
}

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Durée (ms) → libellé compact « 89j 3h 21m » / « 39 min ». */
export function fmtDuration(t: T, ms: number): string {
  if (!Number.isFinite(ms)) return "—";
  if (ms <= 0) return t("market.fmt.expired");
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  if (d > 0) return t("market.fmt.dhm", { d, h, m });
  if (h > 0) return t("market.fmt.hm", { h, m });
  return t("market.fmt.min", { m });
}

/** Temps écoulé depuis un horodatage ISO → « il y a 39 min / 2 j ». */
export function fmtAgo(t: T, iso: string, now = Date.now()): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return "—";
  const ms = now - ts;
  if (ms < MIN) return t("market.fmt.justNow");
  if (ms < HOUR) return t("market.fmt.agoMin", { n: Math.floor(ms / MIN) });
  if (ms < DAY) return t("market.fmt.agoHour", { n: Math.floor(ms / HOUR) });
  return t("market.fmt.agoDay", { n: Math.floor(ms / DAY) });
}

/** Expiration restante d'un ordre (issued ISO + durée en jours). */
export function expiresIn(t: T, iso: string, durationDays: number, now = Date.now()): string {
  const issued = Date.parse(iso);
  if (!Number.isFinite(issued)) return "—";
  return fmtDuration(t, issued + durationDays * DAY - now);
}

/** Libellé lisible de la portée d'un ordre d'achat. */
export function fmtRange(t: T, range: string): string {
  switch (range) {
    case "station":
      return t("market.range.station");
    case "solarsystem":
      return t("market.range.solarsystem");
    case "region":
      return t("market.range.region");
    default:
      return /^\d+$/.test(range) ? t("market.range.jumps", { n: range }) : range;
  }
}
