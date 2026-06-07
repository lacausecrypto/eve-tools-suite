import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  Heart,
  Layers,
  Radar,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { ShipTrainerApp } from "@/modules/ship-trainer/app/ShipTrainerApp";
import { useT } from "@/core/i18n";
import { useAcademy, isDue } from "../store";
import { ALL_CARDS } from "../data/flashcards";
import { Flashcards } from "./Flashcards";
import { QuizGame } from "./QuizGame";
import { JargonGame } from "./JargonGame";

type Activity = "ships" | "cards" | "chrono" | "survival" | "jargon";

interface ActivityDef {
  id: Activity;
  icon: LucideIcon;
  accent: string;
}

const ACTIVITIES: ActivityDef[] = [
  { id: "ships", icon: Radar, accent: "hsl(var(--success))" },
  { id: "cards", icon: Layers, accent: "hsl(var(--primary))" },
  { id: "chrono", icon: Timer, accent: "hsl(var(--fleur))" },
  { id: "survival", icon: Heart, accent: "hsl(var(--destructive))" },
  { id: "jargon", icon: BookMarked, accent: "hsl(var(--fc))" },
];

/** Hub d'entraînement ludique : reconnaissance, flashcards et modes arcade. */
export function Training() {
  const t = useT();
  const [active, setActive] = useState<Activity | null>(null);
  const gameBest = useAcademy((s) => s.gameBest);
  const quizBest = useAcademy((s) => s.quizBest);
  const srs = useAcademy((s) => s.srs);

  const dueCards = useMemo(() => ALL_CARDS.filter((c) => isDue(srs, c.id)).length, [srs]);

  const badgeFor = (id: Activity): string | null => {
    switch (id) {
      case "chrono":
        return gameBest.chrono ? t("academy.train.badge.record", { n: gameBest.chrono }) : null;
      case "survival":
        return gameBest.survival ? t("academy.train.badge.streak", { n: gameBest.survival }) : null;
      case "jargon":
        return quizBest["game:jargon"] != null
          ? t("academy.train.badge.recordPct", { n: Math.round(quizBest["game:jargon"] * 100) })
          : null;
      case "cards":
        return dueCards > 0
          ? t("academy.train.badge.due", { n: dueCards })
          : t("academy.train.badge.upToDate");
      default:
        return null;
    }
  };

  if (active) {
    const def = ACTIVITIES.find((a) => a.id === active)!;
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActive(null)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("academy.train.back")}
        </button>
        {active === "ships" && (
          <div className="-mx-5">
            <ShipTrainerApp />
          </div>
        )}
        {active === "cards" && <Flashcards />}
        {active === "chrono" && <QuizGame mode="chrono" onExit={() => setActive(null)} />}
        {active === "survival" && <QuizGame mode="survival" onExit={() => setActive(null)} />}
        {active === "jargon" && <JargonGame onExit={() => setActive(null)} />}
        {/* Sous-titre contextuel */}
        <p className="text-center text-xs text-muted-foreground">
          {t(`academy.train.${def.id}.desc`)}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ACTIVITIES.map((a) => {
        const Icon = a.icon;
        const badge = badgeFor(a.id);
        return (
          <button
            key={a.id}
            onClick={() => setActive(a.id)}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card/40 p-4 text-left transition-colors hover:border-foreground/20"
          >
            <div className="flex items-center gap-3">
              <div
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-border/60"
                style={{ background: `${a.accent}1a` }}
              >
                <Icon className="h-5 w-5" style={{ color: a.accent }} />
              </div>
              <h3 className="font-semibold leading-tight">{t(`academy.train.${a.id}.title`)}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t(`academy.train.${a.id}.desc`)}</p>
            {badge && (
              <span className="mt-auto inline-flex w-fit items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
