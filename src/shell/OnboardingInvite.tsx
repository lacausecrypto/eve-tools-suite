import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { BookOpen, Factory, Shield, TrendingUp, X } from "lucide-react";
import { useSettings, useSettingsHydrated } from "@/core/settings";
import { useTour } from "@/core/tour/store";
import { useT } from "@/core/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getModule } from "@/core/module/registry";
import { useWorkspace } from "@/core/workspace";
import { track, type OnboardingGoal } from "@/core/analytics";

/**
 * Onboarding par objectif : ouvre un outil pré-rempli par son tour de démo et
 * guide jusqu'au premier résultat. N'apparaît qu'une fois le consentement résolu
 * (après le ConsentDialog) et tant que l'onboarding n'a pas été proposé.
 */
export function OnboardingInvite() {
  const t = useT();
  const hydrated = useSettingsHydrated();
  const onboardingDone = useSettings((s) => s.onboardingDone);
  const consent = useSettings((s) => s.analyticsConsent);
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const setOnboardingDone = useSettings((s) => s.setOnboardingDone);
  const activeTour = useTour((s) => s.tour);

  if (!hydrated || onboardingDone || consent === "unset" || activeTour) return null;

  const start = (goal: OnboardingGoal, moduleId: string) => {
    setOnboardingDone(true);
    useWorkspace.getState().openModule(moduleId);
    track("onboarding_goal_selected", { goal, tool: moduleId as "market" | "industry" | "atelier" | "academy" });
    window.setTimeout(() => {
      const tour = getModule(moduleId)?.tour;
      if (tour) useTour.getState().start(tour);
    }, 80);
  };
  const later = () => setOnboardingDone(true);

  return createPortal(
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[90] w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl",
        !reduceMotion && "animate-fade-in",
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <TrendingUp className="h-4 w-4" />
        </span>
        <h3 className="flex-1 text-sm font-semibold text-foreground">{t("tour.invite.title")}</h3>
        <button
          onClick={later}
          aria-label={t("tour.invite.later")}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{t("tour.invite.body")}</p>
      <div className="grid grid-cols-2 gap-2">
        <Goal icon={<TrendingUp className="h-4 w-4" />} label={t("tour.goal.market")} onClick={() => start("market", "market")} />
        <Goal icon={<Factory className="h-4 w-4" />} label={t("tour.goal.industry")} onClick={() => start("industry", "industry")} />
        <Goal icon={<Shield className="h-4 w-4" />} label={t("tour.goal.combat")} onClick={() => start("combat", "atelier")} />
        <Goal icon={<BookOpen className="h-4 w-4" />} label={t("tour.goal.progression")} onClick={() => start("progression", "academy")} />
      </div>
      <div className="mt-2 flex justify-end">
        <Button variant="ghost" size="sm" onClick={later}>
          {t("tour.invite.later")}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

function Goal({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="justify-start">
      {icon}{label}
    </Button>
  );
}
