import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useLp } from "./app/store";

/** Visite guidée du LP Converter (corpo + solde LP d'exemple). */
export const lpTour: ModuleTour = {
  id: "lp",
  demo: () => {
    const restore = snapshot(useLp);
    useLp.getState().setCorp(1000179);
    useLp.getState().setLpBalance(150000);
    return restore;
  },
  steps: [
    { anchor: "lp.root", titleKey: "tour.lp.s1.title", bodyKey: "tour.lp.s1.body" },
    { anchor: "lp.root", titleKey: "tour.lp.s2.title", bodyKey: "tour.lp.s2.body" },
    { anchor: "lp.root", titleKey: "tour.lp.s3.title", bodyKey: "tour.lp.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.lp.s1.title": "Valoriser tes LP",
    "tour.lp.s1.body": "Choisis une corporation LP (un exemple est sélectionné). L'outil charge son LP store et classe chaque échange en ISK par point.",
    "tour.lp.s2.title": "ISK / LP net",
    "tour.lp.s2.body": "Le classement tient compte du coût d'achat des items, des frais de vente et de la base de prix — pour un ISK/LP réaliste.",
    "tour.lp.s3.title": "Ton solde",
    "tour.lp.s3.body": "Renseigne ton solde de LP (ici 150k) pour voir combien rapporte ta réserve avec le meilleur échange.",
  },
  en: {
    "tour.lp.s1.title": "Value your LP",
    "tour.lp.s1.body": "Pick an LP corporation (one is selected). The tool loads its LP store and ranks each trade by ISK per point.",
    "tour.lp.s2.title": "Net ISK / LP",
    "tour.lp.s2.body": "The ranking accounts for item buy cost, sale fees and price basis — for a realistic ISK/LP.",
    "tour.lp.s3.title": "Your balance",
    "tour.lp.s3.body": "Enter your LP balance (here 150k) to see what your reserve is worth with the best trade.",
  },
});
