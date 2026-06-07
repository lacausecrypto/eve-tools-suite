import { Flame } from "lucide-react";
import { useT } from "@/core/i18n";
import type { WidgetField, WidgetProps } from "@/core/module/types";
import { WidgetStat } from "@/components/ui/widget";
import { useAcademy } from "./app/store";
import { levelFromXp } from "./app/lib/xp";
import { XpBar } from "./app/components/bits";
import { TOTAL_LESSONS } from "./app/data/curriculum";
import { BADGES } from "./app/data/badges";

// --- Niveau & XP : barre, niveau, XP ou leçons -------------------------------

export const academyLevelConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "xpbar",
    options: [
      { value: "xpbar", label: { fr: "Barre de progression", en: "Progress bar" } },
      { value: "level", label: { fr: "Niveau", en: "Level" } },
      { value: "xp", label: { fr: "XP total", en: "Total XP" } },
      { value: "lessons", label: { fr: "Leçons lues", en: "Lessons read" } },
    ],
  },
];

export function AcademyLevelWidget({ config }: WidgetProps) {
  const t = useT();
  const xp = useAcademy((s) => s.xp);
  const completed = useAcademy((s) => s.completedLessons.length);
  const info = levelFromXp(xp);
  const metric = (config.metric as string) || "xpbar";

  if (metric === "level")
    return <WidgetStat value={String(info.level)} sub={t("wg.academy.level")} tone="fleur" />;
  if (metric === "xp")
    return <WidgetStat value={xp.toLocaleString("fr-FR")} sub="XP" tone="fleur" />;
  if (metric === "lessons")
    return (
      <WidgetStat
        value={`${completed}/${TOTAL_LESSONS}`}
        sub={t("wg.academy.lessonsShort")}
        tone="success"
      />
    );

  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <XpBar info={info} />
      <div className="text-xs text-muted-foreground">
        {t("wg.academy.lessons", { n: completed, total: TOTAL_LESSONS })}
      </div>
    </div>
  );
}

// --- Série quotidienne -------------------------------------------------------

export function AcademyStreakWidget() {
  const t = useT();
  const streak = useAcademy((s) => s.streak);
  return (
    <div className="flex h-full items-center gap-3">
      <Flame
        className={streak > 0 ? "h-7 w-7 text-amber-400" : "h-7 w-7 text-muted-foreground"}
      />
      <div>
        <div className="text-2xl font-bold tabular-nums">{streak}</div>
        <div className="text-xs text-muted-foreground">{t("wg.academy.streak")}</div>
      </div>
    </div>
  );
}

// --- Badges : nombre ou pourcentage ------------------------------------------

export const academyBadgesConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "count",
    options: [
      { value: "count", label: { fr: "Acquis / total", en: "Earned / total" } },
      { value: "percent", label: { fr: "Pourcentage", en: "Percentage" } },
    ],
  },
];

export function AcademyBadgesWidget({ config }: WidgetProps) {
  const t = useT();
  const earned = useAcademy((s) => s.earnedBadges.length);
  const value =
    (config.metric as string) === "percent"
      ? `${Math.round((earned / BADGES.length) * 100)} %`
      : `${earned}/${BADGES.length}`;
  return <WidgetStat value={value} sub={t("wg.academy.badges")} tone="fleur" />;
}

// --- Quiz : maîtrise moyenne, parfaits ou tentés -----------------------------

export const academyQuizConfig: WidgetField[] = [
  {
    key: "metric",
    label: { fr: "Donnée", en: "Metric" },
    type: "select",
    default: "avg",
    options: [
      { value: "avg", label: { fr: "Maîtrise moyenne", en: "Average mastery" } },
      { value: "perfect", label: { fr: "Quiz parfaits", en: "Perfect quizzes" } },
      { value: "taken", label: { fr: "Quiz tentés", en: "Quizzes taken" } },
    ],
  },
];

export function AcademyQuizWidget({ config }: WidgetProps) {
  const t = useT();
  const quizBest = useAcademy((s) => s.quizBest);
  const scores = Object.values(quizBest);
  const metric = (config.metric as string) || "avg";

  if (metric === "perfect") {
    const n = scores.filter((v) => v >= 0.999).length;
    return <WidgetStat value={String(n)} sub={t("wg.academy.quiz")} tone="success" />;
  }
  if (metric === "taken")
    return <WidgetStat value={String(scores.length)} sub={t("wg.academy.quiz")} tone="fleur" />;

  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  return (
    <WidgetStat
      value={scores.length ? `${Math.round(avg * 100)} %` : "—"}
      sub={t("wg.academy.quiz")}
      tone="success"
    />
  );
}

// --- Flashcards révisées -----------------------------------------------------

export function AcademyFlashcardsWidget() {
  const t = useT();
  const reviewed = useAcademy((s) => s.reviewedCards);
  return (
    <WidgetStat
      value={String(reviewed)}
      sub={t("wg.academy.flashcards")}
      tone={reviewed ? "fleur" : "default"}
    />
  );
}
