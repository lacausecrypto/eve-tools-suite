import { cn } from "@/lib/utils";

/** Coordonnée X (repère viewBox) à partir d'un évènement souris sur un SVG `w-full`. */
export function svgXFromEvent(e: React.MouseEvent, totalW: number): number {
  const rect = (e.currentTarget as Element).getBoundingClientRect();
  if (rect.width === 0) return 0;
  return ((e.clientX - rect.left) / rect.width) * totalW;
}

/**
 * Bulle de survol positionnée horizontalement sur le graphe (en % de largeur),
 * bascule à gauche du curseur près du bord droit. `pointer-events-none` pour ne
 * pas gêner le survol du SVG.
 */
export function ChartTooltip({
  xPct,
  children,
}: {
  xPct: number;
  children: React.ReactNode;
}) {
  const flip = xPct > 62;
  return (
    <div
      className="pointer-events-none absolute top-1 z-20"
      style={{ left: `${Math.min(100, Math.max(0, xPct))}%` }}
    >
      <div
        className={cn(
          "min-w-[9rem] whitespace-nowrap rounded-lg border border-border bg-popover/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur",
          flip ? "-translate-x-[calc(100%+0.5rem)]" : "translate-x-2",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Une ligne clé/valeur de la bulle. */
export function TipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {color && <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />}
        {label}
      </span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}
