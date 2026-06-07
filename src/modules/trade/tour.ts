import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useTrade } from "./app/store";

const DEMO_MB = "Tritanium\t500000\nPyerite\t120000\nMexallon\t30000\nIsogen\t8000";

/** Visite guidée du Trade Co-Pilot (liste multibuy d'exemple pré-remplie). */
export const tradeTour: ModuleTour = {
  id: "trade",
  demo: () => {
    const restore = snapshot(useTrade);
    useTrade.getState().setMb({ mbText: DEMO_MB });
    return restore;
  },
  steps: [
    { anchor: "trade.root", titleKey: "tour.trade.s1.title", bodyKey: "tour.trade.s1.body" },
    { anchor: "trade.root", titleKey: "tour.trade.s2.title", bodyKey: "tour.trade.s2.body" },
    { anchor: "trade.root", titleKey: "tour.trade.s3.title", bodyKey: "tour.trade.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.trade.s1.title": "Où faire de l'ISK",
    "tour.trade.s1.body": "Trois modes : station-trading (scanne un hub et classe les meilleurs flips), arbitrage inter-hubs, et multibuy/transport.",
    "tour.trade.s2.title": "Multibuy chiffré",
    "tour.trade.s2.body": "Un exemple de liste multibuy est pré-rempli : compare le coût d'achat entre hubs et planifie ton transport (cargo, sauts).",
    "tour.trade.s3.title": "Profit net & ROI",
    "tour.trade.s3.body": "Chaque opportunité affiche le profit net (taxes/courtage inclus), le ROI et le nombre de sauts — pour trier les vrais bons plans.",
  },
  en: {
    "tour.trade.s1.title": "Where to make ISK",
    "tour.trade.s1.body": "Three modes: station-trading (scan a hub and rank the best flips), inter-hub arbitrage, and multibuy/hauling.",
    "tour.trade.s2.title": "Priced multibuy",
    "tour.trade.s2.body": "A sample multibuy list is pre-filled: compare buy cost across hubs and plan your hauling (cargo, jumps).",
    "tour.trade.s3.title": "Net profit & ROI",
    "tour.trade.s3.body": "Each opportunity shows net profit (taxes/broker included), ROI and jump count — to sort the real winners.",
  },
});
