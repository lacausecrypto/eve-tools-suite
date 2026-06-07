import { useState } from "react";
import { BookOpen, Target } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { Codex } from "./components/Codex";
import { Quiz } from "./components/Quiz";

type Tab = "codex" | "quiz";

/**
 * Ship Recognition Trainer — apprends à reconnaître les vaisseaux d'EVE et leur
 * doctrine (senseur, arme, tank, trou de résistance). 100 % local & hors-ligne :
 * données SDE statiques + rendus du CDN officiel. Aucune interaction client.
 */
export function ShipTrainerApp() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("codex");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      <div className="mb-4 inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
        <TabButton
          active={tab === "codex"}
          onClick={() => setTab("codex")}
          icon={<BookOpen className="h-4 w-4" />}
          label={t("ship.tab.codex")}
        />
        <TabButton
          active={tab === "quiz"}
          onClick={() => setTab("quiz")}
          icon={<Target className="h-4 w-4" />}
          label={t("ship.tab.quiz")}
        />
      </div>

      {tab === "codex" ? <Codex /> : <Quiz />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
