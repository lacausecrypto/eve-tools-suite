/** Progression : courbe de niveaux, titres, récompenses XP. */

/** XP gagné par action. */
export const XP = {
  lesson: 15, // lire une leçon (une seule fois)
  quizPerfect: 30, // quiz à 100 %
  quizPass: 18, // quiz ≥ 60 %
  card: 2, // révision de flashcard réussie
} as const;

/** XP cumulé requis pour **atteindre** le niveau L (L ≥ 1 → seuil 0 au niv. 1). */
function threshold(level: number): number {
  // Somme 100·k pour k=1..L-1  →  100·(L-1)·L/2
  return 100 * ((level - 1) * level) / 2;
}

export interface LevelInfo {
  level: number;
  title: string;
  /** XP accumulé dans le niveau courant. */
  intoLevel: number;
  /** XP total du niveau courant (largeur de la barre). */
  span: number;
  /** Progression 0..1 dans le niveau. */
  progress: number;
  /** XP restant pour le niveau suivant. */
  toNext: number;
}

/** Titre thématique selon le niveau atteint. */
export function titleFor(level: number): string {
  if (level >= 25) return "Légende de New Eden";
  if (level >= 20) return "Capsuleer d'élite";
  if (level >= 15) return "Vétéran";
  if (level >= 11) return "Commandant";
  if (level >= 8) return "Officier";
  if (level >= 5) return "Pilote confirmé";
  if (level >= 3) return "Aspirant";
  return "Recrue";
}

/** Décompose un total d'XP en niveau + progression. */
export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xp >= threshold(level + 1)) level++;
  const base = threshold(level);
  const span = threshold(level + 1) - base; // = 100·level
  const intoLevel = xp - base;
  return {
    level,
    title: titleFor(level),
    intoLevel,
    span,
    progress: span > 0 ? intoLevel / span : 0,
    toNext: span - intoLevel,
  };
}
