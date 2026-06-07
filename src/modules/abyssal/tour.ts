import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useAbyssal } from "./app/store";

/** Visite guidée de l'Abyssal Appraiser (roll d'exemple sauvegardé). */
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
    { anchor: "abyssal.root", titleKey: "tour.abyssal.s1.title", bodyKey: "tour.abyssal.s1.body" },
    { anchor: "abyssal.root", titleKey: "tour.abyssal.s2.title", bodyKey: "tour.abyssal.s2.body" },
    { anchor: "abyssal.root", titleKey: "tour.abyssal.s3.title", bodyKey: "tour.abyssal.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.abyssal.s1.title": "Qualité d'un roll",
    "tour.abyssal.s1.body": "Évalue un module abyssal (colle un lien de chat, ou explore les plages par famille). Un roll d'exemple est déjà sauvegardé.",
    "tour.abyssal.s2.title": "Plages par attribut",
    "tour.abyssal.s2.body": "Chaque attribut est comparé à sa plage théorique min–max selon le mutaplasmide : tu vois d'un coup d'œil les bons et mauvais axes.",
    "tour.abyssal.s3.title": "God-roll & valeur",
    "tour.abyssal.s3.body": "Un score global repère les god-rolls et une estimation de revente (MutaMarket) te dit si ça vaut le coup de vendre.",
  },
  en: {
    "tour.abyssal.s1.title": "Roll quality",
    "tour.abyssal.s1.body": "Appraise an abyssal module (paste a chat link, or explore ranges by family). A sample roll is already saved.",
    "tour.abyssal.s2.title": "Per-attribute ranges",
    "tour.abyssal.s2.body": "Each attribute is compared to its theoretical min–max range for the mutaplasmid: you see good and bad axes at a glance.",
    "tour.abyssal.s3.title": "God-roll & value",
    "tour.abyssal.s3.body": "An overall score spots god-rolls and a resale estimate (MutaMarket) tells you whether it's worth selling.",
  },
});
