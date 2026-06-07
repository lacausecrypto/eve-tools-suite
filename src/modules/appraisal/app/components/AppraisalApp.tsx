import { useMemo, useState } from "react";
import { Check, Copy, Coins, Loader2, Receipt, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { isTauri } from "@/core/runtime";
import { useT } from "@/core/i18n";
import { appraise, HUBS, type AppraisalResult } from "../api";
import { useAppraisal, type SavedAppraisal } from "../store";
import { computeTotals, hubTotals, lineValue, pricedLines, summaryText, unitPrice, type Basis } from "../lib/compute";
import { fmtIsk, fmtIskFull, fmtQty, fmtVol } from "../lib/format";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: AppraisalResult };

export function AppraisalApp() {
  const t = useT();
  const { text, hubId, vwap, basis, saved, setText, setHub, setVwap, setBasis, saveAppraisal, removeSaved } =
    useAppraisal();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  async function run(input = text) {
    if (!input.trim()) return;
    setStatus({ kind: "loading" });
    try {
      const result = await appraise(input, vwap);
      setStatus({ kind: "done", result });
    } catch (e) {
      setStatus({
        kind: "error",
        message: isTauri()
          ? e instanceof Error
            ? e.message
            : String(e)
          : t("appraisal.error.desktopOnly"),
      });
    }
  }

  const detail = useMemo(() => {
    if (status.kind !== "done") return null;
    const q = status.result.quotes[hubId] ?? {};
    const lines = pricedLines(status.result.items, q);
    return { lines, totals: computeTotals(lines) };
  }, [status, hubId]);

  function save() {
    if (status.kind !== "done" || !detail) return;
    const t = detail.totals;
    saveAppraisal({
      name: `${t.lines} types · ${fmtIsk(t.split)}`,
      hubId,
      text,
      units: t.units,
      lines: t.lines,
      buy: t.buy,
      sell: t.sell,
      volume: t.volume,
    });
  }

  async function copy() {
    if (status.kind !== "done" || !detail) return;
    const tot = detail.totals;
    const header = t("appraisal.summary.header", {
      hub: t("appraisal.hub." + hubId),
      lines: tot.lines,
      units: tot.units,
      volume: Math.round(tot.volume),
    });
    const totals = t("appraisal.summary.totals", {
      buy: Math.round(tot.buy),
      sell: Math.round(tot.sell),
      split: Math.round(tot.split),
      eiv: Math.round(tot.eiv),
    });
    try {
      await navigator.clipboard.writeText(summaryText(detail.lines, { header, totals }));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* presse-papier indisponible */
    }
  }

  function reload(s: SavedAppraisal) {
    setText(s.text);
    setHub(s.hubId);
    void run(s.text);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Saisie */}
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card/40 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Receipt className="h-4 w-4" /> {t("appraisal.input.title")}
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("appraisal.input.placeholder")}
              className="h-56 resize-none font-mono text-xs"
              spellCheck={false}
            />
            <label className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {t("appraisal.vwap.label")} <span className="text-muted-foreground/70">{t("appraisal.vwap.hint")}</span>
              </span>
              <Switch checked={vwap} onCheckedChange={setVwap} />
            </label>
            <Button onClick={() => run()} disabled={!text.trim() || status.kind === "loading"} className="mt-2 w-full">
              {status.kind === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("appraisal.run")}
            </Button>
          </div>

          {saved.length > 0 && (
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <div className="mb-2 text-sm font-semibold">{t("appraisal.saved.title")}</div>
              <div className="space-y-1.5">
                {saved.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-sm">
                    <button onClick={() => reload(s)} className="min-w-0 flex-1 truncate text-left hover:underline">
                      <span className="font-medium">{s.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {t("appraisal.hub." + s.hubId)} · {fmtVol(s.volume)}
                      </span>
                    </button>
                    <button onClick={() => removeSaved(s.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Résultats */}
        <div>
          {status.kind === "idle" && <Intro />}
          {status.kind === "loading" && (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("appraisal.loading")}
            </div>
          )}
          {status.kind === "error" && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">
              {status.message}
            </div>
          )}
          {status.kind === "done" && detail && (
            <Results
              result={status.result}
              detailHub={hubId}
              setHub={setHub}
              detailLines={detail.lines}
              detailTotals={detail.totals}
              basis={basis}
              setBasis={setBasis}
              onSave={save}
              onCopy={copy}
              copied={copied}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Results({
  result,
  detailHub,
  setHub,
  detailLines,
  detailTotals,
  basis,
  setBasis,
  onSave,
  onCopy,
  copied,
}: {
  result: AppraisalResult;
  detailHub: string;
  setHub: (id: string) => void;
  detailLines: ReturnType<typeof pricedLines>;
  detailTotals: ReturnType<typeof computeTotals>;
  basis: Basis;
  setBasis: (b: Basis) => void;
  onSave: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const t = useT();
  const { items, unresolved, quotes } = result;
  const hubLabel = (id: string) => t("appraisal.hub." + id);

  const hubData = useMemo(
    () => HUBS.map((h) => ({ hub: h, ...hubTotals(items, quotes[h.id] ?? {}) })),
    [items, quotes],
  );
  const bestSell = hubData.reduce((a, b) => (b.sell > a.sell ? b : a), hubData[0]);
  const buyable = hubData.filter((d) => d.buy > 0);
  const cheapBuy = buyable.length ? buyable.reduce((a, b) => (b.buy < a.buy ? b : a)) : null;

  const sorted = useMemo(
    () => detailLines.slice().sort((a, b) => lineValue(b, basis) - lineValue(a, basis)),
    [detailLines, basis],
  );
  const totalForBasis = basis === "buy" ? detailTotals.buy : basis === "sell" ? detailTotals.sell : detailTotals.split;

  return (
    <div className="space-y-4">
      {/* Comparaison des hubs */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("appraisal.hubs.caption")}</span>
          <span>
            {t("appraisal.hubs.summary", {
              lines: fmtQty(detailTotals.lines),
              units: fmtQty(detailTotals.units),
              volume: fmtVol(detailTotals.volume),
              eiv: fmtIsk(detailTotals.eiv),
            })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {hubData.map((d) => {
            const active = d.hub.id === detailHub;
            const isBestSell = d.hub.id === bestSell?.hub.id && d.sell > 0;
            const isCheapBuy = cheapBuy != null && d.hub.id === cheapBuy.hub.id;
            return (
              <button
                key={d.hub.id}
                onClick={() => setHub(d.hub.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors",
                  active ? "border-primary bg-primary/10" : "border-border/70 bg-background/40 hover:bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{hubLabel(d.hub.id).split(" ")[0]}</span>
                  {isBestSell && <Badge variant="success" className="px-1 py-0 text-[9px]">{t("appraisal.badge.sell")}</Badge>}
                  {isCheapBuy && !isBestSell && <Badge variant="muted" className="px-1 py-0 text-[9px]">{t("appraisal.badge.buy")}</Badge>}
                </div>
                <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", d.sell > 0 ? "text-success" : "text-muted-foreground")}>
                  {fmtIsk(d.sell)}
                </div>
                <div className="text-[11px] tabular-nums text-sky-400">{fmtIsk(d.buy)} {t("appraisal.hub.buySuffix")}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPIs du hub sélectionné */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t("appraisal.kpi.sell", { hub: hubLabel(detailHub).split(" ")[0] })} value={`${fmtIsk(detailTotals.sell)} ISK`} accent="text-success" big icon={<Coins className="h-3.5 w-3.5" />} />
        <Kpi label={t("appraisal.kpi.buy")} value={`${fmtIsk(detailTotals.buy)} ISK`} accent="text-sky-400" big />
        <Kpi label={t("appraisal.kpi.split")} value={`${fmtIsk(detailTotals.split)} ISK`} />
        <Kpi label={t("appraisal.kpi.eiv")} value={`${fmtIsk(detailTotals.eiv)} ISK`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("appraisal.copied") : t("appraisal.copy")}
        </Button>
        <Button size="sm" variant="ghost" onClick={onSave}>
          <Save className="h-4 w-4" /> {t("appraisal.save")}
        </Button>
        <div className="ml-auto flex rounded-md border border-border/60 p-0.5 text-xs">
          {(["sell", "buy", "split"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBasis(b)}
              className={cn("rounded px-2 py-0.5", basis === b ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
            >
              {t("appraisal.basis." + b)}
            </button>
          ))}
        </div>
      </div>

      {unresolved.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {t("appraisal.unresolved", {
            n: unresolved.length,
            names: unresolved.slice(0, 8).join(", "),
            more: unresolved.length > 8 ? "…" : "",
          })}
        </div>
      )}

      {/* Détail par ligne */}
      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("appraisal.table.item")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("appraisal.table.qty")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("appraisal.table.unit")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("appraisal.table.total")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("appraisal.table.volume")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("appraisal.table.pct")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((l) => {
              const val = lineValue(l, basis);
              const pct = totalForBasis > 0 ? (val / totalForBasis) * 100 : 0;
              return (
                <tr key={l.typeId} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <img src={typeIconUrl(l.typeId, 32)} alt="" loading="lazy" className="h-5 w-5 rounded" />
                      <span className="truncate">{l.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtQty(l.qty)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtIsk(unitPrice(l, basis))}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{fmtIsk(val)} ISK</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtQty(l.qty * l.volume)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted-foreground/70">
        {t("appraisal.footer", { basis: t("appraisal.basis." + basis), hub: hubLabel(detailHub) })}{" "}
        <span className="font-medium text-foreground">{fmtIskFull(totalForBasis)}</span>{t("appraisal.footer.note")}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  big,
  icon,
}: {
  label: string;
  value: string;
  accent?: string;
  big?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-border/70 bg-background/40 px-3 py-2", big && "ring-1 ring-primary/20")}>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", big ? "text-lg" : "text-base", accent)}>{value}</div>
    </div>
  );
}

/** Rend un texte où les **segments** entre `**…**` deviennent `<strong>`. */
function richText(s: string): React.ReactNode[] {
  return s.split(/\*\*(.+?)\*\*/).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}

function Intro() {
  const t = useT();
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
      <Receipt className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
      <p className="mx-auto max-w-md">{richText(t("appraisal.intro.body"))}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Badge variant="muted">{t("appraisal.intro.tag.allHubs")}</Badge>
        <Badge variant="muted">{t("appraisal.intro.tag.vwap")}</Badge>
        <Badge variant="muted">{t("appraisal.intro.tag.perLine")}</Badge>
      </div>
    </div>
  );
}
