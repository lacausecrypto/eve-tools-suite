import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useMarket } from "./app/store";

export const marketTour: ModuleTour = {
  id: "market",
  demo: () => {
    const restore = snapshot(useMarket);
    useMarket.getState().select(34, "Tritanium");
    return restore;
  },
  steps: [
    { anchor: "market.search", titleKey: "tour.market.search.title", bodyKey: "tour.market.search.body" },
    { anchor: "market.watch", titleKey: "tour.market.watch.title", bodyKey: "tour.market.watch.body" },
    { anchor: "market.analyze", titleKey: "tour.market.analyze.title", bodyKey: "tour.market.analyze.body" },
  ],
};

registerMessages({
  fr: {
    "tour.market.search.title": "1. Trouver un objet",
    "tour.market.search.body": "Cherche par nom (Tritanium est pré-sélectionné), ou parcours le catalogue à gauche — vue « Curé » (populaires) ou « Complet ». 100 % ESI publique, sans login.",
    "tour.market.watch.title": "2. Watchlist & portée",
    "tour.market.watch.body": "L'étoile ajoute l'objet à ta watchlist pour le suivre. Juste à côté, la portée : tous les hubs majeurs, ou une région précise.",
    "tour.market.analyze.title": "3. Analyse & carnet",
    "tour.market.analyze.body": "Bascule la vue Analysis : historique des prix (moyennes mobiles) et profondeur du carnet. En dessous, le carnet complet — vendeurs (vert) et acheteurs (bleu) avec prix, quantité et lieu.",
  },
  en: {
    "tour.market.search.title": "1. Find an item",
    "tour.market.search.body": "Search by name (Tritanium is pre-selected), or browse the catalog on the left — \"Curated\" (popular) or \"Full\" view. 100% public ESI, no login.",
    "tour.market.watch.title": "2. Watchlist & scope",
    "tour.market.watch.body": "The star adds the item to your watchlist to track it. Right next to it, the scope: all major hubs, or a specific region.",
    "tour.market.analyze.title": "3. Analysis & order book",
    "tour.market.analyze.body": "Toggle the Analysis view: price history (moving averages) and order-book depth. Below, the full book — sellers (green) and buyers (blue) with price, quantity and location.",
  },
});
