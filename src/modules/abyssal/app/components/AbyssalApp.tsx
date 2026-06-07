import { useState } from "react";
import { Telescope, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { EvaluateView } from "./EvaluateView";
import { ExploreView } from "./ExploreView";

type Tab = "evaluate" | "explore";

/**
 * Appraiser Abyssal — évalue la qualité d'un module muté (mutaplasmide) via
 * l'ESI dynamique : situe chaque attribut rollé dans sa plage possible. Mode
 * explorateur pour visualiser les plancher/plafond avant de roller. 100 % ESI
 * publique ; le prix de revente (contrats) reste l'affaire de MutaMarket.
 */
export function AbyssalApp() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("evaluate");
  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-5 animate-fade-in">
      <div className="mb-4 flex rounded-lg border border-border bg-card/40 p-1">
        <TabBtn active={tab === "evaluate"} onClick={() => setTab("evaluate")} icon={<Zap className="h-4 w-4" />}>
          {t("abyssal.tab.evaluate")}
        </TabBtn>
        <TabBtn active={tab === "explore"} onClick={() => setTab("explore")} icon={<Telescope className="h-4 w-4" />}>
          {t("abyssal.tab.explore")}
        </TabBtn>
      </div>

      {tab === "evaluate" ? <EvaluateView /> : <ExploreView />}
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
