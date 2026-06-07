import { useT } from "@/core/i18n";
import type { WidgetField, WidgetProps } from "@/core/module/types";
import { WidgetList, WidgetStat, fmtIsk } from "@/components/ui/widget";
import { useStore } from "./app/store/useStore";
import type { Session } from "./app/types";

/** Durée d'une session (ms) — fin ou maintenant si active. */
function durationMs(s: Session): number {
  const end = s.endedAt ?? Date.now();
  return Math.max(0, end - s.startedAt);
}
function iskPerHour(s: Session): number {
  const h = durationMs(s) / 3_600_000;
  return h > 0 ? s.totalIsk / h : 0;
}
function fmtHours(ms: number): string {
  const h = ms / 3_600_000;
  if (h >= 1) return `${h.toFixed(1)} h`;
  return `${Math.round(ms / 60_000)} min`;
}

// --- Session active : ISK, membres, durée ou ISK/h ---------------------------

export const miningActiveConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "isk",
    options: [
      { value: "isk", label: { fr: "ISK du butin", en: "Loot ISK" } },
      { value: "iskph", label: { fr: "ISK / heure", en: "ISK / hour" } },
      { value: "members", label: { fr: "Pilotes", en: "Pilots" } },
      { value: "duration", label: { fr: "Durée", en: "Duration" } },
    ],
  },
];

export function MiningActiveWidget({ config }: WidgetProps) {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const active = sessions.find((s) => s.status === "active") ?? null;
  const metric = (config.metric as string) || "isk";

  if (!active)
    return <WidgetStat value="—" sub={t("wg.mining.none")} tone="default" />;

  let value = fmtIsk(active.totalIsk);
  if (metric === "iskph") value = `${fmtIsk(iskPerHour(active))}/h`;
  else if (metric === "members") value = String(active.members.length);
  else if (metric === "duration") value = fmtHours(durationMs(active));

  return <WidgetStat value={value} sub={t("wg.mining.active")} tone="fleur" hint={active.name} />;
}

// --- Total miné : ISK cumulé, sessions, pilotes ou ISK/h moyen ---------------

export const miningTotalConfig: WidgetField[] = [
  {
    key: "scope",
    label: { fr: "Portée", en: "Scope" },
    type: "select",
    default: "ended",
    options: [
      { value: "ended", label: { fr: "Sessions terminées", en: "Ended sessions" } },
      { value: "all", label: { fr: "Toutes les sessions", en: "All sessions" } },
    ],
  },
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "isk",
    options: [
      { value: "isk", label: { fr: "ISK cumulé", en: "Total ISK" } },
      { value: "sessions", label: { fr: "Nombre de sessions", en: "Session count" } },
      { value: "iskph", label: { fr: "ISK / heure moyen", en: "Avg ISK / hour" } },
    ],
  },
];

export function MiningTotalWidget({ config }: WidgetProps) {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const scope = (config.scope as string) || "ended";
  const pool = scope === "all" ? sessions : sessions.filter((s) => s.status === "ended");
  const metric = (config.metric as string) || "isk";

  let value = "—";
  if (metric === "sessions") value = String(pool.length);
  else if (metric === "iskph") {
    const totalMs = pool.reduce((a, s) => a + durationMs(s), 0);
    const totalIsk = pool.reduce((a, s) => a + (s.totalIsk || 0), 0);
    value = `${fmtIsk(totalMs > 0 ? totalIsk / (totalMs / 3_600_000) : 0)}/h`;
  } else value = fmtIsk(pool.reduce((a, s) => a + (s.totalIsk || 0), 0));

  return <WidgetStat value={value} sub={t("wg.mining.total")} />;
}

// --- Sessions récentes (liste) -----------------------------------------------

export const miningRecentConfig: WidgetField[] = [
  {
    key: "value",
    label: { fr: "Valeur affichée", en: "Displayed value" },
    type: "select",
    default: "isk",
    options: [
      { value: "isk", label: { fr: "ISK du butin", en: "Loot ISK" } },
      { value: "iskph", label: { fr: "ISK / heure", en: "ISK / hour" } },
      { value: "members", label: { fr: "Pilotes", en: "Pilots" } },
      { value: "duration", label: { fr: "Durée", en: "Duration" } },
    ],
  },
  {
    key: "sort",
    label: { fr: "Tri", en: "Sort" },
    type: "select",
    default: "recent",
    options: [
      { value: "recent", label: { fr: "Plus récentes", en: "Most recent" } },
      { value: "top", label: { fr: "ISK décroissant", en: "Top ISK" } },
    ],
  },
  {
    key: "includeActive",
    label: { fr: "Inclure la session active", en: "Include active session" },
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

export function MiningRecentWidget({ config }: WidgetProps) {
  const sessions = useStore((s) => s.sessions);
  const includeActive = Boolean(config.includeActive);
  const valueKind = (config.value as string) || "isk";
  const top = (config.sort as string) === "top";

  const display = (s: Session) =>
    valueKind === "iskph"
      ? `${fmtIsk(iskPerHour(s))}/h`
      : valueKind === "members"
        ? String(s.members.length)
        : valueKind === "duration"
          ? fmtHours(durationMs(s))
          : fmtIsk(s.totalIsk);

  const rows = sessions
    .filter((s) => (includeActive ? true : s.status === "ended"))
    .sort((a, b) => (top ? b.totalIsk - a.totalIsk : (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt)))
    .map((s) => ({
      label: s.status === "active" ? `● ${s.name}` : s.name,
      value: display(s),
      tone: s.status === "active" ? ("success" as const) : ("fleur" as const),
    }));
  return <WidgetList rows={rows} limit={Number(config.limit) || 0} />;
}
