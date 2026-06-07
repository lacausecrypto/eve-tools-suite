import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import type { HistoryDay } from "../lib/types";
import {
  RANGE_DAYS,
  sma,
  daysToClear,
  type Range,
} from "../lib/analytics";
import { fmtIskShort, fmtQty } from "../lib/format";
import { ChartTooltip, TipRow, svgXFromEvent } from "./ChartTooltip";

const W = 760;
const H = 250;
const PAD = { top: 10, right: 10, bottom: 20, left: 10 };
const PLOT_H = H - PAD.top - PAD.bottom;
const VOL_H = 48;
const PRICE_H = PLOT_H - VOL_H - 10;

const COL = {
  band: "hsl(var(--primary) / 0.12)",
  avg: "hsl(var(--primary))",
  ma5: "#f59e0b",
  ma20: "#a78bfa",
  vol: "hsl(var(--muted-foreground) / 0.30)",
};

/** Courbe d'historique enrichie : plages, MA5/MA20, volume unités/ISK, métriques. */
export function HistoryChart({
  days,
  sellVolume,
}: {
  days: HistoryDay[];
  sellVolume: number;
}) {
  const t = useT();
  const [range, setRange] = useState<Range>("3m");
  const [volMode, setVolMode] = useState<"units" | "isk">("units");
  const [hoverI, setHoverI] = useState<number | null>(null);

  // MA calculées sur la série complète, puis tranchées à la plage.
  const ma5Full = useMemo(() => sma(days.map((d) => d.average), 5), [days]);
  const ma20Full = useMemo(() => sma(days.map((d) => d.average), 20), [days]);

  const view = useMemo(() => {
    const n = RANGE_DAYS[range];
    const start = Number.isFinite(n) ? Math.max(0, days.length - n) : 0;
    const data = days.slice(start);
    return { data, ma5: ma5Full.slice(start), ma20: ma20Full.slice(start) };
  }, [days, range, ma5Full, ma20Full]);

  const metrics = useMemo(() => {
    const { data } = view;
    if (!data.length) return null;
    const last = data[data.length - 1];
    const hi = Math.max(...data.map((d) => d.highest));
    const lo = Math.min(...data.map((d) => d.lowest));
    const avgVol = data.reduce((s, d) => s + d.volume, 0) / data.length;
    const iskDay = avgVol * last.average;
    return { last, hi, lo, avgVol, iskDay, dtc: daysToClear(sellVolume, avgVol) };
  }, [view, sellVolume]);

  const geom = useMemo(() => {
    const { data } = view;
    if (data.length < 2) return null;
    const innerW = W - PAD.left - PAD.right;
    const x = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;

    const pMin = Math.min(...data.map((d) => d.lowest));
    const pMax = Math.max(...data.map((d) => d.highest));
    const span = pMax - pMin || 1;
    const yP = (v: number) => PAD.top + PRICE_H - ((v - pMin) / span) * PRICE_H;

    const vols = data.map((d) => (volMode === "isk" ? d.volume * d.average : d.volume));
    const vMax = Math.max(...vols, 1);
    const volBase = PAD.top + PLOT_H;
    const yV = (v: number) => (v / vMax) * VOL_H;

    return { x, yP, yV, volBase, vols };
  }, [view, volMode]);

  return (
    <div className="space-y-3">
      {/* Contrôles */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-0.5">
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t("market.range." + r)}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border border-border p-0.5">
          {(["units", "isk"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setVolMode(m)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                volMode === m ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "units" ? t("market.history.volUnits") : t("market.history.volIsk")}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
          <Legend color={COL.avg} label={t("market.history.average")} />
          <Legend color={COL.ma5} label={t("market.history.ma5")} />
          <Legend color={COL.ma20} label={t("market.history.ma20")} />
        </div>
      </div>

      {/* Métriques */}
      {metrics && (
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
          <Metric label={t("market.history.average")} value={`${fmtIskShort(metrics.last.average)} ISK`} />
          <Metric label={t("market.history.hiLo")} value={`${fmtIskShort(metrics.lo)} – ${fmtIskShort(metrics.hi)}`} />
          <Metric label={t("market.history.avgVolDay")} value={fmtQty(metrics.avgVol)} />
          <Metric label={t("market.history.iskTradedDay")} value={`${fmtIskShort(metrics.iskDay)} ISK`} />
          <Metric
            label={t("market.history.daysToClear")}
            value={metrics.dtc == null ? "—" : metrics.dtc < 0.1 ? t("market.history.lessThan") : t("market.history.days", { n: metrics.dtc.toFixed(1) })}
            hint={t("market.history.daysToClearHint")}
          />
        </div>
      )}

      {/* Graphe */}
      {geom ? (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            role="img"
            aria-label={t("market.history.axisLabel")}
            onMouseMove={(e) => {
              const sx = svgXFromEvent(e, W);
              const innerW = W - PAD.left - PAD.right;
              const n = view.data.length;
              const i = Math.round(((sx - PAD.left) / innerW) * (n - 1));
              setHoverI(Math.min(n - 1, Math.max(0, i)));
            }}
            onMouseLeave={() => setHoverI(null)}
          >
            <path d={bandPath(view.data, geom.x, geom.yP)} fill={COL.band} />
            {geom.vols.map((v, i) => {
              const h = geom.yV(v);
              return (
                <rect
                  key={i}
                  x={geom.x(i) - 1.2}
                  y={geom.volBase - h}
                  width={2.4}
                  height={h}
                  fill={hoverI === i ? COL.avg : COL.vol}
                />
              );
            })}
            <path d={linePath(view.data.map((d) => d.average), geom.x, geom.yP)} fill="none" stroke={COL.avg} strokeWidth={1.6} />
            <path d={maPath(view.ma5, geom.x, geom.yP)} fill="none" stroke={COL.ma5} strokeWidth={1.3} />
            <path d={maPath(view.ma20, geom.x, geom.yP)} fill="none" stroke={COL.ma20} strokeWidth={1.3} />

            {hoverI != null && (
              <g>
                <line
                  x1={geom.x(hoverI)}
                  x2={geom.x(hoverI)}
                  y1={PAD.top}
                  y2={PAD.top + PLOT_H}
                  stroke="hsl(var(--muted-foreground) / 0.5)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle cx={geom.x(hoverI)} cy={geom.yP(view.data[hoverI].average)} r={3} fill={COL.avg} />
              </g>
            )}
          </svg>

          {hoverI != null && (
            <ChartTooltip xPct={(geom.x(hoverI) / W) * 100}>
              <div className="mb-0.5 font-medium text-foreground">{view.data[hoverI].date.slice(0, 10)}</div>
              <TipRow label={t("market.history.average")} value={`${fmtIskShort(view.data[hoverI].average)} ISK`} color={COL.avg} />
              <TipRow label={t("market.history.high")} value={`${fmtIskShort(view.data[hoverI].highest)} ISK`} />
              <TipRow label={t("market.history.low")} value={`${fmtIskShort(view.data[hoverI].lowest)} ISK`} />
              <TipRow
                label={volMode === "isk" ? t("market.history.volumeIsk") : t("market.history.volume")}
                value={volMode === "isk" ? `${fmtIskShort(view.data[hoverI].volume * view.data[hoverI].average)} ISK` : fmtQty(view.data[hoverI].volume)}
              />
            </ChartTooltip>
          )}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          {t("market.history.notEnough")}
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-2.5 py-1.5" title={hint}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

function linePath(values: number[], x: (i: number) => number, y: (v: number) => number): string {
  return values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
}

function maPath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string {
  let started = false;
  const parts: string[] = [];
  values.forEach((v, i) => {
    if (v == null) return;
    parts.push(`${started ? "L" : "M"}${x(i)},${y(v)}`);
    started = true;
  });
  return parts.join(" ");
}

function bandPath(data: HistoryDay[], x: (i: number) => number, y: (v: number) => number): string {
  const top = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.highest)}`).join(" ");
  const bottom = data
    .map((_, i) => {
      const j = data.length - 1 - i;
      return `L${x(j)},${y(data[j].lowest)}`;
    })
    .join(" ");
  return `${top} ${bottom} Z`;
}
