import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useAcademy } from "./app/store";

export const academyTour: ModuleTour = {
  id: "academy",
  demo: () => {
    const restore = snapshot(useAcademy);
    useAcademy.getState().completeLesson("capsule");
    return restore;
  },
  steps: [
    { anchor: "academy.nav", titleKey: "tour.academy.nav.title", bodyKey: "tour.academy.nav.body" },
    { anchor: "academy.stats", titleKey: "tour.academy.stats.title", bodyKey: "tour.academy.stats.body" },
    { anchor: "academy.continue", titleKey: "tour.academy.continue.title", bodyKey: "tour.academy.continue.body" },
    { anchor: "academy.tracks", titleKey: "tour.academy.tracks.title", bodyKey: "tour.academy.tracks.body" },
  ],
};

registerMessages({
  fr: {
    "tour.academy.nav.title": "1. Cinq sections",
    "tour.academy.nav.body": "Accueil, Cursus (leçons structurées), Quiz, Entraînement et Glossaire. 100 % hors-ligne, avec XP, niveaux et badges.",
    "tour.academy.stats.title": "2. Ta progression",
    "tour.academy.stats.body": "Tes statistiques : leçons faites, quiz réussis, précision, cartes révisées et série quotidienne (une leçon d'exemple vient d'être validée).",
    "tour.academy.continue.title": "3. Continuer",
    "tour.academy.continue.body": "Reprends directement la prochaine leçon non terminée de ton cursus.",
    "tour.academy.tracks.title": "4. Cursus",
    "tour.academy.tracks.body": "Ta progression par cursus (anneaux + niveau de difficulté), du débutant à l'avancé : capsule, fitting, combat, doctrines…",
  },
  en: {
    "tour.academy.nav.title": "1. Five sections",
    "tour.academy.nav.body": "Home, Curriculum (structured lessons), Quiz, Training and Glossary. Fully offline, with XP, levels and badges.",
    "tour.academy.stats.title": "2. Your progress",
    "tour.academy.stats.body": "Your stats: lessons done, quizzes passed, accuracy, cards reviewed and daily streak (a sample lesson was just completed).",
    "tour.academy.continue.title": "3. Continue",
    "tour.academy.continue.body": "Jump straight back into the next uncompleted lesson of your track.",
    "tour.academy.tracks.title": "4. Curricula",
    "tour.academy.tracks.body": "Your per-track progress (rings + difficulty level), from beginner to advanced: capsule, fitting, combat, doctrines…",
  },
});
