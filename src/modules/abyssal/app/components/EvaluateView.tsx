import { useState } from "react";
import { Loader2, Save, Sparkles, Store, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { isTauri } from "@/core/runtime";
import { useT } from "@/core/i18n";
import { AbyssalError, evaluateLink, type EvalResult } from "../api";
import { qualityLabel } from "../lib/score";
import { fmtIsk, fmtPct, fmtVal } from "../lib/format";
import { useAbyssal, type SavedRoll } from "../store";
import type { AttrScore } from "../lib/types";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: EvalResult };

export function EvaluateView() {
  const t = useT();
  const { saved, saveRoll, removeRoll } = useAbyssal();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function run() {
    if (!text.trim()) return;
    setStatus({ kind: "loading" });
    try {
      const result = await evaluateLink(text);
      setStatus({ kind: "done", result });
    } catch (e) {
      const message = isTauri()
        ? e instanceof Error
          ? e.message
          : String(e)
        : e instanceof AbyssalError
          ? e.message
          : t("abyssal.error.devUnavailable");
      setStatus({ kind: "error", message });
    }
  }

  function save() {
    if (status.kind !== "done") return;
    const r = status.result;
    saveRoll({
      resultName: r.resultName,
      baseName: r.baseName,
      mutatorName: r.mutatorName,
      resultTypeId: r.score.resultTypeId,
      overall: r.score.overall,
      basePrice: r.basePrice,
      mutatorPrice: r.mutatorPrice,
      estimatedValue: r.market?.estimatedValue ?? null,
      attrs: r.score.attrs,
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Zap className="h-4 w-4" /> {t("abyssal.eval.linkTitle")}
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("abyssal.eval.placeholder")}
            className="h-20 resize-none font-mono text-xs"
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={run} disabled={!text.trim() || status.kind === "loading"}>
              {status.kind === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("abyssal.eval.run")}
            </Button>
            {status.kind === "done" && (
              <Button size="sm" variant="ghost" onClick={save}>
                <Save className="h-4 w-4" /> {t("abyssal.eval.save")}
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground/70">{t("abyssal.eval.tip")}</span>
          </div>
        </div>

        {status.kind === "error" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm text-destructive">
            {status.message}
          </div>
        )}

        {status.kind === "done" && <Result r={status.result} />}
      </div>

      {/* Historique */}
      <div>
        {saved.length > 0 ? (
          <div className="rounded-xl border border-border bg-card/40 p-3">
            <div className="mb-2 text-sm font-semibold">{t("abyssal.eval.savedTitle")}</div>
            <div className="space-y-1.5">
              {saved.map((s) => (
                <SavedRow key={s.id} s={s} onRemove={() => removeRoll(s.id)} />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/30 p-4 text-xs text-muted-foreground">
            {t("abyssal.eval.savedEmpty")}
          </div>
        )}
      </div>
    </div>
  );
}

function Result({ r }: { r: EvalResult }) {
  const t = useT();
  const q = qualityLabel(r.score.overall);
  const rollCost = r.basePrice + r.mutatorPrice;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card/40 p-4">
        <img src={typeIconUrl(r.score.resultTypeId, 64)} alt="" className="h-14 w-14 rounded-lg border border-border/60" />
        <div className="min-w-0">
          <div className="font-semibold">{r.resultName}</div>
          <div className="text-xs text-muted-foreground">
            {r.baseName} · {r.mutatorName}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("abyssal.result.quality")}</div>
          <div className={cn("text-2xl font-bold tabular-nums", q.tone)}>{(r.score.overall * 100).toFixed(0)} %</div>
          <Badge variant="muted">{t("abyssal.quality." + q.code)}</Badge>
        </div>
      </div>

      {/* Estimation de revente MutaMarket */}
      <MarketCard r={r} rollCost={rollCost} />

      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="mb-3 text-sm font-semibold">{t("abyssal.result.mutedAttrs")}</div>
        <div className="space-y-3">
          {r.score.attrs.map((a) => (
            <AttrRow key={a.attrId} a={a} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Ref label={t("abyssal.ref.base")} value={`${fmtIsk(r.basePrice)} ISK`} />
        <Ref label={t("abyssal.ref.mutaplasmid")} value={`${fmtIsk(r.mutatorPrice)} ISK`} />
        <Ref label={t("abyssal.ref.rollCost")} value={`${fmtIsk(rollCost)} ISK`} accent="text-amber-300" />
      </div>
    </div>
  );
}

function MarketCard({ r, rollCost }: { r: EvalResult; rollCost: number }) {
  const t = useT();
  const m = r.market;
  if (!m) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Store className="h-4 w-4" /> {t("abyssal.market.resaleTitle")}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("abyssal.market.noEstimate")}
          <span className="font-medium text-foreground">{t("abyssal.market.bareModule", { n: fmtIsk(r.basePrice) })}</span>
          {t("abyssal.market.bareModuleSuffix")}
        </p>
        <a
          href={`https://mutamarket.com/modules/${r.itemId}`}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-block rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
        >
          {t("abyssal.market.appraise")}
        </a>
      </div>
    );
  }
  const margin = m.estimatedValue - rollCost;
  const href = `https://mutamarket.com/modules/${m.slug ?? r.itemId}`;
  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Store className="h-4 w-4 text-success" /> {t("abyssal.market.resaleEstTitle")}
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums text-success">{fmtIsk(m.estimatedValue)} ISK</div>
          <div className="text-[11px] text-muted-foreground">
            {r.estimator
              ? t("abyssal.market.confidence", { pct: r.estimator.nmae.toFixed(0), n: r.estimator.count.toLocaleString("fr-FR") })
              : t("abyssal.market.estHistorical")}
            {m.updatedAt && t("abyssal.market.updated", { date: new Date(m.updatedAt).toLocaleDateString("fr-FR") })}
          </div>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-3 text-right">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("abyssal.market.marginVsRoll")}</div>
            <div className={cn("font-semibold tabular-nums", margin >= 0 ? "text-success" : "text-destructive")}>{fmtIsk(margin)} ISK</div>
          </div>
          {m.contractPrice != null && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("abyssal.market.onSale")}</div>
              <div className="font-semibold tabular-nums text-amber-300">{fmtIsk(m.contractPrice)} ISK</div>
            </div>
          )}
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2 inline-block text-xs text-primary hover:underline"
      >
        {t("abyssal.market.viewOn")}
      </a>
    </div>
  );
}

function AttrRow({ a }: { a: AttrScore }) {
  const t = useT();
  const tone = a.quality >= 0.7 ? "bg-success" : a.quality >= 0.4 ? "bg-amber-500" : "bg-destructive";
  const good = a.pctVsBase > 0 === a.high; // amélioration vs base ?
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{a.name}</span>
        <span className="flex items-center gap-2 text-xs">
          <span className="tabular-nums">{fmtVal(a.rolled)}</span>
          <span className={cn("tabular-nums", good ? "text-success" : "text-destructive")}>{fmtPct(a.pctVsBase)}</span>
          <span className="w-10 text-right font-semibold tabular-nums">{(a.quality * 100).toFixed(0)}%</span>
        </span>
      </div>
      {/* Piste : extrémité gauche = pire, droite = meilleure (orientée). */}
      <div className="relative h-2 overflow-hidden rounded-full bg-muted/40">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${a.quality * 100}%` }} />
        <div className="absolute inset-y-0 w-px bg-foreground/40" style={{ left: `${a.quality * 100}%` }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{t("abyssal.attr.worst", { n: fmtVal(a.high ? a.min : a.max) })}</span>
        <span>{t("abyssal.attr.base", { n: fmtVal(a.base) })}</span>
        <span>{t("abyssal.attr.best", { n: fmtVal(a.high ? a.max : a.min) })}</span>
      </div>
    </div>
  );
}

function Ref({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", accent)}>{value}</div>
    </div>
  );
}

function SavedRow({ s, onRemove }: { s: SavedRoll; onRemove: () => void }) {
  const q = qualityLabel(s.overall);
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1.5 text-sm">
      <img src={typeIconUrl(s.resultTypeId, 32)} alt="" className="h-6 w-6 shrink-0 rounded" />
      <div className="min-w-0 flex-1 truncate">
        <span className="font-medium">{s.resultName}</span>
        <span className="block text-[11px] text-muted-foreground">
          {s.estimatedValue != null ? `${fmtIsk(s.estimatedValue)} ISK` : s.mutatorName}
        </span>
      </div>
      <span className={cn("shrink-0 text-sm font-semibold tabular-nums", q.tone)}>{(s.overall * 100).toFixed(0)}%</span>
      <button onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
