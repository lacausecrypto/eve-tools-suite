import { useEffect, useMemo, useState } from "react";
import { Coins, Gift, Loader2, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { isTauri } from "@/core/runtime";
import { useT } from "@/core/i18n";
import { loadLpStore, type LpResult } from "../api";
import { LP_CORPS } from "../data/corps";
import { useLp } from "../store";
import { convertWithLp, type PricedOffer } from "../lib/compute";
import { fmtIsk, fmtNum, fmtPerLp } from "../lib/format";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: LpResult };

export function LpApp() {
  const t = useT();
  const { corpId, outBasis, fees, lpBalance, minVolume, profitableOnly, setCorp, setBasis, setFees, setLpBalance, setMinVolume, setProfitableOnly } =
    useLp();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [query, setQuery] = useState(corpId ? LP_CORPS.find((c) => c.id === corpId)?.name ?? "" : "");

  async function load(id: number) {
    setStatus({ kind: "loading" });
    try {
      setStatus({ kind: "done", result: await loadLpStore(id, outBasis, fees) });
    } catch (e) {
      setStatus({
        kind: "error",
        message: isTauri()
          ? e instanceof Error
            ? e.message
            : String(e)
          : t("lp.error.web"),
      });
    }
  }

  // Recharge quand corp/base/frais changent (si une corp est choisie).
  useEffect(() => {
    if (corpId != null) void load(corpId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corpId, outBasis, fees.salesTaxPct, fees.brokerPct]);

  function pickCorp(name: string) {
    setQuery(name);
    const c = LP_CORPS.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (c) setCorp(c.id);
  }

  const filtered = useMemo(() => {
    if (status.kind !== "done") return [];
    return status.result.offers.filter(
      (o) => (!profitableOnly || o.profit > 0) && o.sellVolume >= minVolume && o.outUnit > 0,
    );
  }, [status, profitableOnly, minVolume]);

  return (
    <div data-tour="lp.root" className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      {/* Configuration */}
      <div className="mb-4 rounded-xl border border-border bg-card/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label data-tour="lp.corp" className="block lg:col-span-2">
            <span className="mb-1 block text-xs text-muted-foreground">{t("lp.corp.label")}</span>
            <Input
              value={query}
              onChange={(e) => pickCorp(e.target.value)}
              placeholder={t("lp.corp.placeholder")}
              list="lp-corps"
              spellCheck={false}
            />
            <datalist id="lp-corps">
              {LP_CORPS.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("lp.basis.label")}</span>
            <div data-tour="lp.basis" className="flex h-9 rounded-md border border-border/60 p-0.5 text-xs">
              {(["sell", "buy"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBasis(b)}
                  className={cn("flex-1 rounded", outBasis === b ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {b === "sell" ? t("lp.basis.sell") : t("lp.basis.buy")}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t("lp.lpBalance.label")}</span>
            <Input
              data-tour="lp.balance"
              type="number"
              value={lpBalance || ""}
              onChange={(e) => setLpBalance(Number(e.target.value) || 0)}
              placeholder={t("lp.lpBalance.placeholder")}
            />
          </label>
        </div>

        <div data-tour="lp.fees" className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("lp.tax")}</span>
            <Input type="number" value={fees.salesTaxPct} onChange={(e) => setFees({ salesTaxPct: Number(e.target.value) || 0 })} className="h-7 w-16" />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("lp.broker")}</span>
            <Input type="number" value={fees.brokerPct} onChange={(e) => setFees({ brokerPct: Number(e.target.value) || 0 })} className="h-7 w-16" />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t("lp.minVolume")}</span>
            <Input type="number" value={minVolume || ""} onChange={(e) => setMinVolume(Number(e.target.value) || 0)} className="h-7 w-24" placeholder="0" />
          </label>
          <label className="flex items-center gap-1.5">
            <Switch checked={profitableOnly} onCheckedChange={setProfitableOnly} />
            <span className="text-muted-foreground">{t("lp.profitableOnly")}</span>
          </label>
        </div>
      </div>

      {status.kind === "idle" && <Intro />}
      {status.kind === "loading" && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("lp.loading")}
        </div>
      )}
      {status.kind === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">{status.message}</div>
      )}
      {status.kind === "done" && <Table offers={filtered} lpBalance={lpBalance} unpriced={status.result.unpriced} />}
    </div>
  );
}

function Table({ offers, lpBalance, unpriced }: { offers: PricedOffer[]; lpBalance: number; unpriced: number }) {
  const t = useT();
  if (offers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
        {t("lp.empty.filters")}
      </div>
    );
  }
  const best = offers[0];
  const avg = offers.reduce((s, o) => s + o.iskPerLp, 0) / offers.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t("lp.kpi.bestPerLp")} value={fmtPerLp(best.iskPerLp)} accent="text-success" big icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <Kpi label={t("lp.kpi.avgPerLp")} value={fmtPerLp(avg)} />
        <Kpi label={t("lp.kpi.profitableOffers")} value={fmtNum(offers.length)} icon={<Gift className="h-3.5 w-3.5" />} />
        {lpBalance > 0 ? (
          <Kpi label={t("lp.kpi.profitForLp", { lp: fmtNum(lpBalance) })} value={fmtIsk(convertWithLp(best, lpBalance).profit)} accent="text-success" icon={<Coins className="h-3.5 w-3.5" />} />
        ) : (
          <Kpi label={t("lp.kpi.tip")} value={t("lp.kpi.tipValue")} />
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("lp.col.offer")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("lp.col.lp")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("lp.col.isk")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("lp.col.profit")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("lp.col.iskPerLp")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("lp.col.volume")}</th>
              {lpBalance > 0 && <th className="px-3 py-2 text-right font-medium">{t("lp.col.forYourLp")}</th>}
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => {
              const plan = lpBalance > 0 ? convertWithLp(o, lpBalance) : null;
              return (
                <tr key={o.offerId} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <img src={typeIconUrl(o.typeId, 32)} alt="" loading="lazy" className="h-5 w-5 rounded" />
                      <span className="truncate">
                        {o.quantity > 1 && <span className="text-muted-foreground">{o.quantity}× </span>}
                        {o.name}
                      </span>
                      {o.required.length > 0 && (
                        <span className="text-[10px] text-muted-foreground" title={o.required.map((r) => `${r.qty}× ${r.name}`).join(", ")}>
                          {t("lp.required", { n: o.required.length })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtNum(o.lpCost)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtIsk(o.cost)}</td>
                  <td className={cn("px-3 py-1.5 text-right tabular-nums", o.profit >= 0 ? "text-foreground" : "text-destructive")}>{fmtIsk(o.profit)}</td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-success">{fmtPerLp(o.iskPerLp)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtNum(o.sellVolume)}</td>
                  {lpBalance > 0 && (
                    <td className="px-3 py-1.5 text-right tabular-nums text-success">
                      {plan && plan.runs > 0 ? `${plan.runs}× · ${fmtIsk(plan.profit)}` : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-muted-foreground/70">
        {t("lp.footnote")}
        {unpriced > 0 && t("lp.footnote.unpriced", { n: unpriced })}
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
    <div className={cn("rounded-lg border border-border/70 bg-background/40 px-3 py-2", big && "ring-1 ring-success/20")}>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", big ? "text-lg" : "text-base", accent)}>{value}</div>
    </div>
  );
}

function Intro() {
  const t = useT();
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
      <Gift className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
      <p className="mx-auto max-w-md">
        {t("lp.intro.lead.choose")}<strong>{t("lp.intro.lead.corp")}</strong>{t("lp.intro.lead.andGet")}
        <strong>{t("lp.intro.lead.iskPerLp")}</strong>{t("lp.intro.lead.tail")}
      </p>
    </div>
  );
}
