import { BarChart3, Factory, TrendingUp } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { ESI_SCOPES } from "@/core/app";
import { IndustryModule } from "./IndustryModule";
import { industryTour } from "./tour";
import {
  IndustryOverviewWidget,
  IndustryProductionWidget,
  IndustryProfitWidget,
  industryOverviewConfig,
  industryProductionConfig,
  industryProfitConfig,
} from "./widgets";

export const industryManifest: ToolModule = {
  id: "industry",
  name: { fr: "Industrie & Coûts", en: "Industry & Cost Tracker" },
  tagline: {
    fr: "Coût de revient réel, profit et inventaire — pour industriels",
    en: "Real production cost, profit and inventory — for industrialists",
  },
  description: {
    fr:
      "Calcule le coût de revient réel d'une production avec les vraies formules " +
      "EVE (Material Efficiency, EIV, coût d'installation, surtaxe SCC), prix Jita " +
      "publics à l'appui ; suit tes jobs dans un carnet (ISK en production, profit " +
      "attendu vs réalisé) ; valorise ton inventaire. Prix publics → aucun login " +
      "requis. Import ESI des jobs/actifs prêt (M5). Complète Mining + PI.",
    en:
      "Compute the real production cost with EVE's actual formulas (Material " +
      "Efficiency, EIV, job install cost, SCC surcharge) using public Jita prices; " +
      "track jobs in a ledger (ISK in production, expected vs realized profit); " +
      "value your inventory. Public prices → no login needed. ESI import of " +
      "jobs/assets wired (M5). Completes Mining + PI.",
  },
  icon: Factory,
  accent: "hsl(var(--success))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    scopes: [
      ESI_SCOPES.readIndustryJobs,
      ESI_SCOPES.readAssets,
      ESI_SCOPES.readWallet,
    ],
    thirdParty: ["Fuzzwork (agrégats marché Jita)"],
    eulaSafe: true,
  },
  component: IndustryModule,
  tour: industryTour,
  widgets: [
    {
      id: "production",
      title: { fr: "Industrie — en production", en: "Industry — in production" },
      icon: Factory,
      size: "sm",
      config: industryProductionConfig,
      component: IndustryProductionWidget,
    },
    {
      id: "profit",
      title: { fr: "Industrie — profit réalisé", en: "Industry — realized profit" },
      icon: TrendingUp,
      size: "sm",
      config: industryProfitConfig,
      component: IndustryProfitWidget,
    },
    {
      id: "overview",
      title: { fr: "Industrie — vue d'ensemble", en: "Industry — overview" },
      icon: BarChart3,
      size: "md",
      config: industryOverviewConfig,
      component: IndustryOverviewWidget,
    },
  ],
};
