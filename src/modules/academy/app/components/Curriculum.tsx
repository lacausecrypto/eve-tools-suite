import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, ChevronRight, Clock, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { useAcademy } from "../store";
import { TRACKS, LESSON_INDEX, questionsForLesson, questionsForTrack } from "../data/curriculum";
import { LESSON_MEDIA } from "../data/lessonMedia";
import { LessonContent, type KeyedBlock } from "../lib/content";
import { QuizRunner } from "./QuizRunner";
import { ProgressRing } from "./bits";
import type { Lesson, Track } from "../lib/types";

type View =
  | { mode: "tracks" }
  | { mode: "track"; trackId: string }
  | { mode: "lesson"; lessonId: string };

export function Curriculum({ initialLessonId }: { initialLessonId?: string }) {
  const t = useT();
  const [view, setView] = useState<View>(
    initialLessonId ? { mode: "lesson", lessonId: initialLessonId } : { mode: "tracks" },
  );
  const completed = useAcademy((s) => s.completedLessons);
  const done = useMemo(() => new Set(completed), [completed]);

  if (view.mode === "lesson") {
    const entry = LESSON_INDEX.get(view.lessonId);
    if (!entry) return null;
    return (
      <LessonView
        track={entry.track}
        lesson={entry.lesson}
        read={done.has(entry.lesson.id)}
        onBack={() => setView({ mode: "track", trackId: entry.track.id })}
      />
    );
  }

  if (view.mode === "track") {
    const track = TRACKS.find((t) => t.id === view.trackId);
    if (!track) return null;
    return (
      <TrackView
        track={track}
        done={done}
        onBack={() => setView({ mode: "tracks" })}
        onOpenLesson={(id) => setView({ mode: "lesson", lessonId: id })}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {TRACKS.map((tr) => {
        const total = tr.lessons.length;
        const n = tr.lessons.filter((l) => done.has(l.id)).length;
        const Icon = tr.icon;
        return (
          <button
            key={tr.id}
            onClick={() => setView({ mode: "track", trackId: tr.id })}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card/40 p-4 text-left transition-colors hover:border-foreground/20"
          >
            <div
              className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/60"
              style={{ background: `${tr.accent}1a` }}
            >
              <Icon className="h-5 w-5" style={{ color: tr.accent }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-semibold">{t(`academy.track.${tr.id}.title`)}</h3>
                <Badge variant="muted">{t(`academy.level.${tr.level}`)}</Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {t(`academy.track.${tr.id}.subtitle`)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("academy.cur.lessonsCount", { n, total })}
              </p>
            </div>
            <ProgressRing
              value={total ? n / total : 0}
              color={tr.accent}
              label={`${Math.round((total ? n / total : 0) * 100)}`}
            />
          </button>
        );
      })}
    </div>
  );
}

function TrackView({
  track,
  done,
  onBack,
  onOpenLesson,
}: {
  track: Track;
  done: Set<string>;
  onBack: () => void;
  onOpenLesson: (id: string) => void;
}) {
  const t = useT();
  const [quiz, setQuiz] = useState(false);
  const allQuestions = useMemo(() => questionsForTrack(track.id), [track.id]);
  const n = track.lessons.filter((l) => done.has(l.id)).length;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("academy.cur.back")}
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <track.icon className="h-6 w-6" style={{ color: track.accent }} />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{t(`academy.track.${track.id}.title`)}</h2>
          <p className="text-sm text-muted-foreground">{t(`academy.track.${track.id}.subtitle`)}</p>
        </div>
        <Badge variant="muted">{t(`academy.level.${track.level}`)}</Badge>
        <Button variant={quiz ? "secondary" : "outline"} size="sm" onClick={() => setQuiz((q) => !q)}>
          <GraduationCap className="h-4 w-4" />{" "}
          {t("academy.cur.trackQuiz", { n: allQuestions.length })}
        </Button>
      </div>

      {quiz ? (
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <QuizRunner
            quizId={`track:${track.id}`}
            title={t("academy.cur.quizTitle", { title: t(`academy.track.${track.id}.title`) })}
            questions={allQuestions}
            onClose={() => setQuiz(false)}
          />
        </div>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            {t("academy.cur.lessonsRead", { n, total: track.lessons.length })}
          </div>
          <div className="space-y-2">
            {track.lessons.map((l, i) => (
              <button
                key={l.id}
                onClick={() => onOpenLesson(l.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card/40 p-3 text-left transition-colors hover:border-foreground/20"
              >
                <div
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium",
                    done.has(l.id)
                      ? "border-success/50 bg-success/15 text-success"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {done.has(l.id) ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {t(`academy.lesson.${l.id}.title`)}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t(`academy.lesson.${l.id}.summary`)}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {t("academy.cur.minutes", { n: l.minutes })}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LessonView({
  track,
  lesson,
  read,
  onBack,
}: {
  track: Track;
  lesson: Lesson;
  read: boolean;
  onBack: () => void;
}) {
  const t = useT();
  const completeLesson = useAcademy((s) => s.completeLesson);
  const [quiz, setQuiz] = useState(false);

  const lessonTitle = t(`academy.lesson.${lesson.id}.title`);
  const blocks = useMemo<KeyedBlock[]>(() => {
    const media = (LESSON_MEDIA[lesson.id] ?? []).map((block, i) => ({
      block,
      tk: `academy.media.${lesson.id}.b${i}`,
    }));
    const body = lesson.blocks.map((block, i) => ({
      block,
      tk: `academy.lesson.${lesson.id}.b${i}`,
    }));
    return [...media, ...body];
  }, [lesson]);
  const questions = useMemo(() => questionsForLesson(lesson.id), [lesson.id]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t(`academy.track.${track.id}.title`)}
      </button>

      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5" /> {t("academy.cur.readMinutes", { n: lesson.minutes })}
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{lessonTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`academy.lesson.${lesson.id}.summary`)}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-5">
        <LessonContent blocks={blocks} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {read ? (
          <Badge variant="success" className="gap-1">
            <Check className="h-3.5 w-3.5" /> {t("academy.cur.read")}
          </Badge>
        ) : (
          <Button size="sm" onClick={() => completeLesson(lesson.id)}>
            <Check className="h-4 w-4" /> {t("academy.cur.markRead")}
          </Button>
        )}
        {questions.length > 0 && (
          <Button variant={quiz ? "secondary" : "outline"} size="sm" onClick={() => setQuiz((q) => !q)}>
            <GraduationCap className="h-4 w-4" /> {t("academy.cur.lessonQuiz")}
          </Button>
        )}
      </div>

      {quiz && questions.length > 0 && (
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <QuizRunner
            quizId={`lesson:${lesson.id}`}
            title={t("academy.cur.quizTitle", { title: lessonTitle })}
            questions={questions}
            onClose={() => setQuiz(false)}
          />
        </div>
      )}
    </div>
  );
}
