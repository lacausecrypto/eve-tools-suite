import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useMarket } from "./app/store";

/** Visite guidée du Market Browser (démo : sélectionne Tritanium). */
export const marketTour: ModuleTour = {
  id: "market",
  demo: () => {
    const restore = snapshot(useMarket);
    useMarket.getState().select(34, "Tritanium");
    return restore;
  },
  steps: [
    { anchor: "market.root", titleKey: "tour.market.intro.title", bodyKey: "tour.market.intro.body" },
    { anchor: "market.root", titleKey: "tour.market.analysis.title", bodyKey: "tour.market.analysis.body" },
  ],
};

registerMessages({
  fr: {
    "tour.market.intro.title": "Explore le marché",
    "tour.market.intro.body":
      "Cherche un objet dans la barre de gauche ; le carnet d'ordres multi-hubs s'affiche à droite. 100 % ESI publique — aucun login.",
    "tour.market.analysis.title": "Carnet & analyse",
    "tour.market.analysis.body":
      "Exemple : Tritanium. Tu vois la marge, le spread et les volumes, plus la vue Analysis : historique des prix (moyennes mobiles), profondeur du carnet et liquidité.",
  },
  en: {
    "tour.market.intro.title": "Explore the market",
    "tour.market.intro.body":
      "Search an item in the left bar; the multi-hub order book shows on the right. 100% public ESI — no login.",
    "tour.market.analysis.title": "Order book & analysis",
    "tour.market.analysis.body":
      "Example: Tritanium. You get margin, spread and volumes, plus the Analysis view: price history (moving averages), order-book depth and liquidity.",
  },
});
