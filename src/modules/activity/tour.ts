import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useActivity } from "./app/store";

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
    { anchor: "activity.tabs", titleKey: "tour.activity.tabs.title", bodyKey: "tour.activity.tabs.body" },
    { anchor: "activity.timer", titleKey: "tour.activity.timer.title", bodyKey: "tour.activity.timer.body" },
    { anchor: "activity.loot", titleKey: "tour.activity.loot.title", bodyKey: "tour.activity.loot.body" },
    { anchor: "activity.finish", titleKey: "tour.activity.finish.title", bodyKey: "tour.activity.finish.body" },
  ],
};

registerMessages({
  fr: {
    "tour.activity.tabs.title": "1. Session, Historique, Drops",
    "tour.activity.tabs.body": "Trois vues. Dans la session, choisis ton activité (ratting, abyssal, mission, minage…) et le site juste en dessous.",
    "tour.activity.timer.title": "2. Le chrono",
    "tour.activity.timer.body": "Démarrer / Pause / Reset : c'est ce chrono qui transforme ton butin en ISK/heure.",
    "tour.activity.loot.title": "3. Ton butin",
    "tour.activity.loot.body": "Colle ton loot (une ligne = objet + quantité ; exemple rempli) : la suite le valorise au prix Jita automatiquement.",
    "tour.activity.finish.title": "4. Clôturer",
    "tour.activity.finish.body": "Enregistre la session dans l'historique, qui agrège tes revenus moyens et estime tes taux de drop par activité.",
  },
  en: {
    "tour.activity.tabs.title": "1. Session, History, Drops",
    "tour.activity.tabs.body": "Three views. In the session, pick your activity (ratting, abyssal, mission, mining…) and the site just below.",
    "tour.activity.timer.title": "2. The timer",
    "tour.activity.timer.body": "Start / Pause / Reset: this timer is what turns your loot into ISK/hour.",
    "tour.activity.loot.title": "3. Your loot",
    "tour.activity.loot.body": "Paste your loot (one line = item + quantity; sample filled): the suite values it at Jita prices automatically.",
    "tour.activity.finish.title": "4. Close it",
    "tour.activity.finish.body": "Save the session to history, which aggregates your average income and estimates drop rates per activity.",
  },
});
