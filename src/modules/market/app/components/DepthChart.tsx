import { useMemo, useState } from "react";
import { useT } from "@/core/i18n";
import type { MarketOrder } from "../lib/types";
import { buildDepth, type DepthPoint } from "../lib/analytics";
import { fmtIskShort, fmtQty } from "../lib/format";
import { ChartTooltip, TipRow, svgXFromEvent } from "./ChartTooltip";

const W = 760;
const H = 240;
const PAD = { top: 12, right: 12, bottom: 26, left: 12 };
const PLOT_H = H - PAD.top - PAD.bottom;

const SELL = "hsl(var(--success))";
const BUY = "hsl(var(--primary))";

/** Carnet d'ordres en **profondeur cumulée** (volume cumulé vs prix). */
export function DepthChart({ sells, buys }: { sells: MarketOrder[]; buys: MarketOrder[] }) {
  const t = useT();
  const model = useMemo(() => buildDepth(sells, buys), [sells, buys]);
  const [hoverX, setHoverX] = useState<number | null>(null);

  if (!model) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {t("market.depth.empty")}
      </div>
    );
  }

  const { buy, sell, bestBuy, bestSell, domainMin, domainMax, maxCum } = model;
  const innerW = W - PAD.left - PAD.right;
  const span = domainMax - domainMin || 1;
  const x = (p: number) =>
    PAD.left + (Math.min(domainMax, Math.max(domainMin, p)) - domainMin) / span * innerW;
  const y = (c: number) => PAD.top + PLOT_H - (Math.min(maxCum, c) / maxCum) * PLOT_H;

  const mid = bestBuy != null && bestSell != null ? (bestBuy + bestSell) / 2 : bestSell ?? bestBuy ?? 0;
  const spread = bestBuy != null && bestSell != null ? bestSell - bestBuy : null;

  // Survol : prix au curseur + profondeur cumulée de chaque côté à ce prix.
  const hover =
    hoverX != null
      ? (() => {
          const cx = Math.min(W - PAD.right, Math.max(PAD.left, hoverX));
          const price = domainMin + ((cx - PAD.left) / innerW) * span;
          let bd = 0;
          for (const pt of buy) {
            if (pt.price >= price) bd = pt.cum;
            else break;
          }
          let sd = 0;
          for (const pt of sell) {
            if (pt.price <= price) sd = pt.cum;
            else break;
          }
          return { cx, price, bd, sd };
        })()
      : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: BUY }} /> {t("market.depth.buy")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ backgroundColor: SELL }} /> {t("market.depth.sell")}
        </span>
        {spread != null && (
          <span>
            {t("market.depth.spread")} <span className="font-medium text-foreground">{fmtIskShort(spread)} ISK</span>
          </span>
        )}
        <span className="ml-auto">{t("market.depth.maxDepth", { n: fmtQty(maxCum) })}</span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={t("market.depth.axisLabel")}
          onMouseMove={(e) => setHoverX(svgXFromEvent(e, W))}
          onMouseLeave={() => setHoverX(null)}
        >
          {/* Aires de profondeur */}
          {buy.length > 0 && (
            <path d={stairArea(buy, bestBuy!, x, y, PAD.top + PLOT_H)} fill="hsl(var(--primary) / 0.18)" stroke={BUY} strokeWidth={1.3} />
          )}
          {sell.length > 0 && (
            <path d={stairArea(sell, bestSell!, x, y, PAD.top + PLOT_H)} fill="hsl(var(--success) / 0.18)" stroke={SELL} strokeWidth={1.3} />
          )}

          {/* Ligne médiane (mid) */}
          <line
            x1={x(mid)}
            x2={x(mid)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="hsl(var(--muted-foreground) / 0.5)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* Crosshair de survol */}
          {hover && (
            <line
              x1={hover.cx}
              x2={hover.cx}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="hsl(var(--foreground) / 0.6)"
              strokeWidth={1}
            />
          )}

          {/* Graduations de prix */}
          <text x={PAD.left} y={H - 8} className="fill-muted-foreground" fontSize="10">
            {fmtIskShort(domainMin)}
          </text>
          <text x={x(mid)} y={H - 8} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
            {fmtIskShort(mid)}
          </text>
          <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-muted-foreground" fontSize="10">
            {fmtIskShort(domainMax)}
          </text>
        </svg>

        {hover && (
          <ChartTooltip xPct={(hover.cx / W) * 100}>
            <div className="mb-0.5 font-medium text-foreground">{fmtIskShort(hover.price)} ISK</div>
            <TipRow label={t("market.depth.buyGtePrice")} value={fmtQty(hover.bd)} color={BUY} />
            <TipRow label={t("market.depth.sellLtePrice")} value={fmtQty(hover.sd)} color={SELL} />
          </ChartTooltip>
        )}
      </div>
    </div>
  );
}

/**
 * Construit l'aire en escalier d'un côté du carnet, depuis le meilleur prix
 * (`best`, volume 0) en montant par paliers de prix, refermée sur la ligne de base.
 */
function stairArea(
  points: DepthPoint[],
  best: number,
  x: (p: number) => number,
  y: (c: number) => number,
  baseY: number,
): string {
  const coords: [number, number][] = [[x(best), y(0)]];
  let prevCum = 0;
  for (const p of points) {
    coords.push([x(p.price), y(prevCum)]);
    coords.push([x(p.price), y(p.cum)]);
    prevCum = p.cum;
  }
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c[0]},${c[1]}`).join(" ");
  const lastX = coords[coords.length - 1][0];
  const firstX = coords[0][0];
  return `${line} L${lastX},${baseY} L${firstX},${baseY} Z`;
}
