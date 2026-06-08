import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useCalc } from "./app/store";

export const industryTour: ModuleTour = {
  id: "industry",
  demo: () => {
    const restore = snapshot(useCalc);
    useCalc.getState().setRecipe({ outputName: "Hammerhead II", outputPerRun: 1, runs: 1, me: 10, te: 20 });
    useCalc.getState().setMaterials([
      { name: "Tritanium", baseQty: 5200 },
      { name: "Pyerite", baseQty: 1300 },
      { name: "Mexallon", baseQty: 460 },
      { name: "Morphite", baseQty: 2 },
    ]);
    return restore;
  },
  steps: [
    { anchor: "industry.tabs", titleKey: "tour.industry.tabs.title", bodyKey: "tour.industry.tabs.body" },
    { anchor: "industry.recipe", titleKey: "tour.industry.recipe.title", bodyKey: "tour.industry.recipe.body" },
    { anchor: "industry.materials", titleKey: "tour.industry.materials.title", bodyKey: "tour.industry.materials.body" },
    { anchor: "industry.system", titleKey: "tour.industry.system.title", bodyKey: "tour.industry.system.body" },
    { anchor: "industry.compute", titleKey: "tour.industry.compute.title", bodyKey: "tour.industry.compute.body" },
    { anchor: "industry.result", titleKey: "tour.industry.result.title", bodyKey: "tour.industry.result.body" },
  ],
};

registerMessages({
  fr: {
    "tour.industry.tabs.title": "1. Quatre vues",
    "tour.industry.tabs.body": "Calculateur (coût de revient), Arbre (production en chaîne), Carnet (suivi des jobs) et Actifs (valorisés au prix Jita).",
    "tour.industry.recipe.title": "2. La recette",
    "tour.industry.recipe.body": "Choisis le produit (un exemple est rempli) et l'activité (Fabrication / Réaction), le nombre de runs et le ME. « Auto-fill BP » récupère la recette du blueprint.",
    "tour.industry.materials.title": "3. Les matériaux",
    "tour.industry.materials.body": "La liste des matériaux + quantités de base (auto-remplie depuis le BP, ou collée). Ajoute/retire des lignes ; « Ajouter minéraux » insère les 8 minéraux.",
    "tour.industry.system.title": "4. Système & prix",
    "tour.industry.system.body": "Le système (→ index de coût récupéré) et l'index, plus la base de prix (achat/vente) pour les matériaux et le produit. L'onglet Avancé expose taxes, frais et compétences.",
    "tour.industry.compute.title": "5. Calculer",
    "tour.industry.compute.body": "Prix Jita réels + formules EVE (ME, EIV, coût d'install, SCC) → coût total, profit, marge et ISK/heure.",
    "tour.industry.result.title": "6. Résultat",
    "tour.industry.result.body": "Ici : les KPIs (coût unitaire, profit, ROI, ISK/h), la ventilation détaillée, et « Enregistrer » pour suivre le job dans le Carnet.",
  },
  en: {
    "tour.industry.tabs.title": "1. Four views",
    "tour.industry.tabs.body": "Calculator (unit cost), Tree (chained production), Ledger (job tracking) and Assets (valued at Jita prices).",
    "tour.industry.recipe.title": "2. The recipe",
    "tour.industry.recipe.body": "Pick the product (a sample is filled) and activity (Manufacturing / Reaction), the runs and ME. \"Auto-fill BP\" pulls the blueprint recipe.",
    "tour.industry.materials.title": "3. The materials",
    "tour.industry.materials.body": "The materials list + base quantities (auto-filled from the BP, or pasted). Add/remove rows; \"Add minerals\" inserts the 8 minerals.",
    "tour.industry.system.title": "4. System & prices",
    "tour.industry.system.body": "The system (→ fetched cost index) and the index, plus the price basis (buy/sell) for materials and product. The Advanced tab exposes taxes, fees and skills.",
    "tour.industry.compute.title": "5. Compute",
    "tour.industry.compute.body": "Real Jita prices + EVE formulas (ME, EIV, install cost, SCC) → total cost, profit, margin and ISK/hour.",
    "tour.industry.result.title": "6. Result",
    "tour.industry.result.body": "Here: the KPIs (unit cost, profit, ROI, ISK/h), the detailed breakdown, and \"Save\" to track the job in the Ledger.",
  },
});
