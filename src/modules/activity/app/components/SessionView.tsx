import { useEffect, useState } from "react";
import {
  Boxes,
  Coins,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { typeIconUrl } from "@/core/images";
import { isTauri } from "@/core/runtime";
import { valueLoot } from "../api";
import { useActivity } from "../store";
import { ACTIVITIES, activityDef } from "../data/activities";
import { computeTotals, draftSeconds, unitValue } from "../lib/compute";
import { fmtClock, fmtIsk, fmtQty } from "../lib/format";
import type { Entry } from "../lib/types";

/** Re-rend chaque seconde tant que `active` (pour le chrono live). */
function useNow(active: boolean): number {
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return Date.now();
}

/** Parse un montant ISK avec suffixes k/m/b/t (ex. « 5m », « 1.2b »). */
function parseIsk(s: string): number {
  const m = s.trim().toLowerCase().replace(/\s/g, "").replace(",", ".").match(/^(-?[\d.]+)\s*([kmbt]*)$/);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  const mult = { "": 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12, kk: 1e6 }[m[2]] ?? 1;
  return n * mult;
}

export function SessionView() {
  const t = useT();
  const {
    current,
    basis,
    setBasis,
    setActivity,
    setSite,
    setRuns,
    startTimer,
    pauseTimer,
    resetTimer,
    addLoot,
    removeLoot,
    clearLoot,
    addEntry,
    removeEntry,
    finishSession,
  } = useActivity();

  const def = activityDef(current.activity);
  const running = current.runningSince != null;
  const now = useNow(running);
  const elapsed = draftSeconds(current.accumulatedSec, current.runningSince, now);

  const totals = computeTotals(current.loot, current.income, current.costs, elapsed, current.runs, basis);

  const [lootText, setLootText] = useState("");
  const [valuing, setValuing] = useState(false);
  const [valError, setValError] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<string[]>([]);

  async function valueAndAdd() {
    if (!lootText.trim()) return;
    setValuing(true);
    setValError(null);
    try {
      const res = await valueLoot(lootText);
      if (res.loot.length) addLoot(res.loot);
      setUnresolved(res.unresolved);
      setLootText("");
    } catch {
      setValError(isTauri() ? t("activity.loot.error.desktop") : t("activity.loot.error.web"));
    } finally {
      setValuing(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      {/* Colonne principale */}
      <div className="space-y-4">
        {/* Configuration + chrono */}
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">{t("activity.activity")}</span>
              <Select value={current.activity} onValueChange={(v) => setActivity(v as typeof current.activity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITIES.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {t("activity.act." + a.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                {def.hasRuns ? t("activity.site.runs") : t("activity.site.optional")}
              </span>
              <Input
                value={current.siteLabel}
                onChange={(e) => setSite(e.target.value)}
                placeholder={t("activity.site.ph")}
                spellCheck={false}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="font-mono text-4xl font-bold tabular-nums tracking-tight">{fmtClock(elapsed)}</div>
            <div className="flex gap-2">
              {running ? (
                <Button variant="outline" onClick={pauseTimer}>
                  <Pause className="h-4 w-4" /> {t("activity.timer.pause")}
                </Button>
              ) : (
                <Button onClick={startTimer}>
                  <Play className="h-4 w-4" /> {elapsed > 0 ? t("activity.timer.resume") : t("activity.timer.start")}
                </Button>
              )}
              <Button variant="ghost" onClick={resetTimer} title={t("activity.timer.reset")}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {def.hasRuns && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("activity.runs")}</span>
                <Button size="sm" variant="outline" onClick={() => setRuns(current.runs - 1)} className="h-8 w-8 p-0">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-lg font-semibold tabular-nums">{current.runs}</span>
                <Button size="sm" variant="outline" onClick={() => setRuns(current.runs + 1)} className="h-8 w-8 p-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label={t("activity.kpi.iskPerHour")} value={fmtIsk(totals.iskPerHour)} accent="text-success" big icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <Kpi label={t("activity.kpi.net")} value={fmtIsk(totals.net)} accent={totals.net >= 0 ? "text-success" : "text-destructive"} />
          <Kpi label={t("activity.kpi.gross")} value={fmtIsk(totals.gross)} />
          <Kpi label={t("activity.kpi.loot")} value={fmtIsk(totals.lootValue)} icon={<Boxes className="h-3.5 w-3.5" />} />
          <Kpi label={t("activity.kpi.costs")} value={fmtIsk(totals.costs)} accent="text-destructive" />
          {def.hasRuns ? (
            <Kpi label={t("activity.kpi.netPerRun")} value={fmtIsk(totals.netPerRun)} />
          ) : (
            <Kpi label={t("activity.kpi.income")} value={fmtIsk(totals.income)} />
          )}
        </div>

        {/* Butin */}
        <div className="rounded-xl border border-border bg-card/40 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            <span className="text-sm font-semibold">{def.lootIsOre ? t("activity.loot.ore") : t("activity.loot.plain")}</span>
            <div className="ml-auto flex rounded-md border border-border/60 p-0.5 text-xs">
              {(["buy", "sell"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBasis(b)}
                  className={cn("rounded px-2 py-0.5", basis === b ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                  {b === "buy" ? t("activity.basis.buy") : t("activity.basis.sell")}
                </button>
              ))}
            </div>
          </div>
          <Textarea
            value={lootText}
            onChange={(e) => setLootText(e.target.value)}
            placeholder={t("activity.loot.ph")}
            className="h-24 resize-none font-mono text-xs"
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={valueAndAdd} disabled={!lootText.trim() || valuing}>
              {valuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("activity.loot.value")}
            </Button>
            {current.loot.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearLoot}>
                <Trash2 className="h-4 w-4" /> {t("activity.loot.clear")}
              </Button>
            )}
            {valError && <span className="text-xs text-destructive">{valError}</span>}
            {unresolved.length > 0 && (
              <span className="text-xs text-amber-300">
                {t("activity.loot.unresolved", {
                  names: unresolved.slice(0, 5).join(", ") + (unresolved.length > 5 ? "…" : ""),
                })}
              </span>
            )}
          </div>
          {current.loot.length > 0 && (
            <div className="mt-3 space-y-0.5">
              {current.loot
                .slice()
                .sort((a, b) => b.qty * unitValue(b, basis) - a.qty * unitValue(a, basis))
                .map((l) => (
                  <div key={l.typeId} className="flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/40">
                    <img src={typeIconUrl(l.typeId, 32)} alt="" loading="lazy" className="h-5 w-5 rounded" />
                    <span className="min-w-0 flex-1 truncate">{l.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{fmtQty(l.qty)} ×</span>
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums">{fmtIsk(l.qty * unitValue(l, basis))}</span>
                    <button onClick={() => removeLoot(l.typeId)} className="shrink-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Colonne latérale : revenus / coûts / clôture */}
      <div className="space-y-4">
        <EntryCard kind="income" title={t("activity.income.title")} presets={def.incomePresets} accent="text-success" onAdd={addEntry} onRemove={removeEntry} entries={current.income} parseIsk={parseIsk} t={t} />
        <EntryCard kind="costs" title={t("activity.costs.title")} presets={def.costPresets} accent="text-destructive" onAdd={addEntry} onRemove={removeEntry} entries={current.costs} parseIsk={parseIsk} t={t} />

        <Button className="w-full" onClick={finishSession} disabled={elapsed < 1 && current.loot.length === 0}>
          <Save className="h-4 w-4" /> {t("activity.finish")}
        </Button>
        <p className="text-[11px] text-muted-foreground/70">{t("activity.finish.note")}</p>
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
    <div className={cn("rounded-lg border border-border/70 bg-background/40 px-3 py-2", big && "ring-1 ring-success/30")}>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-0.5 font-semibold tabular-nums", big ? "text-xl" : "text-base", accent)}>{value}</div>
    </div>
  );
}

function EntryCard({
  kind,
  title,
  presets,
  accent,
  entries,
  onAdd,
  onRemove,
  parseIsk,
  t,
}: {
  kind: "income" | "costs";
  title: string;
  presets: string[];
  accent: string;
  entries: Entry[];
  onAdd: (kind: "income" | "costs", label: string, isk: number) => void;
  onRemove: (kind: "income" | "costs", id: string) => void;
  parseIsk: (s: string) => number;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const total = entries.reduce((s, e) => s + e.isk, 0);

  function add(presetLabel?: string) {
    const isk = parseIsk(amount);
    if (!Number.isFinite(isk) || isk === 0) return;
    onAdd(kind, presetLabel ?? label, Math.abs(isk));
    setLabel("");
    setAmount("");
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Coins className={cn("h-4 w-4", accent)} />
        <span className="text-sm font-semibold">{title}</span>
        <span className={cn("ml-auto text-sm font-semibold tabular-nums", accent)}>{fmtIsk(total)}</span>
      </div>

      <div className="flex gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("activity.entry.label")} className="h-8 flex-1" />
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={t("activity.entry.isk")}
          className="h-8 w-28"
        />
        <Button size="sm" className="h-8 w-8 p-0" onClick={() => add()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {presets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => add(t("activity.preset." + p))}
              className="rounded-md border border-border/60 bg-background/40 px-2 py-0.5 text-[11px] hover:bg-muted/40"
              title={t("activity.entry.presetTip")}
            >
              + {t("activity.preset." + p)}
            </button>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{e.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{fmtIsk(e.isk)}</span>
              <button onClick={() => onRemove(kind, e.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
