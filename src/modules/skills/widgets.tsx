import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import type { WidgetField, WidgetProps } from "@/core/module/types";
import { WidgetBars } from "@/components/ui/widget";
import { useSkills } from "./app/store";
import { pairTotals, planRows, planSeconds, totalSp } from "./app/lib/plan";
import { optimizeRemap } from "./app/lib/optimize";
import { ATTRS, ATTR_LABEL } from "./app/lib/sp";
import { fmtDuration, fmtSp } from "./app/lib/format";

function useDerived() {
  const plan = useSkills((s) => s.plan);
  const attrs = useSkills((s) => s.attrs);
  const implants = useSkills((s) => s.implants);
  const alpha = useSkills((s) => s.alpha);
  const rows = planRows(plan);
  const pairs = pairTotals(rows);
  return { rows, pairs, attrs, implants, alpha };
}

// --- Temps du plan : temps, SP total, nombre ou SP/h --------------------------

export const skillPlanConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "time",
    options: [
      { value: "time", label: { fr: "Temps total", en: "Total time" } },
      { value: "sp", label: { fr: "SP total", en: "Total SP" } },
      { value: "count", label: { fr: "Nombre de compétences", en: "Skill count" } },
      { value: "sph", label: { fr: "SP / heure", en: "SP / hour" } },
    ],
  },
];

export function SkillPlanWidget({ config }: WidgetProps) {
  const t = useT();
  const { rows, pairs, attrs, implants, alpha } = useDerived();
  const secs = planSeconds(pairs, attrs, implants, alpha);
  const sp = totalSp(rows);
  const metric = (config.metric as string) || "time";

  let value = "—";
  if (rows.length) {
    if (metric === "sp") value = `${fmtSp(sp)} SP`;
    else if (metric === "count") value = String(rows.length);
    else if (metric === "sph") value = `${fmtSp(secs > 0 ? (sp / secs) * 3600 : 0)} SP/h`;
    else value = fmtDuration(secs);
  }

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {rows.length} {t("sk.skills").toLowerCase()} · {fmtSp(sp)} SP
      </div>
    </div>
  );
}

// --- Gain de remap : durée gagnée, % ou temps optimal ------------------------

export const skillRemapConfig: WidgetField[] = [
  {
    key: "mode",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "saved",
    options: [
      { value: "saved", label: { fr: "Temps gagné", en: "Time saved" } },
      { value: "percent", label: { fr: "Gain en %", en: "Savings %" } },
      { value: "optimal", label: { fr: "Temps avec remap", en: "Time with remap" } },
    ],
  },
];

export function SkillRemapWidget({ config }: WidgetProps) {
  const t = useT();
  const { rows, pairs, attrs, implants, alpha } = useDerived();
  const current = planSeconds(pairs, attrs, implants, alpha);
  const optimal = optimizeRemap(pairs, implants, alpha);
  const saved = current - optimal.seconds;
  const has = rows.length > 0 && saved > 1;
  const mode = (config.mode as string) || "saved";

  let value = "—";
  if (has) {
    if (mode === "percent") value = `−${current > 0 ? ((saved / current) * 100).toFixed(1) : "0"} %`;
    else if (mode === "optimal") value = fmtDuration(optimal.seconds);
    else value = `−${fmtDuration(saved)}`;
  } else if (rows.length && mode === "optimal") {
    value = fmtDuration(optimal.seconds);
  }

  return (
    <div className="flex h-full flex-col justify-center">
      <div
        className={cn(
          "text-2xl font-semibold tabular-nums",
          has && mode !== "optimal" ? "text-success" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{t("sk.remap")}</div>
    </div>
  );
}

// --- Remap optimal (barres) : courant → optimal ------------------------------

export const skillRemapBarsConfig: WidgetField[] = [
  {
    key: "onlyChanged",
    label: { fr: "Uniquement les attributs modifiés", en: "Only changed attributes" },
    type: "toggle",
    default: false,
  },
];

export function SkillRemapBarsWidget({ config }: WidgetProps) {
  const { attrs, pairs, implants, alpha } = useDerived();
  const optimal = optimizeRemap(pairs, implants, alpha);
  const onlyChanged = Boolean(config.onlyChanged);
  const rows = ATTRS.filter((k) => !onlyChanged || optimal.base[k] !== attrs[k]).map((k) => ({
    label: ATTR_LABEL[k],
    value: optimal.base[k],
    display: `${attrs[k]} → ${optimal.base[k]}`,
    tone:
      optimal.base[k] > attrs[k]
        ? ("success" as const)
        : optimal.base[k] < attrs[k]
          ? ("destructive" as const)
          : ("default" as const),
  }));
  return <WidgetBars rows={rows} max={27} />;
}
