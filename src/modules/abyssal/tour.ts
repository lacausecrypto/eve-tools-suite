import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useAbyssal } from "./app/store";

export const abyssalTour: ModuleTour = {
  id: "abyssal",
  demo: () => {
    const restore = snapshot(useAbyssal);
    useAbyssal.getState().saveRoll({
      resultName: "Decayed 10000MN Afterburner",
      baseName: "10000MN Afterburner II",
      mutatorName: "Decayed Afterburner Mutaplasmid",
      resultTypeId: 47408,
      overall: 0.72,
      basePrice: 12_000_000,
      mutatorPrice: 8_000_000,
      estimatedValue: 95_000_000,
      attrs: [
        { attrId: 20, name: "Max Velocity Bonus", high: true, unit: 105, base: 1.5, rolled: 1.62, min: 1.35, max: 1.65, quality: 0.9, pctVsBase: 8 },
        { attrId: 50, name: "Activation Cost", high: false, unit: 104, base: 280, rolled: 240, min: 224, max: 336, quality: 0.86, pctVsBase: -14.3 },
        { attrId: 49, name: "CPU usage", high: false, unit: 101, base: 35, rolled: 33, min: 28, max: 42, quality: 0.36, pctVsBase: -5.7 },
      ],
    });
    return restore;
  },
  steps: [
    { anchor: "abyssal.tabs", titleKey: "tour.abyssal.tabs.title", bodyKey: "tour.abyssal.tabs.body" },
    { anchor: "abyssal.link", titleKey: "tour.abyssal.link.title", bodyKey: "tour.abyssal.link.body" },
    { anchor: "abyssal.evaluate", titleKey: "tour.abyssal.evaluate.title", bodyKey: "tour.abyssal.evaluate.body" },
    { anchor: "abyssal.saved", titleKey: "tour.abyssal.saved.title", bodyKey: "tour.abyssal.saved.body" },
  ],
};

registerMessages({
  fr: {
    "tour.abyssal.tabs.title": "1. Évaluer ou Explorer",
    "tour.abyssal.tabs.body": "Évaluer : coller un module abyssal pour noter ses rolls. Explorer : voir les plages théoriques min–max par famille de mutaplasmide.",
    "tour.abyssal.link.title": "2. Le lien du module",
    "tour.abyssal.link.body": "Colle le lien de chat d'un module muté (clic-droit → Copier, dans le jeu). La suite lit ses attributs réels.",
    "tour.abyssal.evaluate.title": "3. Évaluer",
    "tour.abyssal.evaluate.body": "Chaque attribut est comparé à sa plage théorique → un score de qualité global (god-roll détecté) et une estimation de revente.",
    "tour.abyssal.saved.title": "4. Tes rolls sauvegardés",
    "tour.abyssal.saved.body": "Les rolls évalués s'enregistrent ici (un exemple est affiché) avec leur estimation MutaMarket — pratique pour comparer ton stock.",
  },
  en: {
    "tour.abyssal.tabs.title": "1. Evaluate or Explore",
    "tour.abyssal.tabs.body": "Evaluate: paste an abyssal module to score its rolls. Explore: see theoretical min–max ranges per mutaplasmid family.",
    "tour.abyssal.link.title": "2. The module link",
    "tour.abyssal.link.body": "Paste a mutated module's chat link (right-click → Copy, in game). The suite reads its real attributes.",
    "tour.abyssal.evaluate.title": "3. Evaluate",
    "tour.abyssal.evaluate.body": "Each attribute is compared to its theoretical range → an overall quality score (god-roll detected) and a resale estimate.",
    "tour.abyssal.saved.title": "4. Your saved rolls",
    "tour.abyssal.saved.body": "Evaluated rolls are saved here (a sample is shown) with their MutaMarket estimate — handy to compare your stock.",
  },
});
