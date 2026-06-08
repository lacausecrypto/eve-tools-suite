import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useTrade } from "./app/store";

const DEMO_MB = "Tritanium\t500000\nPyerite\t120000\nMexallon\t30000\nIsogen\t8000";

export const tradeTour: ModuleTour = {
  id: "trade",
  demo: () => {
    const restore = snapshot(useTrade);
    useTrade.getState().setMb({ mbText: DEMO_MB });
    return restore;
  },
  steps: [
    { anchor: "trade.tabs", titleKey: "tour.trade.tabs.title", bodyKey: "tour.trade.tabs.body" },
    { anchor: "trade.fees", titleKey: "tour.trade.fees.title", bodyKey: "tour.trade.fees.body" },
    { anchor: "trade.tabs", titleKey: "tour.trade.profit.title", bodyKey: "tour.trade.profit.body" },
  ],
};

registerMessages({
  fr: {
    "tour.trade.tabs.title": "1. Quatre modes",
    "tour.trade.tabs.body": "Scanner station (flips d'un hub), Scanner arbitrage (écarts inter-hubs), Planificateur d'itinéraire, et Panier multibuy (un exemple est rempli).",
    "tour.trade.fees.title": "2. Tes frais",
    "tour.trade.fees.body": "Le courtage (%) et la taxe de vente (%) s'appliquent à TOUS les calculs de profit, dans tous les onglets — règle-les une seule fois ici.",
    "tour.trade.profit.title": "3. Profit net & transport",
    "tour.trade.profit.body": "Chaque opportunité affiche le profit net (frais inclus), le ROI et le nombre de sauts ; les scanners exportent vers le panier multibuy pour planifier l'achat et le transport.",
  },
  en: {
    "tour.trade.tabs.title": "1. Four modes",
    "tour.trade.tabs.body": "Station scanner (one-hub flips), Arbitrage scanner (inter-hub spreads), Route planner, and Multibuy basket (a sample is filled).",
    "tour.trade.fees.title": "2. Your fees",
    "tour.trade.fees.body": "Broker (%) and sales tax (%) apply to ALL profit calculations, in every tab — set them once here.",
    "tour.trade.profit.title": "3. Net profit & hauling",
    "tour.trade.profit.body": "Each opportunity shows net profit (fees included), ROI and jump count; the scanners export to the multibuy basket to plan buying and hauling.",
  },
});
