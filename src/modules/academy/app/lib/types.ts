/** Types du module EVE Academy (école-like : cursus, quiz, entraînement). */
import type { LucideIcon } from "lucide-react";

/** Bloc de contenu d'une leçon (format léger, sans dépendance markdown). */
export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "tip"; text: string }
  | { t: "warn"; text: string }
  | { t: "kv"; title?: string; rows: [string, string][] }
  // Image officielle (CDN CCP images.evetech.net) par type_id.
  | { t: "img"; typeId: number; variant: "render" | "icon"; caption?: string }
  | {
      t: "gallery";
      caption?: string;
      items: { typeId: number; label: string; variant?: "render" | "icon" }[];
    };

/** Question à choix multiple (quiz). */
export interface Question {
  q: string;
  options: string[];
  /** Index de la bonne réponse. */
  answer: number;
  /** Explication affichée après réponse. */
  explain?: string;
  /**
   * Base de clé i18n de la question (ex. « academy.lesson.capsule.q0 »).
   * Si présente, le moteur de quiz affiche `tk.q` / `tk.oN` / `tk.explain`.
   * Sinon (questions générées, ex. jargon) il affiche les chaînes littérales.
   */
  tk?: string;
}

/** Une leçon : contenu + questions associées. */
export interface Lesson {
  id: string;
  title: string;
  summary: string;
  /** Durée de lecture estimée (min). */
  minutes: number;
  blocks: Block[];
  questions: Question[];
}

export type TrackLevel = "Débutant" | "Intermédiaire" | "Avancé";

/** Un cursus (parcours d'apprentissage) regroupant des leçons. */
export interface Track {
  id: string;
  title: string;
  subtitle: string;
  level: TrackLevel;
  icon: LucideIcon;
  accent: string;
  lessons: Lesson[];
}

/** Terme du glossaire. */
export interface Term {
  term: string;
  short: string; // sigle/alias éventuel
  def: string;
  tags?: string[];
}

/** Carte de révision (flashcard, répétition espacée Leitner). */
export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

/** Paquet de flashcards thématique. */
export interface Deck {
  id: string;
  title: string;
  description: string;
  cards: Flashcard[];
}

/** Définition d'un badge (succès). */
export interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  /** Évalue si le badge est acquis d'après l'état de progression. */
  earned: (p: BadgeContext) => boolean;
}

/** Contexte fourni à l'évaluation des badges. */
export interface BadgeContext {
  xp: number;
  level: number;
  completedLessons: string[];
  quizBest: Record<string, number>;
  streak: number;
  reviewedCards: number;
  /** Cursus 100 % terminés (toutes leçons lues). */
  tracksCompleted: string[];
  /** Quiz réussis à 100 %. */
  perfectQuizzes: number;
}
