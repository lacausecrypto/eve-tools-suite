import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useAcademy } from "./app/store";

/** Visite guidée d'EVE Academy (démo : une leçon complétée → XP). */
export const academyTour: ModuleTour = {
  id: "academy",
  demo: () => {
    const restore = snapshot(useAcademy);
    useAcademy.getState().completeLesson("capsule");
    return restore;
  },
  steps: [
    { anchor: "academy.nav", titleKey: "tour.academy.nav.title", bodyKey: "tour.academy.nav.body" },
    { anchor: "academy.root", titleKey: "tour.academy.learn.title", bodyKey: "tour.academy.learn.body" },
    { anchor: "academy.nav", titleKey: "tour.academy.train.title", bodyKey: "tour.academy.train.body" },
  ],
};

registerMessages({
  fr: {
    "tour.academy.nav.title": "Cinq sections",
    "tour.academy.nav.body": "Accueil, Cursus (leçons), Quiz, Entraînement et Glossaire. 100 % hors-ligne, avec XP, niveaux et badges — une leçon d'exemple vient d'être validée.",
    "tour.academy.learn.title": "Apprendre par cursus",
    "tour.academy.learn.body": "Les cursus vont du débutant à l'avancé : capsule, fitting, dégâts & résistances, tank, doctrines… chaque leçon se termine par un quiz.",
    "tour.academy.train.title": "S'entraîner",
    "tour.academy.train.body": "Entraînement : reconnaissance des vaisseaux, flashcards à répétition espacée, quiz chrono et mode survie. Idéal pour ancrer les réflexes.",
  },
  en: {
    "tour.academy.nav.title": "Five sections",
    "tour.academy.nav.body": "Home, Curriculum (lessons), Quiz, Training and Glossary. Fully offline, with XP, levels and badges — a sample lesson was just completed.",
    "tour.academy.learn.title": "Learn by curriculum",
    "tour.academy.learn.body": "Curricula go from beginner to advanced: capsule, fitting, damage & resists, tank, doctrines… each lesson ends with a quiz.",
    "tour.academy.train.title": "Train",
    "tour.academy.train.body": "Training: ship recognition, spaced-repetition flashcards, timed quiz and survival mode. Great for building reflexes.",
  },
});
