import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { LocalizedText } from "@/core/i18n";

/** Cycle de maturité d'un outil dans la suite. */
export type ToolStatus = "stable" | "beta" | "soon";

/**
 * Déclaration de l'usage de l'API CCP par un module — sert à la transparence
 * (affichée à l'utilisateur) et au contrôle de conformité.
 */
export interface ToolEsiUsage {
  /** L'outil interroge-t-il l'ESI publique (sans login) ? */
  publicEsi: boolean;
  /** L'outil nécessite-t-il un login SSO (données authentifiées) ? */
  auth: boolean;
  /** Scopes ESI requis si auth (ex. "esi-skills.read_skills.v1"). */
  scopes?: string[];
  /** Autres API publiques utilisées (ex. "zKillboard"). */
  thirdParty?: string[];
  /**
   * Conçu « EULA-safe » : aucune interaction avec le client EVE
   * (pas d'injection, lecture mémoire, OCR ni automatisation d'entrées).
   */
  eulaSafe: boolean;
}

/** Empreinte par défaut d'un widget sur la grille du dashboard. */
export type WidgetSize = "sm" | "md" | "lg";

/** Valeurs de configuration d'une instance de widget. */
export type WidgetConfig = Record<string, string | number | boolean | undefined>;

/** Type d'un champ de configuration de widget. */
export type WidgetFieldType = "text" | "number" | "toggle" | "select";

export interface WidgetFieldOption {
  value: string;
  label: LocalizedText;
}

/** Un champ paramétrable d'un widget (données internes modifiables). */
export interface WidgetField {
  key: string;
  label: LocalizedText;
  type: WidgetFieldType;
  /** Options pour `type: "select"`. */
  options?: WidgetFieldOption[];
  placeholder?: string;
  default?: string | number | boolean;
}

/** Props reçues par le composant d'un widget : sa configuration d'instance. */
export interface WidgetProps {
  config: WidgetConfig;
}

/**
 * **Widget de dashboard** exposé par un outil : une tuile KPI / mini-graphe que
 * l'utilisateur peut ajouter, déplacer, redimensionner et **configurer**. Le
 * composant lit les données **de son propre outil** + sa `config` d'instance.
 */
export interface ToolWidget {
  /** Id unique **au sein de l'outil** (l'id global est `<moduleId>:<id>`). */
  id: string;
  /** Titre affiché (localisable). */
  title: LocalizedText;
  /** Icône optionnelle. */
  icon?: LucideIcon;
  /** Empreinte par défaut sur la grille. Défaut sm. */
  size?: WidgetSize;
  /** Champs de configuration (données internes modifiables par instance). */
  config?: WidgetField[];
  /** Contenu du widget (le shell fournit la carte, le titre et la config). */
  component: ComponentType<WidgetProps>;
}

/**
 * Contrat d'un **module-outil** de la suite (façon « app » Odoo).
 * Chaque outil expose ce manifeste ; le shell l'enregistre, l'affiche dans le
 * catalogue et monte son composant racine quand on l'ouvre.
 */
export interface ToolModule {
  /** Identifiant unique et stable (slug), ex. "mining". */
  id: string;
  /** Nom affiché (localisable) — ex. `{ fr: "Gestion de Flotte Minière", en: "Mining Fleet Manager" }`. */
  name: LocalizedText;
  /** Sous-titre court pour le lanceur (localisable). */
  tagline: LocalizedText;
  /** Description plus longue (carte du lanceur, localisable). */
  description: LocalizedText;
  /** Icône (lucide) du module. */
  icon: LucideIcon;
  /** Couleur d'accent CSS du module (ex. "hsl(var(--fleur))"). */
  accent: string;
  /** Maturité. */
  status: ToolStatus;
  /** Version du module. */
  version: string;
  /** Déclaration de conformité / usage API. */
  esi: ToolEsiUsage;
  /** Composant racine monté par le shell. */
  component: ComponentType;
  /** Widgets de dashboard exposés (optionnel) — KPIs/graphes personnalisables. */
  widgets?: ToolWidget[];
}
