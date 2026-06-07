/**
 * Petit utilitaire pour distinguer les **erreurs applicatives** de l'Atelier
 * (EFT invalide, coque introuvable, coque non gérée…) des erreurs réseau/ESI.
 * Hors application desktop, l'ESI direct est bloqué : on n'affiche le message
 * tel quel que pour nos propres erreurs (déjà localisées via `t()`).
 */
import { translate } from "@/core/i18n";

/** Clés de message correspondant à des erreurs métier levées par `api.ts`. */
const APP_ERROR_KEYS = [
  "atelier.err.eftFormat",
  "atelier.err.hullNotFound",
  "atelier.err.notAHull",
  "atelier.err.unsupported",
] as const;

/**
 * Vrai si `message` correspond à l'une de nos erreurs applicatives (dans l'une
 * des langues connues). Compare sur le préfixe stable précédant toute partie
 * interpolée (« {name} »).
 */
export function isAppError(message: string): boolean {
  for (const key of APP_ERROR_KEYS) {
    for (const lang of ["fr", "en"] as const) {
      const template = translate(key, lang);
      const stable = template.split("{")[0].trim();
      if (stable.length >= 4 && message.includes(stable)) return true;
    }
  }
  return false;
}
