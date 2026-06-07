import { useState } from "react";
import { Hammer, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/core/i18n";
import { GeneratorView } from "./GeneratorView";
import { AnalyzerView } from "./AnalyzerView";

type Tab = "generate" | "analyze";

/**
 * Atelier de Fit — deux modes partageant le moteur d'analyse :
 * - **Générer** : compose automatiquement un fit selon le besoin du pilote.
 * - **Analyser** : décortique un fit EFT collé.
 */
export function AtelierApp() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("generate");

  return (
    <div data-tour="atelier.root" className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      <div
        data-tour="atelier.tabs"
        className="mb-4 flex rounded-lg border border-border bg-card/40 p-1"
      >
        <TabBtn active={tab === "generate"} onClick={() => setTab("generate")} icon={<Wand2 className="h-4 w-4" />}>
          {t("atelier.tab.generate")}
        </TabBtn>
        <TabBtn active={tab === "analyze"} onClick={() => setTab("analyze")} icon={<Hammer className="h-4 w-4" />}>
          {t("atelier.tab.analyze")}
        </TabBtn>
      </div>

      {tab === "generate" ? <GeneratorView /> : <AnalyzerView />}
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
