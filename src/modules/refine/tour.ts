import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useRefine } from "./app/store";

const DEMO_ORE = "Veldspar 50000\nScordite 30000\nPlagioclase 15000\nKernite 8000";

/** Visite guidée du Reprocessing & Compression (minerai d'exemple pré-rempli). */
export const refineTour: ModuleTour = {
  id: "refine",
  demo: () => {
    const restore = snapshot(useRefine);
    useRefine.getState().setMode("reprocess");
    useRefine.getState().setText(DEMO_ORE);
    return restore;
  },
  steps: [
    { anchor: "refine.root", titleKey: "tour.refine.s1.title", bodyKey: "tour.refine.s1.body" },
    { anchor: "refine.root", titleKey: "tour.refine.s2.title", bodyKey: "tour.refine.s2.body" },
    { anchor: "refine.root", titleKey: "tour.refine.s3.title", bodyKey: "tour.refine.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.refine.s1.title": "Raffinage",
    "tour.refine.s1.body": "Colle ton minerai (exemple déjà rempli). L'outil calcule les minéraux obtenus selon tes compétences et le taux de base de la structure.",
    "tour.refine.s2.title": "Rendements & valeur",
    "tour.refine.s2.body": "Tu vois les minéraux produits et leur valeur Jita — pour décider : raffiner sur place, vendre le minerai brut, ou compresser.",
    "tour.refine.s3.title": "Compression",
    "tour.refine.s3.body": "En mode Compression, fixe tes objectifs minéraux : l'outil trouve le mélange compressé optimal à transporter.",
  },
  en: {
    "tour.refine.s1.title": "Reprocessing",
    "tour.refine.s1.body": "Paste your ore (sample pre-filled). The tool computes the minerals you get from your skills and the structure's base rate.",
    "tour.refine.s2.title": "Yields & value",
    "tour.refine.s2.body": "You see the minerals produced and their Jita value — to decide: refine on site, sell raw ore, or compress.",
    "tour.refine.s3.title": "Compression",
    "tour.refine.s3.body": "In Compression mode, set your mineral targets: the tool finds the optimal compressed mix to haul.",
  },
});
