import { CalendarClock, Orbit, Users, Wallet } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { PiModule } from "./PiModule";
import {
  PiByAltWidget,
  PiHarvestListWidget,
  PiHarvestWidget,
  PiPortfolioWidget,
  piByAltConfig,
  piHarvestConfig,
  piHarvestListConfig,
  piPortfolioConfig,
} from "./widgets";

import { piTour } from "./tour";

export const piManifest: ToolModule = {
  id: "pi",
  name: { fr: "Simulateur PI", en: "EVE PI Sim" },
  tagline: {
    fr: "Simulateur de Planetary Industry — optimise ton ISK/heure",
    en: "Planetary Industry simulator — optimize your ISK/hour",
  },
  description: {
    fr:
      "Simule ta PI dans le temps, pas juste un calculateur : modèle de decay des " +
      "extracteurs (formule officielle CCP), équilibrage extraction/usines, net " +
      "ISK/heure avec taxe POCO et ROI, plus un portefeuille multi-planètes / multi-alts " +
      "(ISK/h total, capital investi, rentabilité, planning de récolte). Export/partage en JSON.",
    en:
      "Simulate your PI over time, not just a calculator: extractor decay model " +
      "(official CCP formula), extraction/factory balancing, net ISK/hour with POCO " +
      "tax and ROI, plus a multi-planet / multi-alt portfolio " +
      "(total ISK/h, invested capital, payback, harvest schedule). JSON export/share.",
  },
  icon: Orbit,
  accent: "hsl(var(--fc))",
  status: "stable",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["EVE University (données PI)"],
    eulaSafe: true,
  },
  component: PiModule,
  tour: piTour,
  widgets: [
    {
      id: "portfolio",
      title: { fr: "PI — ISK net / h", en: "PI — net ISK/h" },
      icon: Wallet,
      size: "sm",
      config: piPortfolioConfig,
      component: PiPortfolioWidget,
    },
    {
      id: "harvest",
      title: { fr: "PI — prochaine récolte", en: "PI — next harvest" },
      icon: CalendarClock,
      size: "sm",
      config: piHarvestConfig,
      component: PiHarvestWidget,
    },
    {
      id: "harvest-list",
      title: { fr: "PI — planning de récolte", en: "PI — harvest schedule" },
      icon: CalendarClock,
      size: "md",
      config: piHarvestListConfig,
      component: PiHarvestListWidget,
    },
    {
      id: "by-alt",
      title: { fr: "PI — ISK / h par alt", en: "PI — ISK/h per alt" },
      icon: Users,
      size: "lg",
      config: piByAltConfig,
      component: PiByAltWidget,
    },
  ],
};
