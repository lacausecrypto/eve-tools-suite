import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useActivity } from "./app/store";

/** Visite guidée de l'Activity Journal (session de ratting d'exemple). */
export const activityTour: ModuleTour = {
  id: "activity",
  demo: () => {
    const restore = snapshot(useActivity);
    const a = useActivity.getState();
    a.setActivity("ratting");
    a.setSite("Forsaken Hub");
    a.addLoot([
      { typeId: 17812, name: "True Sansha Pulse Laser", qty: 1, unitBuy: 110_000_000, unitSell: 128_000_000 },
      { typeId: 31177, name: "Imperial Navy Gamma S", qty: 4200, unitBuy: 70, unitSell: 95 },
      { typeId: 34, name: "Tritanium", qty: 220_000, unitBuy: 4, unitSell: 5 },
    ]);
    return restore;
  },
  steps: [
    { anchor: "activity.root", titleKey: "tour.activity.s1.title", bodyKey: "tour.activity.s1.body" },
    { anchor: "activity.root", titleKey: "tour.activity.s2.title", bodyKey: "tour.activity.s2.body" },
    { anchor: "activity.root", titleKey: "tour.activity.s3.title", bodyKey: "tour.activity.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.activity.s1.title": "Journal d'activité",
    "tour.activity.s1.body": "Choisis une activité (ratting, abyssal, missions, minage…) et un site. Une session d'exemple est déjà remplie.",
    "tour.activity.s2.title": "Butin valorisé",
    "tour.activity.s2.body": "Note ton loot : l'outil le valorise au prix Jita (achat/vente) et agrège la valeur totale de la session.",
    "tour.activity.s3.title": "ISK / heure",
    "tour.activity.s3.body": "Lance le chrono : à la clôture, l'outil calcule ton ISK/heure et garde l'historique pour estimer tes taux de drop.",
  },
  en: {
    "tour.activity.s1.title": "Activity journal",
    "tour.activity.s1.body": "Pick an activity (ratting, abyssal, missions, mining…) and a site. A sample session is already filled.",
    "tour.activity.s2.title": "Valued loot",
    "tour.activity.s2.body": "Log your loot: the tool values it at Jita prices (buy/sell) and aggregates the session's total value.",
    "tour.activity.s3.title": "ISK / hour",
    "tour.activity.s3.body": "Start the timer: on close, the tool computes your ISK/hour and keeps history to estimate your drop rates.",
  },
});
