import { createPortal } from "react-dom";
import { Compass, X } from "lucide-react";
import { useSettings, useSettingsHydrated } from "@/core/settings";
import { useTour } from "@/core/tour/store";
import { useT } from "@/core/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SHELL_TOUR } from "./tour";

/**
 * Invitation douce au 1er lancement : carte non-modale (bas-droite) proposant
 * le tour d'accueil. N'apparaît qu'une fois le consentement analytics résolu
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

  const start = () => {
    setOnboardingDone(true);
    useTour.getState().start(SHELL_TOUR);
  };
  const later = () => setOnboardingDone(true);

  return createPortal(
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[90] w-80 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl",
        !reduceMotion && "animate-fade-in",
      )}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-lg bg-primary/15 text-primary">
          <Compass className="h-4 w-4" />
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
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={start}>
          {t("tour.invite.start")}
        </Button>
        <Button variant="ghost" size="sm" onClick={later}>
          {t("tour.invite.later")}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
