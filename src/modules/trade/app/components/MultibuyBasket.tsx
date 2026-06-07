import { useRef, useState } from "react";
import { Copy, ExternalLink, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { typeIconUrl } from "@/core/images";
import { toast } from "@/core/toast";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { useMarket } from "@/modules/market/app/store";
import { useTrade } from "../store";
import {
  runBasketCompare,
  runMultibuy,
  type BasketResult,
  type HubComparison,
  type Progress,
} from "../run";
import type { ScanToken } from "../api";
import { parseMultibuy } from "../lib/multibuy";
import { HUBS, HUB_LIST, type HubId } from "../lib/hubs";
import { fmtIsk, fmtIskFull, fmtQty } from "../lib/format";
import { ProgressBar } from "./bits";

type Status =
  | { kind: "idle" }
  | { kind: "scanning"; progress: Progress }
  | { kind: "done"; result: BasketResult; compare: HubComparison[] | null }
  | { kind: "error"; message: string };

export function MultibuyBasket() {
  const t = useT();
  const { mbHub, mbText, mbCompare, fees, setMb } = useTrade();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const tokenRef = useRef<ScanToken | null>(null);

  async function evaluate() {
    const basket = parseMultibuy(mbText);
    if (!basket.length) {
      setStatus({ kind: "error", message: t("trade.mb.error.empty") });
      return;
    }
    const token: ScanToken = { cancelled: false };
    tokenRef.current = token;
    setStatus({ kind: "scanning", progress: { label: t("trade.common.start"), frac: 0 } });
    try {
      const result = await runMultibuy(
        HUBS[mbHub],
        basket,
        fees,
        (p) => !token.cancelled && setStatus({ kind: "scanning", progress: p }),
        token,
      );
      if (token.cancelled) return setStatus({ kind: "idle" });
      let compare: HubComparison[] | null = null;
      if (mbCompare) {
        compare = await runBasketCompare(
          HUB_LIST,
          basket,
          (p) => !token.cancelled && setStatus({ kind: "scanning", progress: p }),
          token,
        );
        if (token.cancelled) return setStatus({ kind: "idle" });
      }
      setStatus({ kind: "done", result, compare });
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }

  function cancel() {
    if (tokenRef.current) tokenRef.current.cancelled = true;
    setStatus({ kind: "idle" });
  }

  async function copyMultibuy() {
    if (status.kind !== "done") return;
    const text = status.result.lines.map((l) => `${l.name}\t${l.qty}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("trade.mb.toast.copiedTitle"), t("trade.mb.toast.copiedBody"));
    } catch {
      toast.error(t("trade.mb.toast.copyFail"));
    }
  }

  const scanning = status.kind === "scanning";

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      {/* Saisie */}
      <div className="space-y-3">
        <Textarea
          value={mbText}
          onChange={(e) => setMb({ mbText: e.target.value })}
          placeholder={t("trade.mb.placeholder")}
          spellCheck={false}
          className="min-h-[14rem] font-mono text-xs"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("trade.common.hub")}</span>
            <Select value={mbHub} onValueChange={(v) => setMb({ mbHub: v as HubId })}>
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
          <label className="flex cursor-pointer items-end gap-2 pb-2 text-xs">
            <input
              type="checkbox"
              checked={mbCompare}
              onChange={(e) => setMb({ mbCompare: e.target.checked })}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            {t("trade.mb.compare5")}
          </label>
        </div>
        {!scanning ? (
          <Button onClick={evaluate} className="w-full">
            <ShoppingCart className="h-4 w-4" />
            {t("trade.mb.evaluate")}
          </Button>
        ) : (
          <Button variant="destructive" onClick={cancel} className="w-full">
            <X className="h-4 w-4" />
            {t("trade.common.cancel")}
          </Button>
        )}
        {scanning && <ProgressBar frac={status.progress.frac} label={status.progress.label} />}
        {status.kind === "error" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {status.message}
          </div>
        )}
        <p className="text-[11px] leading-snug text-muted-foreground/80">
          {t("trade.mb.helper")}
        </p>
      </div>

      {/* Résultats */}
      <div className="space-y-4">
        {status.kind === "done" ? (
          <Results result={status.result} compare={status.compare} onCopy={copyMultibuy} />
        ) : (
          <div className="flex h-full min-h-[14rem] items-center justify-center rounded-xl border border-dashed border-border bg-card/30 px-6 text-center text-sm text-muted-foreground">
            {t("trade.mb.empty")}
          </div>
        )}
      </div>
    </div>
  );
}

function Results({
  result,
  compare,
  onCopy,
}: {
  result: BasketResult;
  compare: HubComparison[] | null;
  onCopy: () => void;
}) {
  const t = useT();
  const profit = result.totalSell - result.totalBuy;
  return (
    <>
      {/* Totaux */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label={t("trade.mb.tile.buy", { hub: result.hub.label })} value={`${fmtIsk(result.totalBuy)} ISK`} accent="text-foreground" />
        <Tile label={t("trade.mb.tile.netResale")} value={`${fmtIsk(result.totalSell)} ISK`} accent="text-success" />
        <Tile
          label={t("trade.mb.tile.spread")}
          value={`${fmtIsk(profit)} ISK`}
          accent={profit >= 0 ? "text-success" : "text-destructive"}
        />
        <Tile label={t("trade.mb.tile.volume")} value={`${fmtQty(result.totalVolume)} m³`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {t("trade.mb.copy")}
        </Button>
        {result.unresolved.length > 0 && (
          <span className="text-xs text-amber-400">
            {t("trade.mb.unresolved", { n: result.unresolved.length })}{result.unresolved.slice(0, 5).join(", ")}
            {result.unresolved.length > 5 ? "…" : ""}
          </span>
        )}
      </div>

      {compare && compare.length > 0 && <ComparePanel compare={compare} />}

      {/* Lignes */}
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-2">{t("trade.common.item")}</TableHead>
              <TableHead className="px-2 text-right">{t("trade.common.qty")}</TableHead>
              <TableHead className="px-2 text-right">{t("trade.mb.col.buyUnit")}</TableHead>
              <TableHead className="px-2 text-right">{t("trade.mb.col.buyTotal")}</TableHead>
              <TableHead className="px-2 text-right">{t("trade.mb.col.resaleUnit")}</TableHead>
              <TableHead className="px-2 text-right">{t("trade.mb.col.netResale")}</TableHead>
              <TableHead className="px-2 text-right">m³</TableHead>
              <TableHead className="w-8 px-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.lines.map((l) => (
              <TableRow key={l.typeId}>
                <TableCell className="px-2">
                  <div className="flex items-center gap-2">
                    <img src={typeIconUrl(l.typeId, 32)} alt="" className="h-6 w-6 rounded" loading="lazy" />
                    <span className="truncate">{l.name}</span>
                  </div>
                </TableCell>
                <TableCell className="px-2 text-right tabular-nums">{fmtQty(l.qty)}</TableCell>
                <TableCell className="whitespace-nowrap px-2 text-right tabular-nums text-muted-foreground">
                  {l.sellMin != null ? fmtIsk(l.sellMin) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 text-right tabular-nums">
                  {l.buyCost != null ? fmtIskFull(l.buyCost) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 text-right tabular-nums text-muted-foreground">
                  {l.buyMax != null ? fmtIsk(l.buyMax) : "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap px-2 text-right tabular-nums text-success">
                  {l.sellValue != null ? fmtIsk(l.sellValue) : "—"}
                </TableCell>
                <TableCell className="px-2 text-right tabular-nums text-muted-foreground">
                  {fmtQty(l.volume)}
                </TableCell>
                <TableCell className="px-2">
                  <button
                    title={t("trade.common.openInMarket")}
                    onClick={() => {
                      useMarket.getState().select(l.typeId, l.name);
                      window.location.hash = "/m/market";
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function ComparePanel({ compare }: { compare: HubComparison[] }) {
  const t = useT();
  const best = compare[0]?.totalBuy ?? 0;
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {t("trade.mb.compareTitle")}
      </div>
      <div className="flex flex-wrap gap-2">
        {compare.map((c, i) => (
          <div
            key={c.hubId}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              i === 0 ? "border-success/50 bg-success/10" : "border-border/60 bg-background/40",
            )}
          >
            <span className="font-medium">{c.label}</span>{" "}
            <span className="tabular-nums">{fmtIsk(c.totalBuy)} ISK</span>
            {i === 0 ? (
              <Badge variant="success" className="ml-2">
                {t("trade.mb.best")}
              </Badge>
            ) : best > 0 ? (
              <span className="ml-2 text-xs text-muted-foreground">
                +{fmtIsk(c.totalBuy - best)}
              </span>
            ) : null}
            {c.missing > 0 && (
              <span className="ml-2 text-xs text-amber-400">{t("trade.mb.missing", { n: c.missing })}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("font-semibold tabular-nums", accent)}>{value}</div>
    </div>
  );
}
