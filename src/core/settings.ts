import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { namespacedStorage } from "@/core/storage/persist";

export type Language = "fr" | "en";
export type TimeDisplay = "local" | "eve";
/** État du consentement analytics : non demandé / accordé / refusé (opt-in). */
export type AnalyticsConsent = "unset" | "granted" | "denied";

interface SettingsState {
  /** Langue d'interface — pilote l'i18n du shell (`core/i18n`) ; les modules
   *  l'adoptent progressivement via `useT`/`useLocalized`. */
  language: Language;
  /** Affichage des heures : fuseau local ou temps EVE (UTC). */
  timeDisplay: TimeDisplay;
  /** Réduit les animations (accessibilité / préférence). */
  reduceMotion: boolean;
  /** Notifications locales (desktop) — opt-in, désactivées par défaut. */
  notifications: boolean;
  /** Consentement à l'analytics produit (opt-in strict). `unset` → demander. */
  analyticsConsent: AnalyticsConsent;
  /** Le tour d'accueil (shell) a-t-il déjà été proposé au 1er lancement ? */
  onboardingDone: boolean;
  /** Ids des tours déjà vus (shell + outils) — évite de re-proposer. */
  seenTours: string[];
  setLanguage: (l: Language) => void;
  setTimeDisplay: (t: TimeDisplay) => void;
  setReduceMotion: (b: boolean) => void;
  setNotifications: (b: boolean) => void;
  setAnalyticsConsent: (c: AnalyticsConsent) => void;
  setOnboardingDone: (b: boolean) => void;
  /** Marque un tour comme vu (idempotent). */
  markTourSeen: (id: string) => void;
  /** Réinitialise la liste des tours vus (et re-proposera l'accueil). */
  resetTours: () => void;
}

/**
 * Réglages globaux de la suite — persistés dans le namespace `shell` de la base
 * partagée. Les modules peuvent les lire pour rester cohérents (heures, langue…).
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: "fr",
      timeDisplay: "local",
      reduceMotion: false,
      notifications: false,
      analyticsConsent: "unset",
      onboardingDone: false,
      seenTours: [],
      setLanguage: (language) => set({ language }),
      setTimeDisplay: (timeDisplay) => set({ timeDisplay }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setNotifications: (notifications) => set({ notifications }),
      setAnalyticsConsent: (analyticsConsent) => set({ analyticsConsent }),
      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),
      markTourSeen: (id) =>
        set((s) => (s.seenTours.includes(id) ? s : { seenTours: [...s.seenTours, id] })),
      resetTours: () => set({ seenTours: [], onboardingDone: false }),
    }),
    {
      name: "settings",
      version: 1,
      storage: createJSONStorage(() => namespacedStorage("shell")),
    }
  )
);

/**
 * `true` une fois les réglages rechargés depuis la base (persistance async).
 * À utiliser avant toute décision qui dépend d'une valeur persistée (ex.
 * consentement analytics) pour éviter de lire le défaut « unset » au 1er rendu.
 */
export function useSettingsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSettings.persist.hasHydrated());
  useEffect(() => {
    const unsub = useSettings.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useSettings.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}
