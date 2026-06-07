import { useState } from "react";
import { Check, RotateCcw, Trophy, X, Zap } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { typeIconUrl, typeRenderUrl } from "@/core/images";
import { WEAPON_LABEL, sensorOf, type Damage } from "../data/doctrine";
import {
  QUIZ_MODES,
  makeSession,
  type QuizMode,
  type QuizQuestion,
} from "../lib/quiz";
import { statsFor, useTrainer } from "../store";

const SESSION_LEN = 10;

const DMG_KEY: Record<Damage, string> = {
  EM: "ship.dmg.EM",
  Thermal: "ship.dmg.Thermal",
  Kinetic: "ship.dmg.Kinetic",
  Explosive: "ship.dmg.Explosive",
};

type Phase = "setup" | "running" | "done";

export function Quiz() {
  const t = useT();
  const stats = useTrainer((s) => s.stats);
  const record = useTrainer((s) => s.recordSession);

  const [phase, setPhase] = useState<Phase>("setup");
  const [modes, setModes] = useState<Set<QuizMode>>(new Set(QUIZ_MODES));
  const [session, setSession] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const sessionKey = modes.size === 1 ? [...modes][0] : "mixed";
  const best = statsFor(stats, sessionKey);

  function toggleMode(m: QuizMode) {
    setModes((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  }

  function start() {
    if (modes.size === 0) return;
    setSession(makeSession([...modes], SESSION_LEN));
    setIdx(0);
    setChosen(null);
    setCorrect(0);
    setStreak(0);
    setBestStreak(0);
    setPhase("running");
  }

  function answer(value: string) {
    if (chosen !== null) return; // déjà répondu
    setChosen(value);
    const ok = value === session[idx].answer;
    if (ok) {
      const ns = streak + 1;
      setCorrect((c) => c + 1);
      setStreak(ns);
      setBestStreak((b) => Math.max(b, ns));
    } else {
      setStreak(0);
    }
  }

  function next() {
    if (idx + 1 >= session.length) {
      record(sessionKey, {
        answered: session.length,
        correct,
        bestStreak,
      });
      setPhase("done");
    } else {
      setIdx((i) => i + 1);
      setChosen(null);
    }
  }

  // ───────────────────────── Setup ─────────────────────────
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("ship.quiz.modes")}</h2>
            {best.answered > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("ship.quiz.bestScore")} · {Math.round(best.bestScore * 100)}% ·{" "}
                <Zap className="inline h-3 w-3" /> {best.bestStreak}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {QUIZ_MODES.map((m) => (
              <button
                key={m}
                onClick={() => toggleMode(m)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  modes.has(m)
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`ship.quiz.mode.${m}`)}
              </button>
            ))}
          </div>
          <Button onClick={start} disabled={modes.size === 0} className="w-full">
            {modes.size === 0 ? t("ship.quiz.pickOne") : t("ship.quiz.start")}
          </Button>
        </div>
      </div>
    );
  }

  // ───────────────────────── Résultat ─────────────────────────
  if (phase === "done") {
    const pct = Math.round((correct / session.length) * 100);
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
          <Trophy className="mx-auto h-10 w-10 text-primary" />
          <h2 className="text-lg font-semibold">{t("ship.quiz.result.title")}</h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t("ship.quiz.score")} value={`${correct}/${session.length}`} />
            <Stat label={t("ship.quiz.result.accuracy")} value={`${pct}%`} />
            <Stat label={t("ship.quiz.result.best")} value={String(bestStreak)} />
          </div>
          <Button onClick={() => setPhase("setup")} className="w-full">
            <RotateCcw className="h-4 w-4" />
            {t("ship.quiz.again")}
          </Button>
        </div>
      </div>
    );
  }

  // ───────────────────────── En cours ─────────────────────────
  const q = session[idx];
  return (
    <QuizRunner
      key={idx}
      q={q}
      idx={idx}
      total={session.length}
      chosen={chosen}
      streak={streak}
      onAnswer={answer}
      onNext={next}
      last={idx + 1 >= session.length}
    />
  );
}

function QuizRunner({
  q,
  idx,
  total,
  chosen,
  streak,
  onAnswer,
  onNext,
  last,
}: {
  q: QuizQuestion;
  idx: number;
  total: number;
  chosen: string | null;
  streak: number;
  onAnswer: (v: string) => void;
  onNext: () => void;
  last: boolean;
}) {
  const t = useT();
  const [imgFailed, setImgFailed] = useState(false);

  const prompt =
    q.mode === "sensor"
      ? t("ship.quiz.q.sensor", { name: q.subject.name })
      : q.mode === "weapon"
        ? t("ship.quiz.q.weapon", { name: q.subject.name })
        : q.mode === "resist"
          ? t("ship.quiz.q.resist", { tank: t(`ship.tank.${q.subject.tank}`) })
          : t(`ship.quiz.q.${q.mode}`);

  function display(value: string): string {
    if (q.mode === "weapon") return WEAPON_LABEL[value as keyof typeof WEAPON_LABEL] ?? value;
    if (q.mode === "resist") return t(DMG_KEY[value as Damage]);
    return value;
  }

  const answered = chosen !== null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Barre de progression */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("ship.quiz.progress", { i: idx + 1, n: total })}</span>
        {streak >= 2 && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Zap className="h-3 w-3" /> {t("ship.quiz.streak")} {streak}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(idx / total) * 100}%` }}
        />
      </div>

      {/* Carte question */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-background/40">
          <img
            src={
              imgFailed
                ? typeIconUrl(q.subject.typeId, 64)
                : typeRenderUrl(q.subject.typeId, 512)
            }
            alt={q.hideName ? "?" : q.subject.name}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="space-y-1">
          {!q.hideName && (
            <Badge variant="outline" className="mb-1">
              {q.subject.name}
            </Badge>
          )}
          <p className="font-medium">{prompt}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {q.options.map((o) => {
            const isCorrect = o.value === q.answer;
            const isChosen = o.value === chosen;
            return (
              <button
                key={o.value}
                onClick={() => onAnswer(o.value)}
                disabled={answered}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
                  !answered &&
                    "border-border bg-background/40 hover:border-primary/60 hover:bg-accent",
                  answered && isCorrect && "border-success bg-success/15 text-success",
                  answered &&
                    isChosen &&
                    !isCorrect &&
                    "border-destructive bg-destructive/15 text-destructive",
                  answered && !isCorrect && !isChosen && "border-border opacity-50",
                )}
              >
                {display(o.value)}
                {answered && isCorrect && <Check className="h-4 w-4 shrink-0" />}
                {answered && isChosen && !isCorrect && <X className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              <Explanation q={q} />
            </p>
            <Button onClick={onNext} className="w-full">
              {last ? t("ship.quiz.finish") : t("ship.quiz.next")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Explication pédagogique après réponse, adaptée au mode. */
function Explanation({ q }: { q: QuizQuestion }) {
  const t = useT();
  const s = q.subject;
  switch (q.mode) {
    case "sensor":
      return <>{t("ship.quiz.explain.sensor", { race: s.race, sensor: sensorOf(s.race) })}</>;
    case "resist":
      return (
        <>
          {t("ship.quiz.explain.resist", {
            tank: t(`ship.tank.${s.tank}`),
            dmg: t(DMG_KEY[q.answer as Damage]),
          })}
        </>
      );
    case "weapon":
      return (
        <>
          {s.name} — {WEAPON_LABEL[s.weapon]} · {s.role}
        </>
      );
    default:
      return (
        <>
          {s.name} — {s.race} · {s.role}
        </>
      );
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
