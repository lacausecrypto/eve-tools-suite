import { Timer } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { ActivityModule } from "./ActivityModule";

import { activityTour } from "./tour";

export const activityManifest: ToolModule = {
  id: "activity",
  name: { fr: "Journal d'Activité", en: "Activity Journal" },
  tagline: {
    fr: "ISK par heure — chrono, butin valorisé, taux de drop",
    en: "ISK per hour — timer, valued loot, drop rates",
  },
  description: {
    fr:
      "Mesure ton ISK/heure réel par activité (ratting, abyssal, missions, " +
      "minage, exploration, incursions) : un chrono mural, la valorisation du " +
      "butin via les prix Jita (achat/vente), tes revenus et coûts, puis le net " +
      "et l'ISK/h comparables entre sessions. Inclut un calculateur de taux de " +
      "drop par run. Comble le vide laissé par l'Activity Tracker (retiré en " +
      "décembre 2024). 100 % ESI publique + Fuzzwork.",
    en:
      "Measure your real ISK/hour per activity (ratting, abyssal, missions, " +
      "mining, exploration, incursions): a wall-clock timer, loot valuation via " +
      "Jita prices (buy/sell), your income and costs, then net and ISK/h " +
      "comparable across sessions. Includes a per-run drop-rate calculator. " +
      "Fills the gap left by the Activity Tracker (removed Dec 2024). Public ESI " +
      "+ Fuzzwork.",
  },
  icon: Timer,
  accent: "hsl(var(--primary))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["Fuzzwork"],
    eulaSafe: true,
  },
  component: ActivityModule,
  tour: activityTour,
};
