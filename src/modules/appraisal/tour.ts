import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useAppraisal } from "./app/store";

const DEMO = "Tritanium 50000\nPyerite 12000\nMexallon 3000\nIsogen 800\nNocxium 120";

/** Visite guidée de l'Appraisal (lot d'exemple pré-rempli). */
export const appraisalTour: ModuleTour = {
  id: "appraisal",
  demo: () => {
    const restore = snapshot(useAppraisal);
    useAppraisal.getState().setText(DEMO);
    return restore;
  },
  steps: [
    { anchor: "appraisal.root", titleKey: "tour.appraisal.s1.title", bodyKey: "tour.appraisal.s1.body" },
    { anchor: "appraisal.root", titleKey: "tour.appraisal.s2.title", bodyKey: "tour.appraisal.s2.body" },
    { anchor: "appraisal.root", titleKey: "tour.appraisal.s3.title", bodyKey: "tour.appraisal.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.appraisal.s1.title": "Estimer un lot",
    "tour.appraisal.s1.body": "Colle n'importe quoi (inventaire, scan de cargo, contenu de contrat, loot). Un exemple de minéraux est déjà collé ci-dessous.",
    "tour.appraisal.s2.title": "Valeur multi-hubs",
    "tour.appraisal.s2.body": "Lance l'estimation : valeur Jita achat/vente, volume total (m³) et EIV, comparables sur les autres hubs majeurs.",
    "tour.appraisal.s3.title": "Bases & sauvegarde",
    "tour.appraisal.s3.body": "Choisis la base de prix (achat/vente) et le hub, puis sauvegarde l'estimation pour la retrouver plus tard.",
  },
  en: {
    "tour.appraisal.s1.title": "Appraise a batch",
    "tour.appraisal.s1.body": "Paste anything (inventory, cargo scan, contract contents, loot). A sample mineral list is already pasted below.",
    "tour.appraisal.s2.title": "Multi-hub value",
    "tour.appraisal.s2.body": "Run it: Jita buy/sell value, total volume (m³) and EIV, comparable across the other major hubs.",
    "tour.appraisal.s3.title": "Bases & saving",
    "tour.appraisal.s3.body": "Pick the price basis (buy/sell) and the hub, then save the appraisal to find it again later.",
  },
});
