import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import type { WidgetField, WidgetProps } from "@/core/module/types";
import { WidgetBars, WidgetList, WidgetStat, useNow } from "@/components/ui/widget";
import { usePiSetups } from "./app/store";
import { kpisForSetup, nextExpiry, type PiSetup } from "./app/lib/setup";
import { fmtCountdown, fmtIsk } from "./app/lib/format";

/** Formatage compact d'un nombre d'unités (k / M). */
function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + " M";
  if (a >= 1e3) return (v / 1e3).toFixed(1) + " k";
  return Math.round(v).toString();
}

/** Filtre les setups par propriétaire (config `owner`, vide = tous). */
function filterOwner(setups: PiSetup[], owner: unknown): PiSetup[] {
  const o = String(owner ?? "").trim().toLowerCase();
  if (!o) return setups;
  return setups.filter((s) => (s.owner || "").toLowerCase().includes(o));
}

const ownerField: WidgetField = {
  key: "owner",
  label: { fr: "Filtrer par alt", en: "Filter by alt" },
  type: "text",
  placeholder: "tous",
};

// --- Portefeuille : KPI net/h, sortie/h, ROI ou nombre de setups -------------

export const piPortfolioConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "net",
    options: [
      { value: "net", label: { fr: "ISK net / h", en: "Net ISK/h" } },
      { value: "output", label: { fr: "Sortie / h (unités)", en: "Output/h (units)" } },
      { value: "roi", label: { fr: "ROI moyen (h)", en: "Avg ROI (h)" } },
      { value: "count", label: { fr: "Nombre de setups", en: "Setup count" } },
    ],
  },
  ownerField,
];

export function PiPortfolioWidget({ config }: WidgetProps) {
  const t = useT();
  const setups = filterOwner(usePiSetups((s) => s.setups), config.owner);
  const metric = (config.metric as string) || "net";
  const kpis = setups.map(kpisForSetup);

  let value = "—";
  let tone: "fleur" | "default" | "success" = "fleur";
  if (metric === "count") {
    value = String(setups.length);
    tone = "default";
  } else if (metric === "output") {
    value = `${fmtNum(kpis.reduce((a, k) => a + k.outputPerHour, 0))}/h`;
  } else if (metric === "roi") {
    const valid = kpis.filter((k) => Number.isFinite(k.roiHours) && k.roiHours > 0);
    const avg = valid.length ? valid.reduce((a, k) => a + k.roiHours, 0) / valid.length : 0;
    value = avg ? `${avg.toFixed(0)} h` : "—";
    tone = "default";
  } else {
    value = `${fmtIsk(kpis.reduce((a, k) => a + k.netIskPerHour, 0))} ${t("pi.perHour")}`;
  }

  return (
    <WidgetStat
      value={value}
      sub={`${setups.length} ${t("pi.pf.setups").toLowerCase()}`}
      tone={tone}
      hint={config.owner ? String(config.owner) : undefined}
    />
  );
}

// --- Prochaine récolte : compte à rebours, retards ou nombre de programmes ----

export const piHarvestConfig: WidgetField[] = [
  {
    key: "mode",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "next",
    options: [
      { value: "next", label: { fr: "Prochaine échéance", en: "Next expiry" } },
      { value: "overdue", label: { fr: "En retard", en: "Overdue count" } },
      { value: "active", label: { fr: "Programmes actifs", en: "Active programs" } },
    ],
  },
  ownerField,
];

export function PiHarvestWidget({ config }: WidgetProps) {
  const t = useT();
  const setups = filterOwner(usePiSetups((s) => s.setups), config.owner);
  const now = useNow();
  const mode = (config.mode as string) || "next";

  if (mode === "overdue") {
    const n = setups.filter((s) => nextExpiry(s) - now < 0).length;
    return (
      <WidgetStat
        value={String(n)}
        sub={t("pi.pf.harvest")}
        tone={n > 0 ? "destructive" : "success"}
      />
    );
  }
  if (mode === "active") {
    return <WidgetStat value={String(setups.length)} sub={t("pi.pf.harvest")} />;
  }

  const next = setups.length ? Math.min(...setups.map(nextExpiry)) : null;
  const delta = next != null ? next - now : null;
  const overdue = delta != null && delta < 0;
  return (
    <div className="flex h-full flex-col justify-center">
      <div
        className={cn(
          "text-2xl font-semibold tabular-nums",
          overdue ? "text-destructive" : "text-foreground",
        )}
      >
        {delta == null ? "—" : fmtCountdown(delta)}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{t("pi.pf.harvest")}</div>
    </div>
  );
}

// --- Planning de récolte (liste) ---------------------------------------------

export const piHarvestListConfig: WidgetField[] = [
  ownerField,
  {
    key: "sort",
    label: { fr: "Tri", en: "Sort" },
    type: "select",
    default: "soonest",
    options: [
      { value: "soonest", label: { fr: "Plus proche d'abord", en: "Soonest first" } },
      { value: "latest", label: { fr: "Plus lointain d'abord", en: "Latest first" } },
    ],
  },
  {
    key: "overdueOnly",
    label: { fr: "Uniquement en retard", en: "Overdue only" },
    type: "toggle",
    default: false,
  },
  {
    key: "limit",
    label: { fr: "Lignes max (0 = auto)", en: "Max rows (0 = auto)" },
    type: "number",
    default: 0,
  },
];

export function PiHarvestListWidget({ config }: WidgetProps) {
  const setups = filterOwner(usePiSetups((s) => s.setups), config.owner);
  const now = useNow();
  const asc = (config.sort as string) !== "latest";
  const overdueOnly = Boolean(config.overdueOnly);

  const rows = [...setups]
    .filter((s) => !overdueOnly || nextExpiry(s) - now < 0)
    .sort((a, b) => (asc ? nextExpiry(a) - nextExpiry(b) : nextExpiry(b) - nextExpiry(a)))
    .map((s) => {
      const d = nextExpiry(s) - now;
      return {
        label: s.owner ? `${s.owner} · ${s.name}` : s.name,
        value: fmtCountdown(d),
        tone: d < 0 ? ("destructive" as const) : ("default" as const),
      };
    });
  return <WidgetList rows={rows} limit={Number(config.limit) || 0} />;
}

// --- ISK/h (ou sortie) par alt (barres) --------------------------------------

export const piByAltConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "net",
    options: [
      { value: "net", label: { fr: "ISK net / h", en: "Net ISK/h" } },
      { value: "output", label: { fr: "Sortie / h", en: "Output/h" } },
      { value: "count", label: { fr: "Nombre de setups", en: "Setup count" } },
    ],
  },
  {
    key: "sort",
    label: { fr: "Tri", en: "Sort" },
    type: "select",
    default: "desc",
    options: [
      { value: "desc", label: { fr: "Décroissant", en: "Descending" } },
      { value: "asc", label: { fr: "Croissant", en: "Ascending" } },
    ],
  },
  {
    key: "limit",
    label: { fr: "Lignes max (0 = auto)", en: "Max rows (0 = auto)" },
    type: "number",
    default: 0,
  },
];

export function PiByAltWidget({ config }: WidgetProps) {
  const setups = usePiSetups((s) => s.setups);
  const metric = (config.metric as string) || "net";
  const byAlt = new Map<string, number>();
  for (const s of setups) {
    const k = s.owner || "—";
    const inc =
      metric === "count" ? 1 : metric === "output" ? kpisForSetup(s).outputPerHour : kpisForSetup(s).netIskPerHour;
    byAlt.set(k, (byAlt.get(k) ?? 0) + inc);
  }
  const desc = (config.sort as string) !== "asc";
  const rows = [...byAlt.entries()]
    .sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]))
    .map(([label, v]) => ({
      label,
      value: v,
      display:
        metric === "count" ? String(v) : metric === "output" ? `${fmtNum(v)}/h` : `${fmtIsk(v)}/h`,
      tone: "fleur" as const,
    }));
  return <WidgetBars rows={rows} limit={Number(config.limit) || 0} />;
}
