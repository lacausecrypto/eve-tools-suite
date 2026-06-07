import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useCalc } from "./app/store";

/** Visite guidée d'Industry & Cost Tracker (avec démo Hammerhead II). */
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
    { anchor: "industry.root", titleKey: "tour.industry.calc.title", bodyKey: "tour.industry.calc.body" },
    { anchor: "industry.tabs", titleKey: "tour.industry.ledger.title", bodyKey: "tour.industry.ledger.body" },
  ],
};

registerMessages({
  fr: {
    "tour.industry.tabs.title": "Quatre vues",
    "tour.industry.tabs.body":
      "Calculateur (coût de revient), Arbre (production en chaîne), Carnet (suivi des jobs) et Actifs (valorisés au prix Jita).",
    "tour.industry.calc.title": "Coût de revient en direct",
    "tour.industry.calc.body":
      "Exemple : un Hammerhead II. La suite applique les vraies formules EVE (ME, EIV, frais d'install, SCC) et sort matériaux, coût total, profit net et marge — prix Jita en temps réel.",
    "tour.industry.ledger.title": "Carnet de jobs",
    "tour.industry.ledger.body":
      "Enregistre un calcul dans le Carnet pour suivre le profit attendu vs réalisé, et générer ta liste de courses multibuy.",
  },
  en: {
    "tour.industry.tabs.title": "Four views",
    "tour.industry.tabs.body":
      "Calculator (unit cost), Tree (chained production), Ledger (job tracking) and Assets (valued at Jita prices).",
    "tour.industry.calc.title": "Live unit cost",
    "tour.industry.calc.body":
      "Example: a Hammerhead II. The suite applies real EVE formulas (ME, EIV, install fee, SCC) and outputs materials, total cost, net profit and margin — with live Jita prices.",
    "tour.industry.ledger.title": "Job ledger",
    "tour.industry.ledger.body":
      "Save a calculation to the Ledger to track expected vs realized profit, and generate your multibuy shopping list.",
  },
});
