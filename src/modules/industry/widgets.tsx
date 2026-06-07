import { useT } from "@/core/i18n";
import type { WidgetField, WidgetProps } from "@/core/module/types";
import { WidgetBars, WidgetStat, fmtIsk } from "@/components/ui/widget";
import { ledgerTotals, useLedger } from "./app/store";

// --- En production : coût, jobs ouverts ou profit attendu --------------------

export const industryProductionConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "cost",
    options: [
      { value: "cost", label: { fr: "ISK immobilisé", en: "Locked ISK" } },
      { value: "open", label: { fr: "Jobs ouverts", en: "Open jobs" } },
      { value: "expected", label: { fr: "Profit attendu", en: "Expected profit" } },
    ],
  },
];

export function IndustryProductionWidget({ config }: WidgetProps) {
  const t = useT();
  const totals = ledgerTotals(useLedger((s) => s.entries));
  const metric = (config.metric as string) || "cost";
  const value =
    metric === "open"
      ? String(totals.openCount)
      : metric === "expected"
        ? fmtIsk(totals.expectedProfit)
        : fmtIsk(totals.inProductionCost);
  return <WidgetStat value={value} sub={t("wg.industry.production")} tone="fleur" />;
}

// --- Profit : réalisé, attendu ou jobs vendus --------------------------------

export const industryProfitConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "realized",
    options: [
      { value: "realized", label: { fr: "Profit réalisé", en: "Realized profit" } },
      { value: "expected", label: { fr: "Profit attendu", en: "Expected profit" } },
      { value: "done", label: { fr: "Jobs vendus", en: "Sold jobs" } },
    ],
  },
];

export function IndustryProfitWidget({ config }: WidgetProps) {
  const t = useT();
  const totals = ledgerTotals(useLedger((s) => s.entries));
  const metric = (config.metric as string) || "realized";
  if (metric === "done")
    return <WidgetStat value={String(totals.doneCount)} sub={t("wg.industry.profit")} tone="fleur" />;
  const v = metric === "expected" ? totals.expectedProfit : totals.realizedProfit;
  return (
    <WidgetStat
      value={fmtIsk(v)}
      sub={t("wg.industry.profit")}
      tone={v >= 0 ? "success" : "destructive"}
    />
  );
}

// --- Vue d'ensemble (barres) : lignes sélectionnables ------------------------

export const industryOverviewConfig: WidgetField[] = [
  {
    key: "showProduction",
    label: { fr: "Ligne « en production »", en: "Row « in production »" },
    type: "toggle",
    default: true,
  },
  {
    key: "showExpected",
    label: { fr: "Ligne « attendu »", en: "Row « expected »" },
    type: "toggle",
    default: true,
  },
  {
    key: "showRealized",
    label: { fr: "Ligne « réalisé »", en: "Row « realized »" },
    type: "toggle",
    default: true,
  },
];

export function IndustryOverviewWidget({ config }: WidgetProps) {
  const t = useT();
  const tot = ledgerTotals(useLedger((s) => s.entries));
  const rows: { label: string; value: number; display: string; tone: "fleur" | "default" | "success" | "destructive" }[] = [];
  if (config.showProduction !== false)
    rows.push({
      label: t("wg.industry.production"),
      value: tot.inProductionCost,
      display: fmtIsk(tot.inProductionCost),
      tone: "fleur",
    });
  if (config.showExpected !== false)
    rows.push({
      label: t("wg.industry.expected"),
      value: tot.expectedProfit,
      display: fmtIsk(tot.expectedProfit),
      tone: "default",
    });
  if (config.showRealized !== false)
    rows.push({
      label: t("wg.industry.profit"),
      value: tot.realizedProfit,
      display: fmtIsk(tot.realizedProfit),
      tone: tot.realizedProfit >= 0 ? "success" : "destructive",
    });
  return <WidgetBars rows={rows} />;
}
