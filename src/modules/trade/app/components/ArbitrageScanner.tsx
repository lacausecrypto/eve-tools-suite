import { useMemo, useRef, useState } from "react";
import { ArrowRightLeft, ExternalLink, Globe2, Route, ShoppingCart, Truck, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { typeIconUrl } from "@/core/images";
import { useMarket } from "@/modules/market/app/store";
import { useTrade } from "../store";
import {
  runAllHubsArbitrage,
  runBulkArbitrage,
  type AllHubsDeal,
  type Progress,
} from "../run";
import type { ScanToken } from "../api";
import { sortArbitrage, type ArbitrageSort } from "../lib/scan";
import type { ArbitrageDeal, SellStrategy } from "../lib/types";
import type { HaulItem } from "../lib/haul";
import { HUBS, HUB_LIST, type HubId } from "../lib/hubs";
import { fmtIsk, fmtPct, fmtQty } from "../lib/format";
import { NumField, ProgressBar } from "./bits";

type Mode = "pair" | "all";

interface Done {
  deals: ArbitrageDeal[];
  multiHub: boolean;
  jumps: number | null;
}

type Status =
  | { kind: "idle" }
  | { kind: "scanning"; progress: Progress }
  | { kind: "done"; done: Done }
  | { kind: "error"; message: string };

const SORTS: { id: ArbitrageSort; labelKey: string }[] = [
  { id: "total", labelKey: "trade.arb.sort.total" },
  { id: "perM3", labelKey: "trade.arb.sort.perM3" },
  { id: "roi", labelKey: "trade.arb.sort.roi" },
];

export function ArbitrageScanner({
  onAddToMultibuy,
  onPlanRoute,
}: {
  onAddToMultibuy: (lines: { name: string; qty: number }[]) => void;
  onPlanRoute: (items: HaulItem[]) => void;
}) {
  const t = useT();
  const { arbSrc, arbDst, strategy, arbSort, station, fees, setArb, setStation } = useTrade();
  const [mode, setMode] = useState<Mode>("all");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const tokenRef = useRef<ScanToken | null>(null);

  const done = status.kind === "done" ? status.done : null;
  const deals = useMemo(
    () => (done ? sortArbitrage([...done.deals], arbSort) : []),
    [done, arbSort],
  );
  const multiHub = !!done?.multiHub;

  const allSelected = deals.length > 0 && deals.every((d) => selected.has(d.typeId));
  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(deals.map((d) => d.typeId)));
  const addSelected = () =>
    onAddToMultibuy(
      deals
        .filter((d) => selected.has(d.typeId))
        .map((d) => ({ name: d.name, qty: Math.max(1, d.feasibleQty) })),
    );

  /** Envoie les deals sélectionnés au planificateur d'itinéraire. */
  const planSelected = () =>
    onPlanRoute(
      deals
        .filter((d) => selected.has(d.typeId))
        .map((d): HaulItem => {
          const a = d as AllHubsDeal;
          const src = multiHub
            ? { id: a.srcHubId, label: a.srcLabel }
            : { id: arbSrc, label: HUBS[arbSrc].label };
          const dst = multiHub
            ? { id: a.dstHubId, label: a.dstLabel }
            : { id: arbDst, label: HUBS[arbDst].label };
          const qty = Math.max(1, d.feasibleQty);
          return {
            typeId: d.typeId,
            name: d.name,
            qty,
            unitVolume: d.packagedVolume,
            buyCost: d.effSrc * qty,
            profit: d.totalNet,
            srcHubId: src.id,
            srcLabel: src.label,
            dstHubId: dst.id,
            dstLabel: dst.label,
          };
        }),
    );

  async function scan() {
    if (mode === "pair" && arbSrc === arbDst) {
      setStatus({ kind: "error", message: t("trade.arb.error.sameHub") });
      return;
    }
    const token: ScanToken = { cancelled: false };
    tokenRef.current = token;
    setSelected(new Set());
    const onProgress = (progress: Progress) => {
      if (!token.cancelled) setStatus({ kind: "scanning", progress });
    };
    setStatus({ kind: "scanning", progress: { label: t("trade.common.start"), frac: 0 } });
    try {
      if (mode === "all") {
        const result = await runAllHubsArbitrage(strategy, arbSort, station, fees, onProgress, token);
        if (token.cancelled) return setStatus({ kind: "idle" });
        setStatus({ kind: "done", done: { deals: result.deals, multiHub: true, jumps: null } });
      } else {
        const result = await runBulkArbitrage(
          HUBS[arbSrc], HUBS[arbDst], strategy, arbSort, station, fees, onProgress, token,
        );
        if (token.cancelled) return setStatus({ kind: "idle" });
        setStatus({ kind: "done", done: { deals: result.deals, multiHub: false, jumps: result.jumps } });
      }
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  function cancel() {
    if (tokenRef.current) tokenRef.current.cancelled = true;
    setStatus({ kind: "idle" });
  }

  const scanning = status.kind === "scanning";

  return (
    <div className="space-y-4">
      {/* Mode */}
      <div className="inline-flex rounded-lg border border-border bg-card/40 p-1">
        <ModeBtn active={mode === "pair"} onClick={() => setMode("pair")} icon={<ArrowRightLeft className="h-4 w-4" />}>
          {t("trade.arb.mode.pair")}
        </ModeBtn>
        <ModeBtn active={mode === "all"} onClick={() => setMode("all")} icon={<Globe2 className="h-4 w-4" />}>
          {t("trade.arb.mode.all")}
        </ModeBtn>
      </div>

      {/* Contrôles */}
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {mode === "pair" && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t("trade.arb.buyAt")}</span>
                <Select value={arbSrc} onValueChange={(v) => setArb({ arbSrc: v as HubId })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HUB_LIST.map((h) => <SelectItem key={h.id} value={h.id}>{h.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t("trade.arb.sellAt")}</span>
                <Select value={arbDst} onValueChange={(v) => setArb({ arbDst: v as HubId })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HUB_LIST.map((h) => <SelectItem key={h.id} value={h.id}>{h.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </label>
            </>
          )}
          <NumField label={t("trade.common.capital")} value={station.budget} onChange={(v) => setStation({ budget: v ?? 0 })} />
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("trade.arb.resale")}</span>
            <Select value={strategy} onValueChange={(v) => setArb({ strategy: v as SellStrategy })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="buyOrders">{t("trade.arb.resale.buyOrders")}</SelectItem>
                <SelectItem value="relist">{t("trade.arb.resale.relist")}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {mode === "all" && (
            <div className="w-full sm:col-span-1">
              <NumField label={t("trade.common.roiMin")} value={station.minMarginPct} onChange={(v) => setStation({ minMarginPct: v ?? 0 })} suffix="%" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!scanning ? (
            <Button onClick={scan}>
              {mode === "all" ? <Globe2 className="h-4 w-4" /> : <ArrowRightLeft className="h-4 w-4" />}
              {mode === "all"
                ? t("trade.arb.scanAll")
                : t("trade.arb.scanPair", { src: HUBS[arbSrc].label, dst: HUBS[arbDst].label })}
            </Button>
          ) : (
            <Button variant="destructive" onClick={cancel}>
              <X className="h-4 w-4" /> {t("trade.common.cancel")}
            </Button>
          )}
          {mode === "pair" && (
            <div className="w-28">
              <NumField label={t("trade.common.roiMin")} value={station.minMarginPct} onChange={(v) => setStation({ minMarginPct: v ?? 0 })} suffix="%" />
            </div>
          )}
          {done && (
            <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
              <span><span className="font-medium text-foreground">{deals.length}</span> {t("trade.common.opportunities")}</span>
              {!multiHub && done.jumps != null && (
                <span className="inline-flex items-center gap-1">
                  <Route className="h-3.5 w-3.5" /> {t("trade.arb.jumps", { n: done.jumps })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {scanning && (
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <ProgressBar frac={status.progress.frac} label={status.progress.label} />
        </div>
      )}

      {status.kind === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {status.message}
        </div>
      )}

      {done && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("trade.arb.sortLabel")}</span>
            <div className="inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setArb({ arbSort: s.id })}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    arbSort === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(s.labelKey)}
                </button>
              ))}
            </div>
            {selected.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" onClick={planSelected}>
                  <Truck className="h-4 w-4" /> {t("trade.arb.planRoute", { n: selected.size })}
                </Button>
                <Button size="sm" variant="secondary" onClick={addSelected}>
                  <ShoppingCart className="h-4 w-4" /> {t("trade.arb.multibuy")}
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border">
            {deals.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("trade.arb.none")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8 px-2">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} title={t("trade.common.toggleAll")} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                    </TableHead>
                    <TableHead className="px-2">{t("trade.common.item")}</TableHead>
                    {multiHub && <TableHead className="px-2">{t("trade.arb.col.route")}</TableHead>}
                    <TableHead className="whitespace-nowrap px-2 text-right">
                      {multiHub ? t("trade.arb.col.buyAvg") : <>{t("trade.arb.col.buyHub", { hub: HUBS[arbSrc].label })} <span className="text-muted-foreground/60">{t("trade.arb.col.avg")}</span></>}
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-2 text-right">
                      {multiHub ? t("trade.arb.col.sellAvg") : <>{t("trade.arb.col.sellHub", { hub: HUBS[arbDst].label })} <span className="text-muted-foreground/60">{t("trade.arb.col.avg")}</span></>}
                    </TableHead>
                    <TableHead className="px-2 text-right">{t("trade.common.netPerUnit")}</TableHead>
                    <TableHead className="px-2 text-right">{t("trade.arb.col.netPerM3")}</TableHead>
                    <TableHead className="px-2 text-right">{t("trade.arb.col.roi")}</TableHead>
                    <TableHead className="px-2 text-right">{t("trade.common.qty")}</TableHead>
                    <TableHead className="px-2 text-right">{t("trade.arb.col.totalProfit")}</TableHead>
                    <TableHead className="w-8 px-2" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deals.map((d) => {
                    const a = d as AllHubsDeal;
                    return (
                      <TableRow key={d.typeId} data-state={selected.has(d.typeId) ? "selected" : undefined}>
                        <TableCell className="px-2">
                          <input type="checkbox" checked={selected.has(d.typeId)} onChange={() => toggle(d.typeId)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                        </TableCell>
                        <TableCell className="px-2">
                          <div className="flex items-center gap-2">
                            <img src={typeIconUrl(d.typeId, 32)} alt="" className="h-6 w-6 rounded" loading="lazy" />
                            <span className="truncate">{d.name}</span>
                          </div>
                        </TableCell>
                        {multiHub && (
                          <TableCell className="whitespace-nowrap px-2 text-xs">
                            <span className="font-medium">{a.srcLabel}</span>
                            <span className="text-muted-foreground"> → </span>
                            <span className="font-medium">{a.dstLabel}</span>
                            {a.jumps != null && (
                              <span className="ml-1 text-muted-foreground/70">{t("trade.arb.rowJumps", { n: a.jumps })}</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="whitespace-nowrap px-2 text-right tabular-nums">{fmtIsk(d.effSrc)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-right tabular-nums">{fmtIsk(d.effDst)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-right tabular-nums text-success">{fmtIsk(d.netPerUnit)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-right tabular-nums">{d.netPerM3 > 0 ? fmtIsk(d.netPerM3) : "—"}</TableCell>
                        <TableCell className="px-2 text-right">
                          <Badge variant={d.roiPct >= 20 ? "success" : "muted"}>{fmtPct(d.roiPct)}</Badge>
                        </TableCell>
                        <TableCell className="px-2 text-right tabular-nums text-muted-foreground">{fmtQty(d.feasibleQty)}</TableCell>
                        <TableCell className="whitespace-nowrap px-2 text-right font-medium tabular-nums text-success">{fmtIsk(d.totalNet)}</TableCell>
                        <TableCell className="px-2">
                          <button
                            title={t("trade.common.openInMarket")}
                            onClick={() => {
                              useMarket.getState().select(d.typeId, d.name);
                              window.location.hash = "/m/market";
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}

      {status.kind === "idle" && (
        <p className="rounded-xl border border-dashed border-border bg-card/30 px-4 py-8 text-center text-sm text-muted-foreground">
          {mode === "all" ? (
            <>
              <strong>{t("trade.arb.idle.allTitle")}</strong>{t("trade.arb.idle.all")}
              <strong>{t("trade.arb.idle.allEachItem")}</strong>{t("trade.arb.idle.allTail")}
            </>
          ) : (
            <>
              {t("trade.arb.idle.pairLead")}<strong>{t("trade.arb.idle.pairWholeMarket")}</strong>
              {t("trade.arb.idle.pairMid")}<strong>{t("trade.arb.idle.pairAll")}</strong>
              {t("trade.arb.idle.pairTail")}
            </>
          )}
        </p>
      )}
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
