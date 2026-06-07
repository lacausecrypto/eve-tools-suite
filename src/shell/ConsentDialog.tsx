import { BarChart3, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/core/i18n";
import { useSettings, useSettingsHydrated } from "@/core/settings";
import { analyticsConfigured, setConsent } from "@/core/analytics";
import { usePrivacyDialog } from "@/shell/PrivacyDialog";

/**
 * Bannière de consentement **opt-in strict** (RGPD). Ne s'affiche que si :
 * l'analytics est configurée (clé+host fournis au build) ET le choix n'a pas
 * encore été fait (`analyticsConsent === "unset"`). Aucun événement n'est
 * émis avant un clic explicite sur « Accepter ».
 */
export function ConsentDialog() {
  const t = useT();
  const consent = useSettings((s) => s.analyticsConsent);
  const hydrated = useSettingsHydrated();

  // N'ouvre qu'après hydratation (sinon « unset » par défaut → flash pour les
  // utilisateurs ayant déjà répondu).
  const open = hydrated && analyticsConfigured() && consent === "unset";

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-lg"
        // Pas de fermeture implicite : le choix doit être explicite.
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-fleur" /> {t("consent.title")}
          </DialogTitle>
          <DialogDescription>{t("consent.intro")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <div className="mb-1 font-medium">{t("consent.collected.title")}</div>
            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
              <li>{t("consent.bullet.lifecycle")}</li>
              <li>{t("consent.bullet.tools")}</li>
              <li>{t("consent.bullet.actions")}</li>
            </ul>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <div className="mb-0.5 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-fleur" /> {t("consent.never.title")}
            </div>
            <p className="text-muted-foreground">{t("consent.never.body")}</p>
          </div>
          <p className="text-[11px] text-muted-foreground/80">
            {t("consent.footer")}{" "}
            <button
              onClick={() => usePrivacyDialog.getState().show()}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {t("consent.privacy")}
            </button>
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => setConsent("denied")}>
            {t("consent.decline")}
          </Button>
          <Button onClick={() => setConsent("granted")}>{t("consent.accept")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
