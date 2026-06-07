import { useState } from "react";
import { GraduationCap, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/core/i18n";
import { useAcademy } from "../store";
import { TRACKS, ALL_QUESTIONS, questionsForTrack } from "../data/curriculum";
import { pct } from "../lib/format";
import { QuizRunner } from "./QuizRunner";
import type { Question } from "../lib/types";

type Active =
  | null
  | { quizId: string; title: string; questions: Question[] };

const REVISION_SIZE = 10;

export function QuizCenter() {
  const t = useT();
  const quizBest = useAcademy((s) => s.quizBest);
  const [active, setActive] = useState<Active>(null);

  const startRevision = () => {
    const shuffled = [...ALL_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, REVISION_SIZE);
    setActive({ quizId: "revision", title: t("academy.qc.revision"), questions: shuffled });
  };

  if (active) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card/40 p-5">
        <QuizRunner
          quizId={active.quizId}
          title={active.title}
          questions={active.questions}
          onClose={() => setActive(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={startRevision}
        className="flex w-full items-center gap-4 rounded-xl border border-fleur/30 bg-fleur/5 p-4 text-left transition-colors hover:border-fleur/50"
      >
        <div className="grid size-11 place-items-center rounded-xl border border-fleur/40 bg-fleur/10">
          <Shuffle className="h-5 w-5 text-fleur" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">{t("academy.qc.revision")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("academy.qc.revisionDesc", { n: REVISION_SIZE })}
          </p>
        </div>
        {quizBest["revision"] != null && (
          <Badge variant="muted">{t("academy.qc.record", { pct: pct(quizBest["revision"]) })}</Badge>
        )}
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        {TRACKS.map((tr) => {
          const questions = questionsForTrack(tr.id);
          const best = quizBest[`track:${tr.id}`];
          const title = t(`academy.track.${tr.id}.title`);
          return (
            <div
              key={tr.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/40 p-4"
            >
              <tr.icon className="h-5 w-5 shrink-0" style={{ color: tr.accent }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{title}</div>
                <div className="text-xs text-muted-foreground">
                  {t("academy.qc.questionsCount", { n: questions.length })}
                  {best != null && <> · {t("academy.qc.recordInline", { pct: pct(best) })}</>}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setActive({
                    quizId: `track:${tr.id}`,
                    title: t("academy.cur.quizTitle", { title }),
                    questions,
                  })
                }
              >
                <GraduationCap className="h-4 w-4" /> {t("academy.qc.start")}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
