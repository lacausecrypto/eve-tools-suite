import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useSkills } from "./app/store";

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
    { anchor: "skills.character", titleKey: "tour.skills.character.title", bodyKey: "tour.skills.character.body" },
    { anchor: "skills.attributes", titleKey: "tour.skills.attrs.title", bodyKey: "tour.skills.attrs.body" },
    { anchor: "skills.search", titleKey: "tour.skills.search.title", bodyKey: "tour.skills.search.body" },
    { anchor: "skills.totals", titleKey: "tour.skills.totals.title", bodyKey: "tour.skills.totals.body" },
    { anchor: "skills.remap", titleKey: "tour.skills.remap.title", bodyKey: "tour.skills.remap.body" },
  ],
};

registerMessages({
  fr: {
    "tour.skills.character.title": "1. Personnage & Omega/Alpha",
    "tour.skills.character.body": "Importe la file de compétences et les attributs de ton perso connecté (SSO, desktop). Le sélecteur Omega/Alpha juste à côté recalcule tous les temps selon ton type de compte.",
    "tour.skills.attrs.title": "2. Attributs & implants",
    "tour.skills.attrs.body": "Tes 5 attributs de base + implants déterminent la vitesse d'entraînement. La somme doit respecter le total autorisé (badge Σ).",
    "tour.skills.search.title": "3. Ajouter des compétences",
    "tour.skills.search.body": "Cherche une compétence par nom et clique pour l'ajouter au plan (un plan d'exemple est déjà chargé).",
    "tour.skills.totals.title": "4. Totaux du plan",
    "tour.skills.totals.body": "Les SP requis, la durée totale et le nombre de compétences du plan, mis à jour en direct.",
    "tour.skills.remap.title": "5. Remap optimal",
    "tour.skills.remap.body": "L'allocation d'attributs qui réduit le plus la durée du plan — applique-la en un clic, souvent plusieurs jours d'économie.",
  },
  en: {
    "tour.skills.character.title": "1. Character & Omega/Alpha",
    "tour.skills.character.body": "Import your connected character's skill queue and attributes (SSO, desktop). The Omega/Alpha toggle right next to it recomputes all times by account type.",
    "tour.skills.attrs.title": "2. Attributes & implants",
    "tour.skills.attrs.body": "Your 5 base attributes + implants set training speed. The sum must respect the allowed total (Σ badge).",
    "tour.skills.search.title": "3. Add skills",
    "tour.skills.search.body": "Search a skill by name and click to add it to the plan (a sample plan is already loaded).",
    "tour.skills.totals.title": "4. Plan totals",
    "tour.skills.totals.body": "Required SP, total duration and the plan's skill count, updated live.",
    "tour.skills.remap.title": "5. Optimal remap",
    "tour.skills.remap.body": "The attribute allocation that cuts the plan's duration the most — apply it in one click, often saving several days.",
  },
});
