import { useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { useAcademy } from "../store";
import { pct } from "../lib/format";
import type { Question } from "../lib/types";

/**
 * Moteur de quiz réutilisable : pose les questions une à une, révèle la bonne
 * réponse + explication, calcule le score et l'enregistre (XP, badges).
 */
export function QuizRunner({
  quizId,
  title,
  questions,
  onClose,
}: {
  quizId: string;
  title: string;
  questions: Question[];
  onClose?: () => void;
}) {
  const t = useT();
  const recordQuiz = useAcademy((s) => s.recordQuiz);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const q = questions[idx];
  const last = idx === questions.length - 1;
  const score = questions.length ? correct / questions.length : 0;

  // Texte traduit si la question porte une clé i18n, sinon littéral (jargon, etc.).
  const qText = (qq: Question) => (qq.tk ? t(`${qq.tk}.q`) : qq.q);
  const optText = (qq: Question, i: number) => (qq.tk ? t(`${qq.tk}.o${i}`) : qq.options[i]);
  const explainText = (qq: Question) =>
    qq.tk ? (qq.explain ? t(`${qq.tk}.explain`) : undefined) : qq.explain;

  function pick(i: number) {
    if (picked != null) return;
    setPicked(i);
    if (i === q.answer) setCorrect((c) => c + 1);
  }

  function next() {
    if (last) {
      if (!recorded) {
        recordQuiz(quizId, score);
        setRecorded(true);
      }
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
    }
  }

  function restart() {
    setIdx(0);
    setPicked(null);
    setCorrect(0);
    setDone(false);
    setRecorded(false);
  }

  const result = useMemo(() => {
    if (score >= 0.999) return { label: t("academy.qr.flawless"), tone: "text-success" };
    if (score >= 0.6) return { label: t("academy.qr.passed"), tone: "text-success" };
    return { label: t("academy.qr.retry"), tone: "text-amber-400" };
  }, [score, t]);

  if (!questions.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{t("academy.qr.noQuestions")}</p>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className={cn("text-3xl font-bold", result.tone)}>{pct(score)}</div>
        <div className={cn("text-sm font-medium", result.tone)}>{result.label}</div>
        <div className="text-sm text-muted-foreground">
          {t("academy.qr.correctCount", { n: correct, total: questions.length })}
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> {t("academy.qr.restart")}
          </Button>
          {onClose && (
            <Button size="sm" onClick={onClose}>
              {t("academy.qr.finish")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate font-medium">{title}</span>
        <span className="shrink-0 tabular-nums">
          {idx + 1} / {questions.length}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${((idx + (picked != null ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <p className="text-base font-medium">{qText(q)}</p>

      <div className="space-y-2">
        {q.options.map((_, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          const revealed = picked != null;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={revealed}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                !revealed && "border-border bg-background/40 hover:border-foreground/30",
                revealed && isAnswer && "border-success/50 bg-success/10",
                revealed && isPicked && !isAnswer && "border-destructive/50 bg-destructive/10",
                revealed && !isAnswer && !isPicked && "border-border/50 opacity-60",
              )}
            >
              <span>{optText(q, i)}</span>
              {revealed && isAnswer && <Check className="h-4 w-4 shrink-0 text-success" />}
              {revealed && isPicked && !isAnswer && <X className="h-4 w-4 shrink-0 text-destructive" />}
            </button>
          );
        })}
      </div>

      {picked != null && explainText(q) && (
        <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
          {explainText(q)}
        </p>
      )}

      {picked != null && (
        <div className="flex justify-end">
          <Button size="sm" onClick={next}>
            {last ? t("academy.qr.seeResult") : t("academy.qr.next")}
          </Button>
        </div>
      )}
    </div>
  );
}
