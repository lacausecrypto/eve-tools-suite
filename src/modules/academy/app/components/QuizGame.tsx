import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock, Heart, RotateCcw, Timer, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { useAcademy } from "../store";
import { ALL_QUESTIONS } from "../data/curriculum";
import type { Question } from "../lib/types";

type Mode = "chrono" | "survival";

const CHRONO_SECONDS = 60;
const WRONG_PENALTY = 3; // secondes perdues sur une mauvaise réponse (chrono)
const XP_CAP = 30; // XP max par session

interface Prepared {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
  /** Clé i18n de la question (si fournie par les données). */
  tk?: string;
  /** Index d'origine de chaque option affichée (pour retrouver sa clé `oN`). */
  order: number[];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Mélange les options d'une question (et recalcule l'index correct). */
function prepare(raw: Question): Prepared {
  const idxs = shuffle(raw.options.map((_, i) => i));
  return {
    q: raw.q,
    options: idxs.map((i) => raw.options[i]),
    answer: idxs.indexOf(raw.answer),
    explain: raw.explain,
    tk: raw.tk,
    order: idxs,
  };
}

/**
 * Mode arcade : pioche dans tout le pool de questions du cursus.
 * - chrono   : 60 s, +1 par bonne réponse, −3 s par erreur.
 * - survival : mort subite, on compte la meilleure série.
 */
export function QuizGame({ mode, onExit }: { mode: Mode; onExit: () => void }) {
  const t = useT();
  const recordGame = useAcademy((s) => s.recordGame);
  const best = useAcademy((s) => s.gameBest[mode] ?? 0);

  // Texte traduit d'une question préparée (clé i18n si dispo, sinon littéral).
  const qText = (p: Prepared) => (p.tk ? t(`${p.tk}.q`) : p.q);
  const optText = (p: Prepared, displayIdx: number) =>
    p.tk ? t(`${p.tk}.o${p.order[displayIdx]}`) : p.options[displayIdx];
  const explainText = (p: Prepared) =>
    p.tk ? (p.explain ? t(`${p.tk}.explain`) : undefined) : p.explain;

  const pool = useMemo(() => ALL_QUESTIONS, []);
  const deckRef = useRef<Question[]>(shuffle(pool));
  const ptrRef = useRef(0);

  const draw = (): Question => {
    if (ptrRef.current >= deckRef.current.length) {
      deckRef.current = shuffle(pool);
      ptrRef.current = 0;
    }
    return deckRef.current[ptrRef.current++];
  };

  const [current, setCurrent] = useState<Prepared>(() => prepare(draw()));
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(CHRONO_SECONDS);
  const [phase, setPhase] = useState<"play" | "over">("play");
  const [death, setDeath] = useState<Prepared | null>(null);
  const timers = useRef<number[]>([]);

  const finish = (finalCorrect: number, finalStreak: number) => {
    setPhase("over");
    const value = mode === "chrono" ? finalCorrect : finalStreak;
    recordGame(mode, value, Math.min(value, XP_CAP));
  };

  // Décompte du chrono.
  useEffect(() => {
    if (mode !== "chrono" || phase !== "play") return;
    const t = window.setInterval(() => setTimeLeft((x) => Math.max(0, x - 1)), 1000);
    return () => window.clearInterval(t);
  }, [mode, phase]);

  // Fin du temps.
  useEffect(() => {
    if (mode === "chrono" && phase === "play" && timeLeft <= 0) finish(correct, streak);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, mode]);

  // Nettoyage des timers d'avancement.
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const advance = () => {
    setCurrent(prepare(draw()));
    setPicked(null);
  };

  function pick(i: number) {
    if (picked != null || phase !== "play") return;
    setPicked(i);
    const ok = i === current.answer;

    if (ok) {
      const nc = correct + 1;
      const ns = streak + 1;
      setCorrect(nc);
      setStreak(ns);
      timers.current.push(window.setTimeout(advance, 350));
    } else {
      setWrong((w) => w + 1);
      if (mode === "chrono") {
        setTimeLeft((x) => Math.max(0, x - WRONG_PENALTY));
        timers.current.push(window.setTimeout(advance, 700));
      } else {
        // Mort subite : on fige la question fatale puis on termine.
        setDeath(current);
        timers.current.push(window.setTimeout(() => finish(correct, streak), 1100));
      }
    }
  }

  function restart() {
    deckRef.current = shuffle(pool);
    ptrRef.current = 0;
    setCurrent(prepare(draw()));
    setPicked(null);
    setCorrect(0);
    setWrong(0);
    setStreak(0);
    setTimeLeft(CHRONO_SECONDS);
    setDeath(null);
    setPhase("play");
  }

  if (phase === "over") {
    const value = mode === "chrono" ? correct : streak;
    const isRecord = value > best && value > 0;
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <Trophy className={cn("mx-auto h-10 w-10", isRecord ? "text-fleur" : "text-muted-foreground")} />
        <h3 className="text-lg font-semibold">
          {mode === "chrono" ? t("academy.qg.timeUp") : t("academy.qg.gameOver")}
        </h3>
        <div className="text-4xl font-bold tabular-nums">{value}</div>
        <p className="text-sm text-muted-foreground">
          {mode === "chrono"
            ? t("academy.qg.chronoStats", { correct, wrong })
            : t("academy.qg.survivalStats", { streak, best: Math.max(best, value) })}
        </p>
        {isRecord && <p className="text-sm font-medium text-fleur">{t("academy.qg.newRecord")}</p>}
        {mode === "survival" && death && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-left text-sm">
            <div className="mb-1 text-xs font-medium text-muted-foreground">{qText(death)}</div>
            <div className="text-success">✓ {optText(death, death.answer)}</div>
            {explainText(death) && <div className="mt-1 text-muted-foreground">{explainText(death)}</div>}
          </div>
        )}
        <div className="flex justify-center gap-2">
          <Button size="sm" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> {t("academy.qg.replay")}
          </Button>
          <Button variant="outline" size="sm" onClick={onExit}>
            {t("academy.qg.finish")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Bandeau de statut */}
      <div className="flex items-center justify-between text-sm">
        <button onClick={onExit} className="text-muted-foreground hover:text-foreground">
          {t("academy.qg.quit")}
        </button>
        <div className="flex items-center gap-4">
          {mode === "chrono" ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-semibold tabular-nums",
                timeLeft <= 10 ? "text-destructive" : "text-foreground",
              )}
            >
              <Timer className="h-4 w-4" /> {timeLeft}s
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-semibold text-destructive">
              <Heart className="h-4 w-4 fill-current" /> {t("academy.qg.suddenDeath")}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Check className="h-4 w-4 text-success" /> {mode === "chrono" ? correct : streak}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" /> {best}
          </span>
        </div>
      </div>

      {mode === "chrono" && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300",
              timeLeft <= 10 ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${(timeLeft / CHRONO_SECONDS) * 100}%` }}
          />
        </div>
      )}

      <p className="text-base font-medium">{qText(current)}</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {current.options.map((_, i) => {
          const revealed = picked != null;
          const isAnswer = i === current.answer;
          const isPicked = i === picked;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={revealed}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                !revealed && "border-border bg-background/40 hover:border-foreground/30",
                revealed && isAnswer && "border-success/50 bg-success/10",
                revealed && isPicked && !isAnswer && "border-destructive/50 bg-destructive/10",
                revealed && !isAnswer && !isPicked && "border-border/40 opacity-50",
              )}
            >
              <span>{optText(current, i)}</span>
              {revealed && isAnswer && <Check className="h-4 w-4 shrink-0 text-success" />}
              {revealed && isPicked && !isAnswer && <X className="h-4 w-4 shrink-0 text-destructive" />}
            </button>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {mode === "chrono" ? t("academy.qg.hintChrono") : t("academy.qg.hintSurvival")}
      </p>
    </div>
  );
}
