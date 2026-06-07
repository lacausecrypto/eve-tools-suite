import { useMemo } from "react";
import { useT } from "@/core/i18n";
import { GLOSSARY } from "../data/glossary";
import type { Question } from "../lib/types";
import { QuizRunner } from "./QuizRunner";

const ROUNDS = 12;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Génère des questions « définition → terme » depuis le glossaire (traduit). */
function buildQuestions(t: (key: string) => string): Question[] {
  const terms = shuffle(GLOSSARY).slice(0, ROUNDS);
  return terms.map((term) => {
    const label = (x: { term: string }) => t(`academy.glo.${x.term}.term`);
    const distractors = shuffle(GLOSSARY.filter((x) => x.term !== term.term))
      .slice(0, 3)
      .map(label);
    const correct = label(term);
    const options = shuffle([correct, ...distractors]);
    const short = term.short ? t(`academy.glo.${term.term}.short`) : "";
    return {
      q: t(`academy.glo.${term.term}.def`),
      options,
      answer: options.indexOf(correct),
      explain: short ? `${correct} (${short})` : correct,
    };
  });
}

/** Mode Jargon : on lit une définition, on retrouve le terme EVE. */
export function JargonGame({ onExit }: { onExit: () => void }) {
  const t = useT();
  const questions = useMemo(() => buildQuestions(t), [t]);
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card/40 p-5">
      <QuizRunner
        quizId="game:jargon"
        title={t("academy.jargon.title")}
        questions={questions}
        onClose={onExit}
      />
    </div>
  );
}
