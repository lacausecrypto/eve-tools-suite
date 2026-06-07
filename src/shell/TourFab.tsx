import { HelpCircle } from "lucide-react";
import { getModule } from "@/core/module/registry";
import { useWorkspace } from "@/core/workspace";
import { useSettings } from "@/core/settings";
import { useTour } from "@/core/tour/store";
import { useT } from "@/core/i18n";
import { SHELL_ANCHOR } from "@/core/tour/anchors";
import { cn } from "@/lib/utils";

/**
 * Pastille « Visite guidée » flottante (bas-droite de la zone d'outil) qui lance
 * le tour de l'outil actif. Anneau pulsé tant que le tour n'a pas été vu.
 */
export function TourFab() {
  const t = useT();
  const activeId = useWorkspace((s) => s.activeId);
  const tabs = useWorkspace((s) => s.tabs);
  const seen = useSettings((s) => s.seenTours);
  const reduceMotion = useSettings((s) => s.reduceMotion);

  const tab = tabs.find((x) => x.id === activeId);
  const mod = tab?.kind === "module" && tab.moduleId ? getModule(tab.moduleId) : undefined;
  const tour = mod?.tour;
  if (!tour) return null;

  const unseen = !seen.includes(tour.id);

  return (
    <div className="absolute bottom-4 right-4 z-40">
      {unseen && !reduceMotion && (
        <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/30" />
      )}
      <button
        data-tour={SHELL_ANCHOR.tourBtn}
        onClick={() => useTour.getState().start(tour)}
        title={t("tour.fab.label")}
        aria-label={t("tour.fab.label")}
        className={cn(
          "relative inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          unseen
            ? "border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90"
            : "border-border bg-card/95 text-foreground hover:border-primary/50",
        )}
      >
        <HelpCircle className="h-[18px] w-[18px]" />
        {t("tour.fab.cta")}
      </button>
    </div>
  );
}
