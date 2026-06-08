import { Award, Brain, Flame, GraduationCap, Target, Trophy } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { AcademyModule } from "./AcademyModule";
import { academyTour } from "./tour";
import {
  AcademyBadgesWidget,
  AcademyFlashcardsWidget,
  AcademyLevelWidget,
  AcademyQuizWidget,
  AcademyStreakWidget,
  academyBadgesConfig,
  academyLevelConfig,
  academyQuizConfig,
} from "./widgets";

export const academyManifest: ToolModule = {
  id: "academy",
  name: { fr: "Académie EVE", en: "EVE Academy" },
  tagline: {
    fr: "Apprends EVE en t'amusant : cursus, quiz, entraînement & niveaux",
    en: "Learn EVE the fun way: courses, quizzes, drills & levels",
  },
  description: {
    fr:
      "Une école pour New Eden : cursus structurés du débutant à l'avancé " +
      "(navigation, combat, économie, vie en corp), quiz notés, glossaire du jargon, " +
      "et un hub d'entraînement ludique — reconnaissance des vaisseaux + flashcards à " +
      "répétition espacée. Gagne de l'XP, monte en niveau, débloque des badges et " +
      "entretiens ta série quotidienne. 100 % local & hors-ligne.",
    en:
      "A school for New Eden: structured courses from beginner to advanced " +
      "(navigation, combat, economy, corp life), graded quizzes, a jargon glossary, " +
      "and a gamified training hub — hull recognition + spaced-repetition flashcards. " +
      "Earn XP, level up, unlock badges and keep your daily streak. 100% local & offline.",
  },
  icon: GraduationCap,
  accent: "hsl(var(--fleur))",
  status: "stable",
  version: "0.1.0",
  esi: {
    publicEsi: false,
    auth: false,
    thirdParty: ["images.evetech.net (CDN officiel CCP)"],
    eulaSafe: true,
  },
  component: AcademyModule,
  tour: academyTour,
  widgets: [
    {
      id: "level",
      title: { fr: "Academy — niveau & XP", en: "Academy — level & XP" },
      icon: Trophy,
      size: "md",
      config: academyLevelConfig,
      component: AcademyLevelWidget,
    },
    {
      id: "streak",
      title: { fr: "Academy — série", en: "Academy — streak" },
      icon: Flame,
      size: "sm",
      component: AcademyStreakWidget,
    },
    {
      id: "badges",
      title: { fr: "Academy — badges", en: "Academy — badges" },
      icon: Award,
      size: "sm",
      config: academyBadgesConfig,
      component: AcademyBadgesWidget,
    },
    {
      id: "quiz",
      title: { fr: "Academy — maîtrise quiz", en: "Academy — quiz mastery" },
      icon: Target,
      size: "sm",
      config: academyQuizConfig,
      component: AcademyQuizWidget,
    },
    {
      id: "flashcards",
      title: { fr: "Academy — flashcards", en: "Academy — flashcards" },
      icon: Brain,
      size: "sm",
      component: AcademyFlashcardsWidget,
    },
  ],
};
