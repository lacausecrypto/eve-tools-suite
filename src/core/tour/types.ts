/**
 * Tour produit (onboarding) — types partagés.
 * Un tour = une suite d'étapes ; chaque étape surligne un élément ancré
 * (`data-tour="<anchor>"`) et affiche une bulle d'explication bilingue.
 */
export type TourPlacement = "auto" | "top" | "bottom" | "left" | "right";

export interface TourStep {
  /** Valeur `data-tour` de l'élément à surligner. Absent ⇒ carte centrée. */
  anchor?: string;
  /** Clé i18n du titre de la bulle. */
  titleKey: string;
  /** Clé i18n du corps de la bulle. */
  bodyKey: string;
  /** Action à exécuter avant l'étape (ex. ouvrir un outil, changer d'onglet). */
  before?: () => void | Promise<void>;
  /** Placement préféré de la bulle (défaut « auto »). */
  placement?: TourPlacement;
}

export interface ModuleTour {
  /** Id stable du tour (= id du module, ou "shell" pour l'accueil). */
  id: string;
  /** Étapes ordonnées. */
  steps: TourStep[];
  /**
   * Pré-remplit des données d'exemple pour montrer un résultat « live ».
   * Doit renvoyer une fonction de restauration (rétablit l'état initial à la
   * fin du tour). Sans démo, renvoyer rien.
   */
  demo?: () => (() => void) | void;
}
