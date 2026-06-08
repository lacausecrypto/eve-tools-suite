import { useState } from "react";
import { Gauge, GitBranch, Map as MapIcon, Wallet } from "lucide-react";
import { useT } from "@/core/i18n";
import { cn } from "@/lib/utils";
import { ExtractionSim } from "./components/ExtractionSim";
import { ChainPlanner } from "./components/ChainPlanner";
import { LayoutEditor } from "./components/LayoutEditor";
import { Portfolio } from "./components/Portfolio";

type Mode = "extraction" | "chain" | "layout" | "portfolio";

export function PiApp() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("extraction");

  return (
    <div data-tour="pi.root" className="mx-auto w-full max-w-6xl px-5 py-5 animate-fade-in">
      {/* Sélecteur de mode (segmented control) */}
      <div data-tour="pi.modeSelector" className="mb-4 inline-flex rounded-lg border border-border/60 bg-background/40 p-0.5">
        <ModeButton
          active={mode === "extraction"}
          onClick={() => setMode("extraction")}
          icon={<Gauge className="h-4 w-4" />}
          label={t("pi.mode.extraction")}
        />
        <ModeButton
          active={mode === "chain"}
          onClick={() => setMode("chain")}
          icon={<GitBranch className="h-4 w-4" />}
          label={t("pi.mode.chain")}
        />
        <ModeButton
          active={mode === "layout"}
          onClick={() => setMode("layout")}
          icon={<MapIcon className="h-4 w-4" />}
          label={t("pi.mode.layout")}
        />
        <ModeButton
          active={mode === "portfolio"}
          onClick={() => setMode("portfolio")}
          icon={<Wallet className="h-4 w-4" />}
          label={t("pi.mode.portfolio")}
        />
      </div>

      {mode === "extraction" && <ExtractionSim />}
      {mode === "chain" && <ChainPlanner />}
      {mode === "layout" && <LayoutEditor />}
      {mode === "portfolio" && <Portfolio />}
    </div>
  );
}

function ModeButton({
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
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
