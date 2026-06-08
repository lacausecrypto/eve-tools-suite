import { useState } from "react";
import {
  Calculator as CalcIcon,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/core/toast";
import {
  computeCost,
  type ActivityType,
  type CostResult,
  type Material,
  type PriceBasis,
  type Recipe,
} from "../lib/industry";
import { buildRecipePriceMap, resolveTypeIds } from "../lib/market";
import { fetchBlueprintForProduct } from "../lib/blueprint";
import { fetchSystemCostIndex } from "../lib/systems";
import { brokerFeeFromSkill, salesTaxFromSkill } from "../lib/fees";
import { parseQtyList } from "../lib/parse";
import { fmtDuration, fmtInt, fmtIsk, fmtPct } from "../lib/format";
import { MINERALS } from "../data/minerals";
import { useCalc, useLedger } from "../store";
import { ITEM_NAMES } from "../data/items";
import { ItemCombobox } from "./ItemCombobox";
import { Field, Kpi, NumInput, PctInput, Section } from "./bits";

type Status = "idle" | "loading" | "error" | "done";

export function Calculator() {
  const t = useT();
  const { recipe, inputs, meta, setRecipe, setMaterials, setInputs, setMeta } = useCalc();
  const addToLedger = useLedger((s) => s.add);

  const [status, setStatus] = useState<Status>("idle");
  const [busy, setBusy] = useState<"calc" | "bp" | "index" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CostResult | null>(null);
  const [outId, setOutId] = useState(0);
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [advRecipe, setAdvRecipe] = useState(false);
  const [advCost, setAdvCost] = useState(false);

  function setMat(i: number, patch: Partial<{ name: string; baseQty: number }>) {
    setMaterials(recipe.materials.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  }
  function addMat() {
    setMaterials([...recipe.materials, { name: "", baseQty: 0 }]);
  }
  function removeMat(i: number) {
    setMaterials(recipe.materials.filter((_, j) => j !== i));
  }
  function addMinerals() {
    const have = new Set(recipe.materials.map((m) => m.name.toLowerCase()));
    setMaterials([
      ...recipe.materials,
      ...MINERALS.filter((m) => !have.has(m.name.toLowerCase())).map((m) => ({
        name: m.name,
        baseQty: 0,
      })),
    ]);
  }
  function applyPaste() {
    const parsed = parseQtyList(pasteText);
    if (parsed.length) {
      setMaterials(parsed.map((p) => ({ name: p.name, baseQty: p.qty })));
      setPasteOpen(false);
      setPasteText("");
    }
  }

  /** Auto-remplissage depuis le blueprint Fuzzwork (matériaux + temps + sortie). */
  async function autofill() {
    if (!recipe.outputName.trim()) return;
    setBusy("bp");
    try {
      const bp = await fetchBlueprintForProduct(recipe.outputName);
      if (!bp) {
        toast.error(t("ind.calc.autofillFail"));
        return;
      }
      setRecipe({
        activity: bp.activity,
        outputPerRun: bp.outputPerRun,
        baseTimePerRun: bp.baseTimePerRun,
      });
      setMaterials(bp.materials.map((m) => ({ name: m.name, baseQty: m.baseQty })));
      toast.success(t("ind.calc.autofillOk", { n: bp.materials.length }));
    } catch {
      toast.error(t("ind.calc.autofillFail"));
    } finally {
      setBusy(null);
    }
  }

  /** Récupère l'index de coût du système renseigné pour l'activité courante. */
  async function fetchIndex() {
    if (!meta.systemName.trim()) return;
    setBusy("index");
    try {
      const idx = await fetchSystemCostIndex(meta.systemName, recipe.activity);
      if (idx == null) {
        toast.error(t("ind.calc.indexFail"));
        return;
      }
      setInputs({ systemCostIndex: idx });
      toast.success(t("ind.calc.indexOk", { pct: (idx * 100).toFixed(2) }));
    } catch {
      toast.error(t("ind.calc.indexFail"));
    } finally {
      setBusy(null);
    }
  }

  function applySkills() {
    setInputs({
      salesTax: salesTaxFromSkill(meta.accountingLevel),
      brokerFee: brokerFeeFromSkill(meta.brokerLevel),
    });
  }

  function fullRecipe(resolvedOut: number, materials: Material[]): Recipe {
    return {
      outputTypeId: resolvedOut,
      outputName: recipe.outputName,
      outputPerRun: recipe.outputPerRun,
      runs: recipe.runs,
      me: recipe.me,
      facilityMaterialBonus: recipe.facilityMaterialBonus,
      materials,
      activity: recipe.activity,
      te: recipe.te,
      baseTimePerRun: recipe.baseTimePerRun,
      facilityTimeBonus: recipe.facilityTimeBonus,
    };
  }

  async function calculate() {
    setStatus("loading");
    setBusy("calc");
    setError(null);
    try {
      const mats = recipe.materials.filter((m) => m.name.trim() && m.baseQty > 0);
      const names = [recipe.outputName, ...mats.map((m) => m.name)].filter((s) => s.trim());
      const idMap = await resolveTypeIds(names);
      setUnresolved([...new Set(names.filter((n) => !idMap.has(n.trim().toLowerCase())))]);

      const out = idMap.get(recipe.outputName.trim().toLowerCase());
      const resolvedOut = out?.id ?? 0;
      const materials: Material[] = mats.map((m) => {
        const r = idMap.get(m.name.trim().toLowerCase());
        return { typeId: r?.id ?? 0, name: r?.name ?? m.name, baseQty: m.baseQty };
      });

      const full = fullRecipe(resolvedOut, materials);
      const prices = await buildRecipePriceMap(full); // VWAP réel
      setOutId(resolvedOut);
      setResult(computeCost(full, prices, inputs));
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    } finally {
      setBusy(null);
    }
  }

  function save() {
    if (!result) return;
    addToLedger({
      outputTypeId: outId,
      outputName: recipe.outputName || t("ind.calc.unnamed"),
      runs: recipe.runs,
      unitsProduced: result.unitsProduced,
      totalCost: result.totalCost,
      unitCost: result.unitCost,
      expectedUnitSell: result.productUnitPrice,
      expectedProfit: result.profit,
      feeRate: inputs.salesTax + inputs.brokerFee,
      materials: result.lines.map((l) => ({ typeId: l.typeId, name: l.name, qty: l.quantity })),
      timeSeconds: result.timeSeconds,
      profitPerHour: result.profitPerHour,
    });
    toast.success(t("ind.calc.saved"));
  }

  const isReaction = recipe.activity === "reaction";
  const canCalc =
    recipe.materials.some((m) => m.name.trim() && m.baseQty > 0) && busy !== "calc";

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      {/* ── Colonne recette ── */}
      <div className="space-y-4">
        <Section
          title={t("ind.calc.recipe")}
          right={
            <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={autofill} disabled={!recipe.outputName.trim() || busy === "bp"}>
                {busy === "bp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {t("ind.calc.autofill")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPasteOpen((v) => !v)}>
                {t("ind.calc.paste")}
              </Button>
              <Button variant="outline" size="sm" onClick={addMinerals}>
                {t("ind.calc.addMinerals")}
              </Button>
            </div>
          }
        >
          {/* Essentiels */}
          <div data-tour="industry.recipe" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label={t("ind.calc.output")} className="col-span-2">
              <ItemCombobox
                value={recipe.outputName}
                onChange={(v) => setRecipe({ outputName: v })}
                options={ITEM_NAMES}
                placeholder={t("ind.calc.output.ph")}
              />
            </Field>
            <Field label={t("ind.calc.activity")} className="col-span-2">
              <ActivityToggle value={recipe.activity} onChange={(a) => setRecipe({ activity: a })} />
            </Field>
            <Field label={t("ind.calc.runs")}>
              <NumInput value={recipe.runs} onChange={(n) => setRecipe({ runs: n })} min={1} />
            </Field>
            <Field label={t("ind.calc.me")} hint={isReaction ? t("ind.calc.reactionNote") : t("ind.calc.me.hint")}>
              <NumInput value={recipe.me} onChange={(n) => setRecipe({ me: Math.min(10, n) })} min={0} step={1} />
            </Field>
          </div>

          {/* Avancé : rendement, temps, bonus structure (auto-remplis par le blueprint) */}
          <AdvancedToggle open={advRecipe} onToggle={() => setAdvRecipe((v) => !v)} label={t("ind.calc.advanced")} />
          {advRecipe && (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label={t("ind.calc.perRun")}>
                <NumInput value={recipe.outputPerRun} onChange={(n) => setRecipe({ outputPerRun: n })} min={1} />
              </Field>
              <Field label={t("ind.calc.te")} hint={isReaction ? t("ind.calc.reactionNote") : undefined}>
                <NumInput value={recipe.te} onChange={(n) => setRecipe({ te: Math.min(20, n) })} min={0} step={2} />
              </Field>
              <Field label={t("ind.calc.baseTime")} hint={t("ind.calc.baseTime.hint")}>
                <NumInput value={recipe.baseTimePerRun} onChange={(n) => setRecipe({ baseTimePerRun: n })} min={0} />
              </Field>
              <Field label={t("ind.calc.structBonus")} hint={t("ind.calc.structBonus.hint")}>
                <PctInput value={recipe.facilityMaterialBonus} onChange={(f) => setRecipe({ facilityMaterialBonus: f })} />
              </Field>
              <Field label={t("ind.calc.timeBonus")} hint={t("ind.calc.timeBonus.hint")}>
                <PctInput value={recipe.facilityTimeBonus} onChange={(f) => setRecipe({ facilityTimeBonus: f })} />
              </Field>
            </div>
          )}

          {pasteOpen && (
            <div className="mt-3 space-y-2">
              <Textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={t("ind.calc.paste.ph")}
                rows={4}
                spellCheck={false}
              />
              <Button size="sm" onClick={applyPaste} disabled={!pasteText.trim()}>
                {t("ind.calc.paste.apply")}
              </Button>
            </div>
          )}

          <div data-tour="industry.materials" className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t("ind.calc.materials")}</span>
              <Button variant="ghost" size="sm" onClick={addMat}>
                <Plus className="h-4 w-4" />
                {t("ind.calc.addMat")}
              </Button>
            </div>
            {recipe.materials.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{t("ind.calc.noMat")}</p>
            ) : (
              recipe.materials.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ItemCombobox
                    value={m.name}
                    onChange={(v) => setMat(i, { name: v })}
                    options={ITEM_NAMES}
                    placeholder={t("ind.calc.matName")}
                    className="flex-1"
                  />
                  <NumInput value={m.baseQty} onChange={(n) => setMat(i, { baseQty: n })} min={0} className="w-28" />
                  <Button variant="ghost" size="icon" onClick={() => removeMat(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
            <p className="pt-1 text-[11px] text-muted-foreground/70">{t("ind.calc.matHint")}</p>
          </div>
        </Section>

        <Section title={t("ind.calc.params")}>
          {/* Essentiels : système (→ index), index, et côté du carnet utilisé */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <Field label={t("ind.calc.system")} hint={t("ind.calc.system.hint")}>
              <div className="flex gap-1.5">
                <Input
                  data-tour="industry.system" value={meta.systemName}
                  onChange={(e) => setMeta({ systemName: e.target.value })}
                  placeholder="Jita"
                  spellCheck={false}
                />
                <Button variant="outline" size="icon" onClick={fetchIndex} disabled={!meta.systemName.trim() || busy === "index"}>
                  {busy === "index" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalcIcon className="h-4 w-4" />}
                </Button>
              </div>
            </Field>
            <Field label={t("ind.calc.costIndex")} hint={t("ind.calc.costIndex.hint")}>
              <PctInput value={inputs.systemCostIndex} onChange={(f) => setInputs({ systemCostIndex: f })} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            <BasisToggle label={t("ind.calc.matBasis")} value={inputs.materialBasis} onChange={(b) => setInputs({ materialBasis: b })} />
            <BasisToggle label={t("ind.calc.prodBasis")} value={inputs.productBasis} onChange={(b) => setInputs({ productBasis: b })} />
          </div>

          {/* Avancé : taxes, frais et compétences (défauts raisonnables sinon) */}
          <AdvancedToggle open={advCost} onToggle={() => setAdvCost((v) => !v)} label={t("ind.calc.advanced")} />
          {advCost && (
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label={t("ind.calc.facilityTax")}>
                  <PctInput value={inputs.facilityTax} onChange={(f) => setInputs({ facilityTax: f })} />
                </Field>
                <Field label={t("ind.calc.scc")} hint={t("ind.calc.scc.hint")}>
                  <PctInput value={inputs.sccSurcharge} onChange={(f) => setInputs({ sccSurcharge: f })} />
                </Field>
                <Field label={t("ind.calc.salesTax")}>
                  <PctInput value={inputs.salesTax} onChange={(f) => setInputs({ salesTax: f })} />
                </Field>
                <Field label={t("ind.calc.brokerFee")}>
                  <PctInput value={inputs.brokerFee} onChange={(f) => setInputs({ brokerFee: f })} />
                </Field>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <Field label={t("ind.calc.accounting")} className="w-24">
                  <NumInput value={meta.accountingLevel} onChange={(n) => setMeta({ accountingLevel: Math.min(5, n) })} min={0} step={1} />
                </Field>
                <Field label={t("ind.calc.broker")} className="w-24">
                  <NumInput value={meta.brokerLevel} onChange={(n) => setMeta({ brokerLevel: Math.min(5, n) })} min={0} step={1} />
                </Field>
                <Button variant="outline" size="sm" onClick={applySkills}>
                  {t("ind.calc.applySkills")}
                </Button>
              </div>
            </div>
          )}
        </Section>

        <Button data-tour="industry.compute" onClick={calculate} disabled={!canCalc} className="w-full">
          {busy === "calc" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalcIcon className="h-4 w-4" />}
          {t("ind.calc.compute")}
        </Button>
      </div>

      {/* ── Colonne résultat ── */}
      <div data-tour="industry.result" className="space-y-4">
        {status === "error" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        )}
        {status === "idle" && (
          <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
            {t("ind.calc.hint")}
          </div>
        )}
        {result && status !== "loading" && (
          <ResultPanel result={result} unresolved={unresolved} onSave={save} hasOutput={outId > 0} />
        )}
      </div>
    </div>
  );
}

function ActivityToggle({ value, onChange }: { value: ActivityType; onChange: (a: ActivityType) => void }) {
  const t = useT();
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
      {(["manufacturing", "reaction"] as ActivityType[]).map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            value === a ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`ind.activity.${a}`)}
        </button>
      ))}
    </div>
  );
}

function BasisToggle({ label, value, onChange }: { label: string; value: PriceBasis; onChange: (b: PriceBasis) => void }) {
  const t = useT();
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
        {(["buy", "sell"] as PriceBasis[]).map((b) => (
          <button
            key={b}
            onClick={() => onChange(b)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              value === b ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`ind.basis.${b}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdvancedToggle({
  open,
  onToggle,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
      {label}
    </button>
  );
}

function ResultPanel({
  result,
  unresolved,
  onSave,
  hasOutput,
}: {
  result: CostResult;
  unresolved: string[];
  onSave: () => void;
  hasOutput: boolean;
}) {
  const t = useT();
  const profitTone = result.profit >= 0 ? "good" : "bad";
  const hasTime = result.timeSeconds > 0;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Kpi label={t("ind.res.unitCost")} value={fmtIsk(result.unitCost)} tone="accent" />
        <Kpi label={t("ind.res.profit")} value={fmtIsk(result.profit)} tone={profitTone} />
        <Kpi label={t("ind.res.roi")} value={fmtPct(result.roiPct)} tone={profitTone} />
        <Kpi
          label={t("ind.res.perHour")}
          value={hasTime ? `${fmtIsk(result.profitPerHour)}/h` : "—"}
          tone={hasTime ? profitTone : undefined}
        />
      </div>

      <Section title={t("ind.res.breakdown")}>
        <div className="space-y-1 text-sm">
          <Row label={t("ind.res.materials")} value={fmtIsk(result.materialCost)} />
          <Row label={t("ind.res.install")} value={fmtIsk(result.installCost)} />
          <Row label={t("ind.res.eiv")} value={fmtIsk(result.eiv)} muted />
          <div className="my-1 border-t border-border" />
          <Row label={t("ind.res.total")} value={fmtIsk(result.totalCost)} bold />
          <Row label={t("ind.res.units")} value={fmtInt(result.unitsProduced)} muted />
          {hasTime && <Row label={t("ind.res.time")} value={fmtDuration(result.timeSeconds)} muted />}
          <div className="my-1 border-t border-border" />
          <Row label={t("ind.res.revenue")} value={fmtIsk(result.netRevenue)} />
          <Row label={t("ind.res.profit")} value={fmtIsk(result.profit)} bold tone={profitTone} />
          <Row label={t("ind.res.margin")} value={fmtPct(result.marginPct)} muted />
        </div>
        <Button onClick={onSave} variant="outline" size="sm" className="mt-3 w-full" disabled={!hasOutput}>
          <Save className="h-4 w-4" />
          {t("ind.res.save")}
        </Button>
        {!hasOutput && <p className="mt-1 text-[11px] text-muted-foreground/70">{t("ind.res.noOutput")}</p>}
      </Section>

      {result.hasMissingPrices && (
        <div className="rounded-lg border border-border/60 bg-background/40 p-2.5 text-xs text-muted-foreground">
          {t("ind.res.missingPrices")}
          {unresolved.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {unresolved.map((n) => (
                <Badge key={n} variant="muted">{n}</Badge>
              ))}
            </div>
          )}
        </div>
      )}

      <Section title={t("ind.res.matTable")}>
        <div className="space-y-1 text-xs">
          {result.lines.map((l) => (
            <div key={l.typeId + l.name} className="flex items-center justify-between gap-2">
              <span className={cn("truncate", l.missingPrice && "text-destructive")}>{l.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {fmtInt(l.quantity)} × {fmtIsk(l.unitPrice)} = {fmtIsk(l.cost)}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("text-muted-foreground", muted && "text-muted-foreground/60")}>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          bold && "font-semibold",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}
