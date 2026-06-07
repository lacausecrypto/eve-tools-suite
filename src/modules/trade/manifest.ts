import { Coins, Percent } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { TradeModule } from "./TradeModule";
import { TradeFeesWidget, tradeFeesConfig } from "./widgets";

export const tradeManifest: ToolModule = {
  id: "trade",
  name: { fr: "Copilote de Trading", en: "Trade Co-Pilot" },
  tagline: {
    fr: "Trouve où gagner de l'ISK : station-trading & arbitrage, profit net",
    en: "Find where to make ISK: station-trading & arbitrage, net profit",
  },
  description: {
    fr:
      "Le copilote du trader : un scanner qui balaie tout le carnet d'un hub et classe " +
      "les meilleurs flips par profit net/jour (marge × liquidité réelle, frais courtier " +
      "et taxe de vente déduits), et un scanner d'arbitrage inter-hubs (profit/m³, ROI, " +
      "sauts). Moteur de profit net configurable depuis tes skills. 100 % ESI publique.",
    en:
      "The trader's co-pilot: a scanner that sweeps a hub's whole order book and ranks the " +
      "best flips by net profit/day (margin × real liquidity, broker fee and sales tax " +
      "deducted), plus a cross-hub arbitrage scanner (profit/m³, ROI, jumps). Net-profit " +
      "engine configurable from your skills. 100% public ESI.",
  },
  icon: Coins,
  accent: "hsl(var(--success))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    eulaSafe: true,
  },
  component: TradeModule,
  widgets: [
    {
      id: "fees",
      title: { fr: "Trade — frais de vente", en: "Trade — selling fees" },
      icon: Percent,
      size: "sm",
      config: tradeFeesConfig,
      component: TradeFeesWidget,
    },
  ],
};
