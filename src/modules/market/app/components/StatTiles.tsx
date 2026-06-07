import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import type { MarketStats } from "../lib/types";
import { fmtIskShort, fmtQty } from "../lib/format";

function Tile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", accent)}>{value}</div>
      {sub && (
        <div className="truncate text-[11px] text-muted-foreground" title={sub}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function StatTiles({
  stats,
  jumps,
  fromSystem,
  toSystem,
}: {
  stats: MarketStats;
  /** Sauts entre vendeur le moins cher et acheteur le plus cher (route ESI). */
  jumps: number | "loading" | null;
  fromSystem: string | null;
  toSystem: string | null;
}) {
  const t = useT();
  const jumpsValue =
    jumps === "loading" ? "…" : jumps == null ? "—" : jumps === 0 ? "0" : String(jumps);
  const jumpsSub =
    fromSystem && toSystem ? `${fromSystem} → ${toSystem}` : undefined;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <Tile
        label={t("market.stat.avgSell")}
        value={stats.avgSell != null ? `${fmtIskShort(stats.avgSell)} ISK` : "—"}
        sub={stats.bestSell != null ? t("market.stat.best", { n: fmtIskShort(stats.bestSell) }) : undefined}
        accent="text-success"
      />
      <Tile
        label={t("market.stat.avgBuy")}
        value={stats.avgBuy != null ? `${fmtIskShort(stats.avgBuy)} ISK` : "—"}
        sub={stats.bestBuy != null ? t("market.stat.best", { n: fmtIskShort(stats.bestBuy) }) : undefined}
        accent="text-primary"
      />
      <Tile
        label={t("market.stat.margin")}
        value={stats.margin != null ? `${fmtIskShort(stats.margin)} ISK` : "—"}
        sub={stats.marginPct != null ? `${stats.marginPct.toFixed(1)} %` : undefined}
        accent={stats.margin != null && stats.margin >= 0 ? "text-success" : "text-destructive"}
      />
      <Tile label={t("market.stat.sellVolume")} value={fmtQty(stats.sellVolume)} />
      <Tile label={t("market.stat.buyVolume")} value={fmtQty(stats.buyVolume)} />
      <Tile
        label={t("market.stat.spread")}
        value={
          stats.bestSell != null && stats.bestBuy != null
            ? `${fmtIskShort(stats.bestSell - stats.bestBuy)} ISK`
            : "—"
        }
      />
      <Tile label={t("market.stat.jumps")} value={jumpsValue} sub={jumpsSub} />
    </div>
  );
}
