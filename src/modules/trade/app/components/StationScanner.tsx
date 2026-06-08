import { useMemo, useRef, useState } from "react";
import { ExternalLink, Radar, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { typeIconUrl } from "@/core/images";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { useMarket } from "@/modules/market/app/store";
import { useTrade } from "../store";
import { runStationScan, type Progress } from "../run";
import type { ScanToken } from "../api";
import type { StationDeal } from "../lib/types";
import { DEFAULT_CAPTURE_PCT } from "../lib/scan";
import { HUBS, HUB_LIST, type HubId } from "../lib/hubs";
import { fmtIsk, fmtPct, fmtQty } from "../lib/format";
import { NumField, ProgressBar } from "./bits";

type Status =
  | { kind: "idle" }
  | { kind: "scanning"; progress: Progress }
  | { kind: "done"; deals: StationDeal[] }
  | { kind: "error"; message: string };

type SortKey = "profit" | "margin" | "isk" | "net";

export function StationScanner({
  onAddToMultibuy,
}: {
  onAddToMultibuy: (lines: { name: string; qty: number }[]) => void;
}) {
  const t = useT();
  const { station, stationHub, fees, setStation, setStationHub } = useTrade();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [sort, setSort] = useState<SortKey>("profit");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const tokenRef = useRef<ScanToken | null>(null);

  async function scan() {
    const token: ScanToken = { cancelled: false };
    tokenRef.current = token;
    setSelected(new Set());
    setStatus({ kind: "scanning", progress: { label: t("trade.common.start"), frac: 0 } });
    try {
      const deals = await runStationScan(
        HUBS[stationHub],
        station,
        fees,
        (progress) => {
          if (!token.cancelled) setStatus({ kind: "scanning", progress });
        },
        token,
      );
      if (token.cancelled) {
        setStatus({ kind: "idle" });
        return;
      }
      setStatus({ kind: "done", deals });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  function cancel() {
    if (tokenRef.current) tokenRef.current.cancelled = true;
    setStatus({ kind: "idle" });
  }

  const sorted = useMemo(() => {
    if (status.kind !== "done") return [];
    const key = (d: StationDeal) =>
      sort === "profit"
        ? d.expectedDailyProfit ?? -1
        : sort === "margin"
          ? d.marginPct
          : sort === "isk"
            ? d.dailyIskVolume ?? -1
            : d.netPerUnit;
    return [...status.deals].sort((a, b) => key(b) - key(a));
  }, [status, sort]);

  const totalProfit = useMemo(
    () => sorted.reduce((s, d) => s + (d.expectedDailyProfit ?? 0), 0),
    [sorted],
  );

  const allSelected = sorted.length > 0 && sorted.every((d) => selected.has(d.typeId));
  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(sorted.map((d) => d.typeId)));
  const addSelected = () => {
    const lines = sorted
      .filter((d) => selected.has(d.typeId))
      .map((d) => ({ name: d.name, qty: Math.max(1, d.perDayQty ?? 0) }));
    onAddToMultibuy(lines);
  };

  const scanning = status.kind === "scanning";

  return (
    <div className="space-y-4">
      {/* Contrôles */}
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-card/40 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{t("trade.common.hub")}</span>
          <Select value={stationHub} onValueChange={(v) => setStationHub(v as HubId)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HUB_LIST.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <NumField
          label={t("trade.common.capital")}
          value={station.budget}
          onChange={(v) => setStation({ budget: v ?? 0 })}
        />
        <NumField
          label={t("trade.station.minMargin")}
          value={station.minMarginPct}
          onChange={(v) => setStation({ minMarginPct: v ?? 0 })}
          suffix="%"
        />
        <NumField
          label={t("trade.station.minPrice")}
          value={station.minPrice}
          onChange={(v) => setStation({ minPrice: v ?? 0 })}
        />
        <NumField
          label={t("trade.station.maxPrice")}
          value={station.maxPrice}
          onChange={(v) => setStation({ maxPrice: v })}
          allowNull
          placeholder="∞"
        />
        <NumField
          label={t("trade.station.minVol")}
          value={station.minSellVol}
          onChange={(v) => setStation({ minSellVol: v ?? 0 })}
        />
        <NumField
          label={t("trade.station.capture")}
          value={station.captureSharePct ?? DEFAULT_CAPTURE_PCT}
          onChange={(v) => setStation({ captureSharePct: Math.min(100, Math.max(0, v ?? 0)) })}
          suffix="%"
          hint={t("trade.station.capture.hint")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {!scanning ? (
          <Button onClick={scan}>
            <Radar className="h-4 w-4" />
            {t("trade.station.scan", { hub: HUBS[stationHub].label })}
          </Button>
        ) : (
          <Button variant="destructive" onClick={cancel}>
            <X className="h-4 w-4" />
            {t("trade.common.cancel")}
          </Button>
        )}
        {status.kind === "done" && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{sorted.length}</span>{t("trade.station.summaryMid")}
            <span className="font-medium text-success">{t("trade.station.iskPerDay", { isk: fmtIsk(totalProfit) })}</span>
          </div>
        )}
        {status.kind === "done" && selected.size > 0 && (
          <Button size="sm" variant="secondary" onClick={addSelected}>
            <ShoppingCart className="h-4 w-4" />
            {t("trade.station.addToMultibuy", { n: selected.size })}
          </Button>
        )}
      </div>

      {scanning && (
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <ProgressBar frac={status.progress.frac} label={status.progress.label} />
          <p className="mt-2 text-xs text-muted-foreground">
            {t("trade.station.scanNote")}
          </p>
        </div>
      )}

      {status.kind === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {status.message}
        </div>
      )}

      {status.kind === "done" && (
        <div className="overflow-hidden rounded-xl border border-border">
          {sorted.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("trade.station.none")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-8 px-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      title={t("trade.common.toggleAll")}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                    />
                  </TableHead>
                  <TableHead className="w-8 px-2">#</TableHead>
                  <TableHead className="px-2">{t("trade.common.item")}</TableHead>
                  <TableHead className="px-2 text-right">{t("trade.station.col.buy")}</TableHead>
                  <TableHead className="px-2 text-right">{t("trade.station.col.sell")}</TableHead>
                  <SortTh k="margin" sort={sort} setSort={setSort} className="text-right">
                    {t("trade.station.col.margin")}
                  </SortTh>
                  <SortTh k="net" sort={sort} setSort={setSort} className="text-right">
                    {t("trade.common.netPerUnit")}
                  </SortTh>
                  <TableHead className="px-2 text-right">{t("trade.station.col.volPerDay")}</TableHead>
                  <SortTh k="isk" sort={sort} setSort={setSort} className="text-right">
                    {t("trade.station.col.iskPerDay")}
                  </SortTh>
                  <TableHead className="px-2 text-right">{t("trade.station.col.qtyPerDay")}</TableHead>
                  <TableHead className="whitespace-nowrap px-2 text-right" title={t("trade.station.col.competitionTitle")}>
                    {t("trade.station.col.competition")}
                  </TableHead>
                  <SortTh k="profit" sort={sort} setSort={setSort} className="text-right">
                    {t("trade.station.col.profitPerDay")}
                  </SortTh>
                  <TableHead className="w-8 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d, i) => (
                  <TableRow key={d.typeId} data-state={selected.has(d.typeId) ? "selected" : undefined}>
                    <TableCell className="px-2">
                      <input
                        type="checkbox"
                        checked={selected.has(d.typeId)}
                        onChange={() => toggle(d.typeId)}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                    </TableCell>
                    <TableCell className="px-2 text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="px-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={typeIconUrl(d.typeId, 32)}
                          alt=""
                          className="h-6 w-6 rounded"
                          loading="lazy"
                        />
                        <span className="truncate">{d.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-right tabular-nums">
                      {fmtIsk(d.bestBuy)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-right tabular-nums">
                      {fmtIsk(d.bestSell)}
                    </TableCell>
                    <TableCell className="px-2 text-right">
                      <Badge variant={d.marginPct >= 20 ? "success" : "muted"}>
                        {fmtPct(d.marginPct)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-right tabular-nums text-success">
                      {fmtIsk(d.netPerUnit)}
                    </TableCell>
                    <TableCell className="px-2 text-right tabular-nums text-muted-foreground">
                      {d.dailyVolume != null ? fmtQty(d.dailyVolume) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-right tabular-nums text-muted-foreground">
                      {d.dailyIskVolume != null ? fmtIsk(d.dailyIskVolume) : "—"}
                    </TableCell>
                    <TableCell className="px-2 text-right tabular-nums">
                      {d.perDayQty != null ? fmtQty(d.perDayQty) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-right text-xs tabular-nums text-muted-foreground">
                      {d.sellers}/{d.buyers}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 text-right font-medium tabular-nums text-success">
                      {d.expectedDailyProfit != null ? fmtIsk(d.expectedDailyProfit) : "—"}
                    </TableCell>
                    <TableCell className="px-2">
                      <OpenInMarket typeId={d.typeId} name={d.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {status.kind === "idle" && (
        <p className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {t("trade.station.idleLead")}<strong>{t("trade.station.idleNetProfit")}</strong>
          {t("trade.station.idleMid")}<strong>{t("trade.station.idleExpected")}</strong>
          {t("trade.station.idleTail")}
        </p>
      )}
    </div>
  );
}

function SortTh({
  k,
  sort,
  setSort,
  className,
  children,
}: {
  k: SortKey;
  sort: SortKey;
  setSort: (k: SortKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TableHead className={cn("whitespace-nowrap px-2", className)}>
      <button
        onClick={() => setSort(k)}
        className={cn("hover:text-foreground", sort === k && "text-foreground underline")}
      >
        {children}
      </button>
    </TableHead>
  );
}

function OpenInMarket({ typeId, name }: { typeId: number; name: string }) {
  const t = useT();
  return (
    <button
      title={t("trade.common.openInMarket")}
      onClick={() => {
        useMarket.getState().select(typeId, name);
        window.location.hash = "/m/market";
      }}
      className="text-muted-foreground hover:text-foreground"
    >
      <ExternalLink className="h-4 w-4" />
    </button>
  );
}
