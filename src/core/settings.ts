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
  setLanguage: (l: Language) => void;
  setTimeDisplay: (t: TimeDisplay) => void;
  setReduceMotion: (b: boolean) => void;
  setNotifications: (b: boolean) => void;
  setAnalyticsConsent: (c: AnalyticsConsent) => void;
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
      setLanguage: (language) => set({ language }),
      setTimeDisplay: (timeDisplay) => set({ timeDisplay }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setNotifications: (notifications) => set({ notifications }),
      setAnalyticsConsent: (analyticsConsent) => set({ analyticsConsent }),
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
