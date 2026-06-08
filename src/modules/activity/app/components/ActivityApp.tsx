import { useState } from "react";
import { Clock, Dice5, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { SessionView } from "./SessionView";
import { HistoryView } from "./HistoryView";
import { DropRatesView } from "./DropRatesView";

type Tab = "session" | "history" | "drops";

/**
 * Journal d'Activité — chrono + valorisation du butin (pricing VWAP) pour
 * mesurer l'ISK/heure de chaque activité, comparer les sessions et calculer les
 * taux de drop. Comble le vide laissé par l'Activity Tracker (retiré déc. 2024).
 */
export function ActivityApp() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("session");
  return (
    <div data-tour="activity.root" className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      <div data-tour="activity.tabs" className="mb-4 flex rounded-lg border border-border bg-card/40 p-1">
        <TabBtn active={tab === "session"} onClick={() => setTab("session")} icon={<Timer className="h-4 w-4" />}>
          {t("activity.tab.session")}
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} icon={<Clock className="h-4 w-4" />}>
          {t("activity.tab.history")}
        </TabBtn>
        <TabBtn active={tab === "drops"} onClick={() => setTab("drops")} icon={<Dice5 className="h-4 w-4" />}>
          {t("activity.tab.drops")}
        </TabBtn>
      </div>

      {tab === "session" ? <SessionView /> : tab === "history" ? <HistoryView /> : <DropRatesView />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
