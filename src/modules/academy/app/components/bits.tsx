import { cn } from "@/lib/utils";
import type { LevelInfo } from "../lib/xp";

/** Pastille de niveau. */
export function LevelChip({ level, className }: { level: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid h-9 w-9 place-items-center rounded-lg border border-fleur/40 bg-fleur/10 text-sm font-bold text-fleur",
        className,
      )}
    >
      {level}
    </span>
  );
}

/** Barre d'XP avec niveau + titre. */
export function XpBar({ info }: { info: LevelInfo }) {
  return (
    <div className="flex items-center gap-3">
      <LevelChip level={info.level} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{info.title}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {info.intoLevel} / {info.span} XP
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-fleur transition-[width] duration-300"
            style={{ width: `${Math.round(info.progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Tuile statistique compacte. */
export function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", accent)}>{value}</div>
    </div>
  );
}

/** Anneau de progression circulaire (SVG). */
export function ProgressRing({
  value,
  size = 44,
  color = "hsl(var(--primary))",
  label,
}: {
  value: number; // 0..1
  size?: number;
  color?: string;
  label?: string;
}) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      {label && <span className="absolute text-[10px] font-semibold tabular-nums">{label}</span>}
    </div>
  );
}
