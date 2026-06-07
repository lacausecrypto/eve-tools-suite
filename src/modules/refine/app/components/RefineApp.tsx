import { useMemo, useState } from "react";
import { Boxes, Factory, Loader2, Package, Recycle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { typeIconUrl } from "@/core/images";
import { isTauri } from "@/core/runtime";
import { useT } from "@/core/i18n";
import { loadQuotes, type Quote } from "../api";
import { useRefine, type MatBasis } from "../store";
import { CORE_MINERALS, MATERIALS, ORES } from "../data/ore";
import { effectiveRate, materialsValue, reprocessAll, totalVolume, type RefineItem } from "../lib/refine";
import { buildCandidates, solveCompression, type CompressionPlan } from "../lib/compress";
import { parseOre } from "../lib/parse";
import { fmtIsk, fmtNum, fmtPct, fmtVol } from "../lib/format";

const ORE_BY_NAME = new Map(ORES.map((o) => [o.name.toLowerCase(), o]));
const RATE_PRESETS = [
  { id: "npc", v: 50 },
  { id: "athanor", v: 52 },
  { id: "tatara", v: 56 },
];

interface RepResult {
  materials: Map<number, number>;
  matValue: Map<number, number>;
  unmatched: string[];
  rawValue: number;
  refinedValue: number;
  volume: number;
  rate: number;
}
interface CompResult {
  plan: CompressionPlan;
  rate: number;
}
type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "rep"; r: RepResult }
  | { kind: "comp"; r: CompResult };

export function RefineApp() {
  const t = useT();
  const s = useRefine();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const rate = effectiveRate(s.baseRatePct, s.skills);
  const priceOf = (q: Map<number, Quote>, basis: MatBasis) => (id: number) => {
    const v = q.get(id);
    return v ? (basis === "buy" ? v.buy : v.sell) : 0;
  };

  function fail(e: unknown) {
    setStatus({
      kind: "error",
      message: isTauri()
        ? e instanceof Error ? e.message : String(e)
        : t("refine.error.web"),
    });
  }

  async function runReprocess() {
    const parsed = parseOre(s.text);
    if (!parsed.length) return;
    const items: RefineItem[] = [];
    const unmatched: string[] = [];
    for (const p of parsed) {
      const ore = ORE_BY_NAME.get(p.name.toLowerCase());
      if (ore) items.push({ ore, qty: p.qty });
      else unmatched.push(p.name);
    }
    if (!items.length) {
      setStatus({ kind: "rep", r: { materials: new Map(), matValue: new Map(), unmatched, rawValue: 0, refinedValue: 0, volume: 0, rate } });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const oreIds = items.map((i) => i.ore.id);
      const matIds = [...new Set(items.flatMap((i) => i.ore.mats.map((m) => m.m)))];
      const q = await loadQuotes([...oreIds, ...matIds]);
      const price = priceOf(q, s.matBasis);
      const materials = reprocessAll(items, rate);
      const matValue = new Map([...materials].map(([mid, q]) => [mid, q * price(mid)]));
      const rawValue = items.reduce((sum, i) => sum + i.qty * price(i.ore.id), 0);
      const refinedValue = materialsValue(materials, price);
      setStatus({ kind: "rep", r: { materials, matValue, unmatched, rawValue, refinedValue, volume: totalVolume(items), rate } });
    } catch (e) {
      fail(e);
    }
  }

  async function runCompress() {
    const targets = new Map<number, number>();
    for (const [k, v] of Object.entries(s.targets)) if (v > 0) targets.set(Number(k), v);
    if (!targets.size) return;
    setStatus({ kind: "loading" });
    try {
      const pool = (s.compressedOnly ? ORES.filter((o) => o.compressed) : ORES).filter((o) =>
        o.mats.some((m) => targets.has(m.m)),
      );
      const q = await loadQuotes([...pool.map((o) => o.id), ...targets.keys()]);
      const cost = (id: number) => q.get(id)?.sell ?? 0;
      const price = priceOf(q, s.matBasis);
      const candidates = buildCandidates(pool, rate, cost);
      const plan = solveCompression(targets, candidates, price);
      setStatus({ kind: "comp", r: { plan, rate } });
    } catch (e) {
      fail(e);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      {/* Onglets */}
      <div className="mb-4 flex rounded-lg border border-border bg-card/40 p-1">
        <Tab active={s.mode === "reprocess"} onClick={() => s.setMode("reprocess")} icon={<Recycle className="h-4 w-4" />}>
          {t("refine.tab.reprocess")}
        </Tab>
        <Tab active={s.mode === "compress"} onClick={() => s.setMode("compress")} icon={<Package className="h-4 w-4" />}>
          {t("refine.tab.compress")}
        </Tab>
      </div>

      {/* Configuration partagée */}
      <ConfigCard rate={rate} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div>
          {s.mode === "reprocess" ? (
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <Boxes className="h-4 w-4" /> {t("refine.reprocess.title")}
              </div>
              <Textarea
                value={s.text}
                onChange={(e) => s.setText(e.target.value)}
                placeholder={t("refine.reprocess.placeholder")}
                className="h-56 resize-none font-mono text-xs"
                spellCheck={false}
              />
              <Button onClick={runReprocess} disabled={!s.text.trim() || status.kind === "loading"} className="mt-2 w-full">
                {status.kind === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t("refine.reprocess.run")}
              </Button>
            </div>
          ) : (
            <TargetCard onSolve={runCompress} loading={status.kind === "loading"} />
          )}
        </div>

        <div>
          {status.kind === "idle" && <Intro mode={s.mode} />}
          {status.kind === "loading" && (
            <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("refine.status.loading")}
            </div>
          )}
          {status.kind === "error" && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-6 text-sm text-destructive">{status.message}</div>
          )}
          {status.kind === "rep" && <RepView r={status.r} basis={s.matBasis} />}
          {status.kind === "comp" && <CompView r={status.r} />}
        </div>
      </div>
    </div>
  );
}

function ConfigCard({ rate }: { rate: number }) {
  const t = useT();
  const s = useRefine();
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="mb-1 block text-xs text-muted-foreground">{t("refine.config.baseRate")}</span>
          <div className="flex items-center gap-1">
            <Input type="number" value={s.baseRatePct} onChange={(e) => s.setBaseRate(Number(e.target.value) || 0)} className="h-8 w-20" />
            <span className="text-xs text-muted-foreground">%</span>
            <div className="ml-1 flex gap-1">
              {RATE_PRESETS.map((p) => (
                <button key={p.id} onClick={() => s.setBaseRate(p.v)} className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] hover:bg-muted/40" title={`${p.v}%`}>
                  {t("refine.preset." + p.id)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <SkillField label={t("refine.skill.reprocessing")} value={s.skills.reprocessing} onChange={(v) => s.setSkills({ reprocessing: v })} />
        <SkillField label={t("refine.skill.efficiency")} value={s.skills.efficiency} onChange={(v) => s.setSkills({ efficiency: v })} />
        <SkillField label={t("refine.skill.oreProcessing")} value={s.skills.oreProcessing} onChange={(v) => s.setSkills({ oreProcessing: v })} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{t("refine.implant")}</span>
          <select
            value={s.skills.implantPct}
            onChange={(e) => s.setSkills({ implantPct: Number(e.target.value) })}
            className="h-7 rounded-md border border-border bg-background px-1.5"
          >
            <option value={0}>{t("refine.implant.none")}</option>
            <option value={1}>RX-801 (+1%)</option>
            <option value={2}>RX-802 (+2%)</option>
            <option value={4}>RX-804 (+4%)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{t("refine.price")}</span>
          <div className="flex rounded-md border border-border/60 p-0.5">
            {(["sell", "buy"] as const).map((b) => (
              <button key={b} onClick={() => s.setMatBasis(b)} className={cn("rounded px-2 py-0.5", s.matBasis === b ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {b === "sell" ? t("refine.price.sell") : t("refine.price.buy")}
              </button>
            ))}
          </div>
        </label>
        <span className="ml-auto rounded-md bg-success/10 px-2 py-1 text-sm font-semibold text-success">
          {t("refine.effectiveRate", { rate: fmtPct(rate) })}
        </span>
      </div>
    </div>
  );
}

function SkillField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const t = useT();
  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {t("refine.skill.level", { n })}
          </option>
        ))}
      </select>
    </div>
  );
}

function TargetCard({ onSolve, loading }: { onSolve: () => void; loading: boolean }) {
  const t = useT();
  const s = useRefine();
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Factory className="h-4 w-4" /> {t("refine.compress.title")}
      </div>
      <div className="space-y-1.5">
        {CORE_MINERALS.map((mid) => (
          <label key={mid} className="flex items-center gap-2">
            <img src={typeIconUrl(mid, 32)} alt="" className="h-5 w-5 rounded" />
            <span className="w-24 text-sm">{MATERIALS[mid]}</span>
            <Input
              type="number"
              value={s.targets[mid] || ""}
              onChange={(e) => s.setTarget(mid, Number(e.target.value) || 0)}
              placeholder="0"
              className="h-8 flex-1"
            />
          </label>
        ))}
      </div>
      <label className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{t("refine.compress.compressedOnly")}</span>
        <Switch checked={s.compressedOnly} onCheckedChange={s.setCompressedOnly} />
      </label>
      <div className="mt-2 flex gap-2">
        <Button onClick={onSolve} disabled={loading} className="flex-1">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {t("refine.compress.solve")}
        </Button>
        <Button variant="ghost" onClick={s.clearTargets}>
          {t("refine.compress.clear")}
        </Button>
      </div>
    </div>
  );
}

function RepView({ r, basis }: { r: RepResult; basis: MatBasis }) {
  const t = useT();
  const mats = useMemo(
    () => [...r.materials.entries()].sort((a, b) => (r.matValue.get(b[0]) ?? 0) - (r.matValue.get(a[0]) ?? 0)),
    [r.materials, r.matValue],
  );
  if (mats.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
        {t("refine.rep.none.title")}
        {r.unmatched.length > 0 && t("refine.rep.none.suffix", { names: r.unmatched.slice(0, 5).join(", ") })}
        {t("refine.rep.none.check")}
      </div>
    );
  }
  const gain = r.refinedValue - r.rawValue;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={t("refine.kpi.refined", { basis: basis === "sell" ? t("refine.kpi.basis.sell") : t("refine.kpi.basis.buy") })} value={`${fmtIsk(r.refinedValue)} ISK`} accent="text-success" big />
        <Kpi label={t("refine.kpi.raw")} value={`${fmtIsk(r.rawValue)} ISK`} />
        <Kpi label={t("refine.kpi.refineVsSell")} value={`${gain >= 0 ? "+" : ""}${fmtIsk(gain)} ISK`} accent={gain >= 0 ? "text-success" : "text-destructive"} />
        <Kpi label={t("refine.kpi.volume")} value={fmtVol(r.volume)} />
      </div>
      <div className={cn("rounded-lg px-3 py-2 text-sm", gain >= 0 ? "bg-success/10 text-success" : "bg-amber-500/10 text-amber-200")}>
        {gain >= 0 ? t("refine.verdict.refine") : t("refine.verdict.sell")}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("refine.rep.col.material")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("refine.rep.col.qty")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("refine.rep.col.value")}</th>
            </tr>
          </thead>
          <tbody>
            {mats.map(([mid, q]) => (
              <tr key={mid} className="border-t border-border/40">
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <img src={typeIconUrl(mid, 32)} alt="" loading="lazy" className="h-5 w-5 rounded" />
                    <span>{MATERIALS[mid] ?? `#${mid}`}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(q)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtIsk(r.matValue.get(mid) ?? 0)} ISK</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {r.unmatched.length > 0 && (
        <div className="text-xs text-amber-300">{t("refine.rep.unmatched", { names: r.unmatched.slice(0, 8).join(", ") })}</div>
      )}
    </div>
  );
}

function CompView({ r }: { r: CompResult }) {
  const t = useT();
  const { plan } = r;
  const targetMet = plan.shortfall.size === 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label={t("refine.comp.kpi.totalCost")} value={`${fmtIsk(plan.totalCost)} ISK`} accent="text-success" big />
        <Kpi label={t("refine.comp.kpi.compressedVolume")} value={fmtVol(plan.totalVolume)} big />
        <Kpi label={t("refine.comp.kpi.oreTypes")} value={fmtNum(plan.lines.length)} />
      </div>
      {!targetMet && (
        <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {t("refine.comp.partial")}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("refine.comp.col.oreToBuy")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("refine.comp.col.units")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("refine.comp.col.cost")}</th>
              <th className="px-3 py-2 text-right font-medium">{t("refine.comp.col.volume")}</th>
            </tr>
          </thead>
          <tbody>
            {plan.lines.map((l) => (
              <tr key={l.ore.id} className="border-t border-border/40">
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <img src={typeIconUrl(l.ore.id, 32)} alt="" loading="lazy" className="h-5 w-5 rounded" />
                    <span>{l.ore.name}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(l.units)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtIsk(l.cost)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{fmtVol(l.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Minéraux produits */}
      <div className="rounded-xl border border-border bg-card/40 p-3">
        <div className="mb-2 text-sm font-semibold">{t("refine.comp.produced")}</div>
        <div className="flex flex-wrap gap-2">
          {[...plan.produced.entries()]
            .filter(([mid]) => CORE_MINERALS.includes(mid))
            .sort((a, b) => CORE_MINERALS.indexOf(a[0]) - CORE_MINERALS.indexOf(b[0]))
            .map(([mid, q]) => (
              <span key={mid} className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-xs">
                <img src={typeIconUrl(mid, 32)} alt="" className="h-4 w-4 rounded" />
                {MATERIALS[mid]} <span className="font-medium tabular-nums">{fmtNum(q)}</span>
              </span>
            ))}
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground/70">
        {t("refine.comp.note")}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, big }: { label: string; value: string; accent?: string; big?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-border/70 bg-background/40 px-3 py-2", big && "ring-1 ring-primary/20")}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", big ? "text-lg" : "text-base", accent)}>{value}</div>
    </div>
  );
}

function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
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

function Intro({ mode }: { mode: string }) {
  const t = useT();
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/30 px-5 py-10 text-center text-sm text-muted-foreground">
      <Recycle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
      <p className="mx-auto max-w-md">
        {mode === "reprocess" ? t("refine.intro.reprocess") : t("refine.intro.compress")}
      </p>
    </div>
  );
}
