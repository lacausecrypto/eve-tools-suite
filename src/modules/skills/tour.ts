import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useSkills } from "./app/store";

/** Visite guidée du Skill & Remap Optimizer (plan d'exemple). */
export const skillsTour: ModuleTour = {
  id: "skills",
  demo: () => {
    const restore = snapshot(useSkills);
    useSkills.getState().importQueue([
      { skillId: 3300, from: 0, to: 5 },
      { skillId: 33078, from: 0, to: 4 },
      { skillId: 89689, from: 0, to: 3 },
    ]);
    return restore;
  },
  steps: [
    { anchor: "skills.root", titleKey: "tour.skills.s1.title", bodyKey: "tour.skills.s1.body" },
    { anchor: "skills.root", titleKey: "tour.skills.s2.title", bodyKey: "tour.skills.s2.body" },
    { anchor: "skills.root", titleKey: "tour.skills.s3.title", bodyKey: "tour.skills.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.skills.s1.title": "Plan de compétences",
    "tour.skills.s1.body": "Ajoute des compétences avec leur niveau cible (un plan d'exemple est chargé). L'outil somme les SP et le temps d'entraînement exact.",
    "tour.skills.s2.title": "Temps & SP",
    "tour.skills.s2.body": "Chaque ligne montre les SP requis et la durée ; le total tient compte de tes attributs, implants et du statut Alpha/Omega.",
    "tour.skills.s3.title": "Remap optimal",
    "tour.skills.s3.body": "L'outil calcule le remap d'attributs qui réduit le plus la durée de ce plan — un gain souvent de plusieurs jours.",
  },
  en: {
    "tour.skills.s1.title": "Skill plan",
    "tour.skills.s1.body": "Add skills with their target level (a sample plan is loaded). The tool sums SP and the exact training time.",
    "tour.skills.s2.title": "Time & SP",
    "tour.skills.s2.body": "Each row shows required SP and duration; the total accounts for your attributes, implants and Alpha/Omega status.",
    "tour.skills.s3.title": "Optimal remap",
    "tour.skills.s3.body": "The tool computes the attribute remap that cuts this plan's duration the most — often a multi-day saving.",
  },
});
