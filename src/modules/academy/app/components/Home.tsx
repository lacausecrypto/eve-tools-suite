import { useEffect, useMemo } from "react";
import { ArrowRight, Flame, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { useAcademy, buildContext } from "../store";
import { TRACKS, ALL_LESSONS, TOTAL_LESSONS, LESSON_INDEX } from "../data/curriculum";
import { ALL_CARDS } from "../data/flashcards";
import { BADGES } from "../data/badges";
import { levelFromXp } from "../lib/xp";
import { pct } from "../lib/format";
import { XpBar, StatTile, ProgressRing } from "./bits";

export function Home({ onOpenLesson, onGotoCursus }: { onOpenLesson: (id: string) => void; onGotoCursus: () => void }) {
  const t = useT();
  const state = useAcademy((s) => s);

  // Met à jour la série quotidienne à l'ouverture.
  useEffect(() => {
    state.touchDay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const info = levelFromXp(state.xp);
  const ctx = useMemo(() => buildContext(state), [state]);

  const completed = new Set(state.completedLessons);
  const next = ALL_LESSONS.find((l) => !completed.has(l.id));
  const nextTrack = next ? LESSON_INDEX.get(next.id)?.track : undefined;

  const quizValues = Object.values(state.quizBest);
  const quizPassed = quizValues.filter((v) => v >= 0.6).length;
  const avgScore = quizValues.length
    ? quizValues.reduce((s, v) => s + v, 0) / quizValues.length
    : 0;

  return (
    <div className="space-y-5">
      {/* Profil */}
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <XpBar info={info} />
      </div>

      {/* Stats */}
      <div data-tour="academy.stats" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label={t("academy.home.stat.lessons")} value={`${completed.size}/${TOTAL_LESSONS}`} />
        <StatTile label={t("academy.home.stat.quizPassed")} value={String(quizPassed)} accent="text-success" />
        <StatTile label={t("academy.home.stat.avgAccuracy")} value={quizValues.length ? pct(avgScore) : "—"} />
        <StatTile label={t("academy.home.stat.cardsReviewed")} value={String(state.reviewedCards)} />
        <StatTile
          label={t("academy.home.stat.streak")}
          value={t("academy.home.stat.streakValue", { n: state.streak })}
          accent={state.streak > 0 ? "text-amber-400" : undefined}
        />
      </div>

      {/* Continuer */}
      {next && nextTrack ? (
        <button
          data-tour="academy.continue" onClick={() => onOpenLesson(next.id)}
          className="flex w-full items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left transition-colors hover:border-primary/50"
        >
          <nextTrack.icon className="h-6 w-6 shrink-0" style={{ color: nextTrack.accent }} />
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("academy.home.continue", { track: t(`academy.track.${nextTrack.id}.title`) })}
            </div>
            <div className="truncate font-semibold">{t(`academy.lesson.${next.id}.title`)}</div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
        </button>
      ) : (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center text-sm">
          {t("academy.home.allDone")}
        </div>
      )}

      {/* Progression par cursus */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("academy.home.tracks")}</h3>
          <Button variant="ghost" size="sm" onClick={onGotoCursus}>
            {t("academy.home.seeAll")} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div data-tour="academy.tracks" className="grid gap-2 sm:grid-cols-2">
          {TRACKS.map((tr) => {
            const total = tr.lessons.length;
            const n = tr.lessons.filter((l) => completed.has(l.id)).length;
            return (
              <div key={tr.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-3">
                <ProgressRing value={total ? n / total : 0} color={tr.accent} label={`${n}/${total}`} size={40} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{t(`academy.track.${tr.id}.title`)}</div>
                  <div className="text-xs text-muted-foreground">{t(`academy.level.${tr.level}`)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Badges */}
      <section>
        <h3 className="mb-2 text-sm font-semibold">{t("academy.home.badges")}</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const earned = b.earned(ctx);
            const Icon = earned ? b.icon : Lock;
            return (
              <div
                key={b.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3",
                  earned ? "border-fleur/40 bg-fleur/5" : "border-border bg-card/30 opacity-60",
                )}
              >
                <div
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border",
                    earned ? "border-fleur/40 bg-fleur/10" : "border-border bg-muted/30",
                  )}
                >
                  <Icon className={cn("h-4 w-4", earned ? "text-fleur" : "text-muted-foreground")} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{t(`academy.badge.${b.id}.title`)}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {t(`academy.badge.${b.id}.desc`)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Note flashcards dues */}
      <p className="text-center text-xs text-muted-foreground">
        <Flame className="mr-1 inline h-3.5 w-3.5 text-amber-400" />
        {t("academy.home.comeBack", { n: ALL_CARDS.length })}
      </p>
    </div>
  );
}
