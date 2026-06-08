import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useLp } from "./app/store";

export const lpTour: ModuleTour = {
  id: "lp",
  demo: () => {
    const restore = snapshot(useLp);
    useLp.getState().setCorp(1000179);
    useLp.getState().setLpBalance(150000);
    return restore;
  },
  steps: [
    { anchor: "lp.corp", titleKey: "tour.lp.corp.title", bodyKey: "tour.lp.corp.body" },
    { anchor: "lp.basis", titleKey: "tour.lp.basis.title", bodyKey: "tour.lp.basis.body" },
    { anchor: "lp.balance", titleKey: "tour.lp.balance.title", bodyKey: "tour.lp.balance.body" },
    { anchor: "lp.fees", titleKey: "tour.lp.fees.title", bodyKey: "tour.lp.fees.body" },
  ],
};

registerMessages({
  fr: {
    "tour.lp.corp.title": "1. La corporation",
    "tour.lp.corp.body": "Choisis une corpo LP (autocomplétion ; un exemple est sélectionné). La suite charge son LP store et tous les échanges possibles.",
    "tour.lp.basis.title": "2. Base de prix",
    "tour.lp.basis.body": "Revente en Sell (vente immédiate) ou Buy (ordre d'achat) — ça change le profit, donc le classement ISK/LP.",
    "tour.lp.balance.title": "3. Ton solde LP",
    "tour.lp.balance.body": "Saisis ton solde (ici 150k) pour voir combien rapporte ta réserve avec le meilleur échange, et combien de fois tu peux le réaliser.",
    "tour.lp.fees.title": "4. Frais & filtres",
    "tour.lp.fees.body": "Affine avec tes taxes/courtage, un volume minimum et « rentables uniquement ». Le tableau en dessous classe chaque offre par ISK net par point de loyauté.",
  },
  en: {
    "tour.lp.corp.title": "1. The corporation",
    "tour.lp.corp.body": "Pick an LP corp (autocomplete; a sample is selected). The suite loads its LP store and every possible trade.",
    "tour.lp.basis.title": "2. Price basis",
    "tour.lp.basis.body": "Resell at Sell (instant sell) or Buy (buy order) — it changes profit, hence the ISK/LP ranking.",
    "tour.lp.balance.title": "3. Your LP balance",
    "tour.lp.balance.body": "Enter your balance (here 150k) to see what your reserve earns with the best trade, and how many times you can run it.",
    "tour.lp.fees.title": "4. Fees & filters",
    "tour.lp.fees.body": "Tune with your taxes/broker, a minimum volume and \"profitable only\". The table below ranks each offer by net ISK per loyalty point.",
  },
});
