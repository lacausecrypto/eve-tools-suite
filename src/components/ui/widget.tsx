import { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * **Espace disponible** d'un widget, fourni par la tuile du dashboard et lu par
 * les primitives ci-dessous pour **réorganiser les données** selon la place :
 * plus de lignes quand c'est grand, valeur plus grosse, repli compact quand
 * c'est petit. `cols`/`rows` = unités de grille ; `width`/`height` = px réels du
 * contenu (0 tant que non mesuré → on retombe sur des valeurs sûres).
 */
export interface WidgetBox {
  cols: number;
  rows: number;
  width: number;
  height: number;
}

const DEFAULT_BOX: WidgetBox = { cols: 4, rows: 3, width: 0, height: 0 };
const BoxCtx = createContext<WidgetBox>(DEFAULT_BOX);

/** Fourni par la tuile du dashboard autour du contenu d'un widget. */
export const WidgetBoxProvider = BoxCtx.Provider;

/** Espace disponible courant du widget (pour s'adapter au redimensionnement). */
export function useWidgetBox(): WidgetBox {
  return useContext(BoxCtx);
}

/** Nombre de lignes affichables pour une hauteur donnée (≥ 1). */
function fitRows(height: number, rowPx: number, fallback: number): number {
  if (height <= 0) return fallback;
  return Math.max(1, Math.floor(height / rowPx));
}

/** Tonalité de la valeur d'un widget KPI. */
export type WidgetTone = "default" | "fleur" | "success" | "destructive";

const TONE: Record<WidgetTone, string> = {
  default: "text-foreground",
  fleur: "text-fleur",
  success: "text-success",
  destructive: "text-destructive",
};

const BAR: Record<WidgetTone, string> = {
  default: "bg-fleur",
  fleur: "bg-fleur",
  success: "bg-success",
  destructive: "bg-destructive",
};

/**
 * Bloc KPI standard d'un widget de dashboard : grande valeur + sous-libellé,
 * hauteur homogène. Le shell fournit la carte et le titre ; le widget rend ceci.
 */
export function WidgetStat({
  value,
  sub,
  tone = "default",
  hint,
}: {
  value: string;
  sub: string;
  tone?: WidgetTone;
  /** Ligne secondaire optionnelle, montrée seulement si la place le permet. */
  hint?: string;
}) {
  const { height, width } = useWidgetBox();
  // La taille de la valeur suit la place disponible.
  const size =
    height >= 200 ? "text-5xl" : height >= 130 ? "text-4xl" : height >= 90 ? "text-3xl" : "text-2xl";
  const showHint = hint && height >= 130;
  return (
    <div className="flex h-full flex-col justify-center">
      <div className={cn("font-semibold leading-tight tabular-nums", size, TONE[tone])}>
        {value}
      </div>
      <div className={cn("mt-1 text-muted-foreground", width >= 240 ? "text-sm" : "text-xs", "truncate")}>
        {sub}
      </div>
      {showHint && <div className="mt-0.5 truncate text-xs text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

export interface BarRow {
  label: string;
  value: number;
  display?: string;
  tone?: WidgetTone;
}

/**
 * Barres horizontales (attributs, répartition…). `max` ancre l'échelle.
 * Le nombre de barres affichées **s'adapte à la hauteur** ; `limit` (config)
 * plafonne en plus si > 0. Le surplus est résumé par une ligne « +N ».
 */
export function WidgetBars({
  rows,
  max,
  limit,
}: {
  rows: BarRow[];
  max?: number;
  limit?: number;
}) {
  const { height } = useWidgetBox();
  const scale = Math.max(1, max ?? Math.max(...rows.map((r) => Math.abs(r.value)), 1));
  if (rows.length === 0) return <Empty />;

  const capH = fitRows(height, 34, rows.length);
  const cap = limit && limit > 0 ? Math.min(limit, capH) : capH;
  const overflow = rows.length > cap;
  const shown = overflow ? rows.slice(0, Math.max(1, cap - 1)) : rows;
  const hidden = rows.length - shown.length;

  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      {shown.map((r, i) => (
        <div key={i} className="space-y-0.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate text-muted-foreground">{r.label}</span>
            <span className="shrink-0 tabular-nums">{r.display ?? r.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", BAR[r.tone ?? "fleur"])}
              style={{ width: `${Math.min(100, (Math.abs(r.value) / scale) * 100)}%` }}
            />
          </div>
        </div>
      ))}
      {overflow && <Overflow n={hidden} />}
    </div>
  );
}

export interface ListRow {
  label: string;
  value: string;
  tone?: WidgetTone;
}

/**
 * Liste compacte libellé → valeur (sessions, échéances…). Le nombre de lignes
 * **s'adapte à la hauteur** ; `limit` (config) plafonne si > 0. Le surplus est
 * résumé par une ligne « +N ».
 */
export function WidgetList({ rows, limit }: { rows: ListRow[]; limit?: number }) {
  const { height, width } = useWidgetBox();
  if (rows.length === 0) return <Empty />;

  const capH = fitRows(height, 26, rows.length);
  const cap = limit && limit > 0 ? Math.min(limit, capH) : capH;
  const overflow = rows.length > cap;
  const shown = overflow ? rows.slice(0, Math.max(1, cap - 1)) : rows;
  const hidden = rows.length - shown.length;
  const big = width >= 240;

  return (
    <div className="flex h-full flex-col gap-1 overflow-hidden">
      {shown.map((r, i) => (
        <div
          key={i}
          className={cn("flex items-center justify-between gap-2", big ? "text-sm" : "text-xs")}
        >
          <span className="truncate">{r.label}</span>
          <span className={cn("shrink-0 tabular-nums", TONE[r.tone ?? "default"])}>
            {r.value}
          </span>
        </div>
      ))}
      {overflow && <Overflow n={hidden} />}
    </div>
  );
}

/** Ligne « +N » résumant les éléments masqués faute de place. */
function Overflow({ n }: { n: number }) {
  return (
    <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground/70">+{n}</div>
  );
}

function Empty() {
  return (
    <div className="grid h-full min-h-16 place-items-center text-xs text-muted-foreground">
      —
    </div>
  );
}

/** Formatage ISK compact partagé par les widgets (Md / M / k). */
export function fmtIsk(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(2) + " Md";
  if (a >= 1e6) return (v / 1e6).toFixed(1) + " M";
  if (a >= 1e3) return (v / 1e3).toFixed(0) + " k";
  return Math.round(v).toString();
}

/** Horloge légère pour les widgets temps réel (compte à rebours…). */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const h = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(h);
  }, [intervalMs]);
  return now;
}
