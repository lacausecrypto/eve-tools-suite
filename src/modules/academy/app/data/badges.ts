import {
  Award,
  BookOpen,
  Brain,
  Flame,
  GraduationCap,
  Medal,
  Rocket,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";
import type { Badge } from "../lib/types";
import { TRACKS } from "./curriculum";

/** Catalogue des badges (succès) — évalués d'après l'état de progression. */
export const BADGES: Badge[] = [
  {
    id: "first-steps",
    title: "Premiers pas",
    desc: "Lire ta première leçon.",
    icon: Rocket,
    earned: (p) => p.completedLessons.length >= 1,
  },
  {
    id: "studious",
    title: "Studieux",
    desc: "Lire 5 leçons.",
    icon: BookOpen,
    earned: (p) => p.completedLessons.length >= 5,
  },
  {
    id: "scholar",
    title: "Érudit",
    desc: "Lire 15 leçons.",
    icon: Brain,
    earned: (p) => p.completedLessons.length >= 15,
  },
  {
    id: "graduate-beginner",
    title: "Diplômé débutant",
    desc: "Terminer le cursus « Premiers pas ».",
    icon: GraduationCap,
    earned: (p) => p.tracksCompleted.includes("premiers-pas"),
  },
  {
    id: "warrior",
    title: "Tacticien",
    desc: "Terminer le cursus « Combat & survie ».",
    icon: ShieldCheck,
    earned: (p) => p.tracksCompleted.includes("combat-survie"),
  },
  {
    id: "all-tracks",
    title: "Major de promo",
    desc: "Terminer tous les cursus.",
    icon: Trophy,
    earned: (p) => p.tracksCompleted.length >= TRACKS.length,
  },
  {
    id: "first-quiz",
    title: "Premier quiz",
    desc: "Réussir un quiz.",
    icon: Star,
    earned: (p) => Object.values(p.quizBest).some((s) => s >= 0.6),
  },
  {
    id: "perfectionist",
    title: "Sans faute",
    desc: "Réussir un quiz à 100 %.",
    icon: Medal,
    earned: (p) => p.perfectQuizzes >= 1,
  },
  {
    id: "ace",
    title: "As des examens",
    desc: "5 quiz parfaits.",
    icon: Award,
    earned: (p) => p.perfectQuizzes >= 5,
  },
  {
    id: "streak-7",
    title: "Assidu",
    desc: "7 jours de série.",
    icon: Flame,
    earned: (p) => p.streak >= 7,
  },
  {
    id: "level-10",
    title: "Officier",
    desc: "Atteindre le niveau 10.",
    icon: Trophy,
    earned: (p) => p.level >= 10,
  },
];
