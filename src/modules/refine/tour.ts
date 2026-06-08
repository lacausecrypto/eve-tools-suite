import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useRefine } from "./app/store";

const DEMO_ORE = "Veldspar 50000\nScordite 30000\nPlagioclase 15000\nKernite 8000";

export const refineTour: ModuleTour = {
  id: "refine",
  demo: () => {
    const restore = snapshot(useRefine);
    useRefine.getState().setMode("reprocess");
    useRefine.getState().setText(DEMO_ORE);
    return restore;
  },
  steps: [
    { anchor: "refine.tabs", titleKey: "tour.refine.tabs.title", bodyKey: "tour.refine.tabs.body" },
    { anchor: "refine.rate", titleKey: "tour.refine.rate.title", bodyKey: "tour.refine.rate.body" },
    { anchor: "refine.ore", titleKey: "tour.refine.ore.title", bodyKey: "tour.refine.ore.body" },
    { anchor: "refine.run", titleKey: "tour.refine.run.title", bodyKey: "tour.refine.run.body" },
    { anchor: "refine.result", titleKey: "tour.refine.result.title", bodyKey: "tour.refine.result.body" },
  ],
};

registerMessages({
  fr: {
    "tour.refine.tabs.title": "1. Deux modes",
    "tour.refine.tabs.body": "Retraiter (minerai → minéraux) ou Compresser (trouver le mélange compressé optimal pour atteindre des objectifs minéraux).",
    "tour.refine.rate.title": "2. Taux & compétences",
    "tour.refine.rate.body": "Règle le taux de raffinage de base de la structure (NPC 50 %, Athanor, Tatara…) — les boutons préréglés font ça en un clic. Tes 3 compétences de retraitement s'ajoutent juste à côté.",
    "tour.refine.ore.title": "3. Colle ton minerai",
    "tour.refine.ore.body": "Une ligne = nom + quantité (exemple pré-rempli). Tu peux coller un scan de cargo entier.",
    "tour.refine.run.title": "4. Calculer",
    "tour.refine.run.body": "La suite applique ton taux + compétences et sort les minéraux obtenus avec leur valeur.",
    "tour.refine.result.title": "5. Rendements & valeur",
    "tour.refine.result.body": "Minéraux produits, valeur ISK (base achat ou vente), et la comparaison brut vs raffiné pour décider quoi vendre. En mode Compression, c'est le mix compressé optimal qui s'affiche.",
  },
  en: {
    "tour.refine.tabs.title": "1. Two modes",
    "tour.refine.tabs.body": "Reprocess (ore → minerals) or Compress (find the optimal compressed mix to hit mineral targets).",
    "tour.refine.rate.title": "2. Rate & skills",
    "tour.refine.rate.body": "Set the structure base refine rate (NPC 50%, Athanor, Tatara…) — the preset buttons do it in one click. Your 3 reprocessing skills add up right next to it.",
    "tour.refine.ore.title": "3. Paste your ore",
    "tour.refine.ore.body": "One line = name + quantity (sample pre-filled). You can paste a whole cargo scan.",
    "tour.refine.run.title": "4. Compute",
    "tour.refine.run.body": "The suite applies your rate + skills and outputs the minerals produced with their value.",
    "tour.refine.result.title": "5. Yields & value",
    "tour.refine.result.body": "Minerals produced, ISK value (buy or sell basis), and a raw-vs-refined comparison to decide what to sell. In Compress mode, the optimal compressed mix shows here.",
  },
});
