/**
 * Moteur de quiz du Ship Recognition Trainer — **pur et déterministe** (RNG
 * injectable) pour être testable. Aucune dépendance React, aucun effet de bord :
 * on génère des questions à choix multiples à partir du dataset SDE et des règles
 * de doctrine canoniques.
 */
import {
  RACES,
  SENSORS,
  WEAPON_SYSTEMS,
  resistHole,
  sensorOf,
  type Damage,
  type Race,
  type SensorType,
  type Weapon,
} from "../data/doctrine";
import { SHIPS, type Ship } from "../data/ships";

/** Modes de quiz disponibles. */
export type QuizMode = "identify" | "race" | "sensor" | "weapon" | "resist";

export const QUIZ_MODES: QuizMode[] = [
  "identify",
  "race",
  "sensor",
  "weapon",
  "resist",
];

/** Une option de réponse (déjà rendue en chaîne affichable). */
export interface QuizOption {
  /** Valeur brute (nom de coque, race, senseur, arme ou dégât). */
  value: string;
  /** Vrai si c'est la bonne réponse. */
  correct: boolean;
}

/** Une question générée. */
export interface QuizQuestion {
  mode: QuizMode;
  /** Coque sujet (toujours présente — `resist` s'appuie sur son tank). */
  subject: Ship;
  /** Affiche-t-on le rendu 3D de la coque ? (identify/race : oui, et utile partout) */
  showRender: boolean;
  /** Doit-on masquer le nom de la coque ? (vrai pour `identify` et `race`) */
  hideName: boolean;
  /** Options mélangées. */
  options: QuizOption[];
  /** La bonne valeur (raccourci). */
  answer: string;
}

/** Fonction aléatoire dans [0,1) — injectable pour les tests. */
export type Rng = () => number;

/** PRNG déterministe (mulberry32) — pour des sessions reproductibles/testables. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entier dans [0, n). */
function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

/** Élément aléatoire d'un tableau (non vide). */
function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[randInt(rng, arr.length)];
}

/** Mélange de Fisher–Yates (copie, pur). */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tire `count` distracteurs distincts dans `pool`, en excluant `answer`.
 * Si le pool est trop petit, renvoie autant de distracteurs que possible.
 */
function distractors<T>(
  rng: Rng,
  pool: readonly T[],
  answer: T,
  count: number,
): T[] {
  const candidates = pool.filter((x) => x !== answer);
  return shuffle(candidates, rng).slice(0, count);
}

/** Construit des options (correct + distracteurs) déjà mélangées. */
function buildOptions(rng: Rng, answer: string, distract: string[]): QuizOption[] {
  const opts: QuizOption[] = [
    { value: answer, correct: true },
    ...distract.map((value) => ({ value, correct: false })),
  ];
  return shuffle(opts, rng);
}

/** Coques utilisables pour le quiz « arme » (vrai système d'arme uniquement). */
const WEAPON_SUBJECTS = SHIPS.filter((s) =>
  (WEAPON_SYSTEMS as Weapon[]).includes(s.weapon),
);

/**
 * Génère une question pour un mode donné. `rng` par défaut = `Math.random`.
 * Les distracteurs d'« identify » privilégient la même classe (plus difficile).
 */
export function makeQuestion(mode: QuizMode, rng: Rng = Math.random): QuizQuestion {
  switch (mode) {
    case "identify": {
      const subject = pick(rng, SHIPS);
      // Distracteurs : d'abord même classe, complétés si besoin par d'autres.
      const sameClass = SHIPS.filter(
        (s) => s.class === subject.class && s.name !== subject.name,
      ).map((s) => s.name);
      const others = SHIPS.filter((s) => s.name !== subject.name).map((s) => s.name);
      const distract = shuffle(
        Array.from(new Set([...shuffle(sameClass, rng), ...shuffle(others, rng)])),
        rng,
      ).slice(0, 3);
      return {
        mode,
        subject,
        showRender: true,
        hideName: true,
        options: buildOptions(rng, subject.name, distract),
        answer: subject.name,
      };
    }
    case "race": {
      const subject = pick(rng, SHIPS);
      return {
        mode,
        subject,
        showRender: true,
        hideName: true,
        options: buildOptions(
          rng,
          subject.race,
          distractors<Race>(rng, RACES, subject.race, 3),
        ),
        answer: subject.race,
      };
    }
    case "sensor": {
      const subject = pick(rng, SHIPS);
      const answer = sensorOf(subject.race);
      return {
        mode,
        subject,
        showRender: true,
        hideName: false,
        options: buildOptions(
          rng,
          answer,
          distractors<SensorType>(rng, SENSORS, answer, 3),
        ),
        answer,
      };
    }
    case "weapon": {
      const subject = pick(rng, WEAPON_SUBJECTS);
      const answer = subject.weapon;
      return {
        mode,
        subject,
        showRender: true,
        hideName: false,
        options: buildOptions(
          rng,
          answer,
          distractors<Weapon>(rng, WEAPON_SYSTEMS, answer, 3),
        ),
        answer,
      };
    }
    case "resist": {
      const subject = pick(rng, SHIPS);
      const answer = resistHole(subject.tank);
      const damages: Damage[] = ["EM", "Thermal", "Kinetic", "Explosive"];
      return {
        mode,
        subject,
        showRender: true,
        hideName: false,
        options: buildOptions(
          rng,
          answer,
          distractors<Damage>(rng, damages, answer, 3),
        ),
        answer,
      };
    }
  }
}

/**
 * Génère une session de `count` questions tirées parmi `modes`. Évite de répéter
 * deux fois de suite la même coque (confort), sans garantir l'unicité globale.
 */
export function makeSession(
  modes: QuizMode[],
  count: number,
  rng: Rng = Math.random,
): QuizQuestion[] {
  const pool = modes.length ? modes : QUIZ_MODES;
  const out: QuizQuestion[] = [];
  let lastSubject = -1;
  let guard = 0;
  while (out.length < count && guard < count * 12) {
    guard++;
    const q = makeQuestion(pick(rng, pool), rng);
    if (q.subject.typeId === lastSubject) continue;
    lastSubject = q.subject.typeId;
    out.push(q);
  }
  return out;
}
