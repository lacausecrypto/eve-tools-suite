import { useState } from "react";
import { Boxes, Calculator as CalcIcon, GitBranch, NotebookPen } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { Calculator } from "./components/Calculator";
import { Tree } from "./components/Tree";
import { Ledger } from "./components/Ledger";
import { Assets } from "./components/Assets";

type Mode = "calc" | "tree" | "ledger" | "assets";

/**
 * Industry & Asset Cost Tracker — calcule le coût de revient réel d'une
 * production (formules EVE : ME, EIV, coût d'install, profit), suit tes jobs
 * dans un carnet, et valorise ton inventaire au prix Jita. Prix publics → pas de
 * login requis ; import ESI des jobs/actifs prêt pour M5.
 */
export function IndustryApp() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("calc");

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      <div className="mb-4 inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
        <Tab active={mode === "calc"} onClick={() => setMode("calc")} icon={<CalcIcon className="h-4 w-4" />} label={t("ind.tab.calc")} />
        <Tab active={mode === "tree"} onClick={() => setMode("tree")} icon={<GitBranch className="h-4 w-4" />} label={t("ind.tab.tree")} />
        <Tab active={mode === "ledger"} onClick={() => setMode("ledger")} icon={<NotebookPen className="h-4 w-4" />} label={t("ind.tab.ledger")} />
        <Tab active={mode === "assets"} onClick={() => setMode("assets")} icon={<Boxes className="h-4 w-4" />} label={t("ind.tab.assets")} />
      </div>

      {mode === "calc" && <Calculator />}
      {mode === "tree" && <Tree />}
      {mode === "ledger" && <Ledger />}
      {mode === "assets" && <Assets />}
    </div>
  );
}

function Tab({
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
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
