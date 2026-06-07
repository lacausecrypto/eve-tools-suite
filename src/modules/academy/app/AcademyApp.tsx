import { useState } from "react";
import {
  BookMarked,
  Dumbbell,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { Home } from "./components/Home";
import { Curriculum } from "./components/Curriculum";
import { QuizCenter } from "./components/QuizCenter";
import { Training } from "./components/Training";
import { Glossary } from "./components/Glossary";

type Page = "home" | "cursus" | "quiz" | "training" | "glossary";

const NAV: { id: Page; icon: typeof LayoutDashboard }[] = [
  { id: "home", icon: LayoutDashboard },
  { id: "cursus", icon: GraduationCap },
  { id: "quiz", icon: ListChecks },
  { id: "training", icon: Dumbbell },
  { id: "glossary", icon: BookMarked },
];

/**
 * EVE Academy — plateforme d'apprentissage ludique : cursus structurés, quiz,
 * entraînement (reconnaissance des vaisseaux + flashcards à répétition espacée),
 * glossaire, XP/niveaux/badges. 100 % local & hors-ligne.
 */
export function AcademyApp() {
  const t = useT();
  const [page, setPage] = useState<Page>("home");
  const [pendingLesson, setPendingLesson] = useState<string | undefined>();

  const goto = (p: Page) => {
    setPendingLesson(undefined);
    setPage(p);
  };

  const openLesson = (id: string) => {
    setPendingLesson(id);
    setPage("cursus");
  };

  return (
    <div data-tour="academy.root" className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      {/* Navigation */}
      <nav data-tour="academy.nav" className="mb-5 flex flex-wrap gap-1.5">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = page === n.id;
          return (
            <button
              key={n.id}
              onClick={() => goto(n.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t(`academy.nav.${n.id}`)}
            </button>
          );
        })}
      </nav>

      {page === "home" && <Home onOpenLesson={openLesson} onGotoCursus={() => goto("cursus")} />}
      {page === "cursus" && (
        <Curriculum key={pendingLesson ?? "root"} initialLessonId={pendingLesson} />
      )}
      {page === "quiz" && <QuizCenter />}
      {page === "training" && <Training />}
      {page === "glossary" && <Glossary />}
    </div>
  );
}
