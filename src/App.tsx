import { useEffect } from "react";
import { useSettings } from "@/core/settings";
import { useAccounts } from "@/core/account";
import { bootAnalytics, track } from "@/core/analytics";
import { Workspace } from "@/shell/Workspace";
import { ConsentDialog } from "@/shell/ConsentDialog";
import { PrivacyDialog } from "@/shell/PrivacyDialog";
import { UpdateBanner } from "@/shell/UpdateBanner";
import { Toaster } from "@/components/ui/toaster";
import "@/modules"; // enregistre tous les modules-outils
import "@/shell/coreWidgets"; // enregistre les widgets transverses (personnage…)

export default function App() {
  const reduceMotion = useSettings((s) => s.reduceMotion);
  const language = useSettings((s) => s.language);

  // Recharge les sessions EVE connectées (depuis le trousseau, via le backend).
  useEffect(() => {
    void useAccounts.getState().refresh();
  }, []);

  // Analytics : on attend l'hydratation des réglages (persistance async) avant
  // de lire le consentement, sinon on lirait le défaut « unset ». Ensuite on
  // (ré)initialise PostHog selon le choix persisté et on marque l'ouverture.
  // `track` reste no-op tant qu'il n'y a pas d'opt-in.
  useEffect(() => {
    const boot = () => {
      bootAnalytics();
      track("app_opened", { language: useSettings.getState().language });
    };
    if (useSettings.persist.hasHydrated()) {
      boot();
      return;
    }
    return useSettings.persist.onFinishHydration(boot);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Workspace />
      <ConsentDialog />
      <PrivacyDialog />
      <UpdateBanner />
      <Toaster />
    </div>
  );
}
