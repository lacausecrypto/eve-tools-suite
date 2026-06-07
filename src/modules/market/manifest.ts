import {
  CandlestickChart,
  Gauge,
  LayoutGrid,
  Star,
  Table,
  TrendingUp,
} from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { MarketModule } from "./MarketModule";
import {
  MarketMoversWidget,
  MarketPricesWidget,
  MarketTickerWidget,
  MarketWatchlistGridWidget,
  MarketWatchlistWidget,
  marketMoversConfig,
  marketPricesConfig,
  marketTickerConfig,
  marketWatchlistConfig,
  marketWatchlistGridConfig,
} from "./widgets";

export const marketManifest: ToolModule = {
  id: "market",
  name: { fr: "Explorateur de Marché", en: "Market Browser" },
  tagline: {
    fr: "Explorateur de marché multi-hubs — carnet, marge & historique",
    en: "Multi-hub market browser — order book, margin & history",
  },
  description: {
    fr:
      "Le carnet d'ordres complet d'EVE en mieux qu'eve-tycoon : cherche ou parcours " +
      "le catalogue, vois vendeurs et acheteurs sur les grands hubs (ou tous agrégés), " +
      "moyennes pondérées 5 %, marge, spread, volumes, sécurité par localisation, " +
      "filtres puissants, watchlist et courbe d'historique. 100 % ESI publique.",
    en:
      "EVE's full order book, better than eve-tycoon: search or browse the catalog, see " +
      "sellers and buyers across the major hubs (or all aggregated), 5% weighted averages, " +
      "margin, spread, volumes, per-location security, powerful filters, a watchlist and a " +
      "price-history chart. 100% public ESI.",
  },
  icon: CandlestickChart,
  accent: "hsl(var(--success))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    eulaSafe: true,
  },
  component: MarketModule,
  widgets: [
    {
      id: "ticker",
      title: { fr: "Marché — prix live", en: "Market — live price" },
      icon: Gauge,
      size: "sm",
      config: marketTickerConfig,
      component: MarketTickerWidget,
    },
    {
      id: "prices",
      title: { fr: "Marché — prix du suivi", en: "Market — watchlist prices" },
      icon: Table,
      size: "md",
      config: marketPricesConfig,
      component: MarketPricesWidget,
    },
    {
      id: "movers",
      title: { fr: "Marché — opportunités", en: "Market — opportunities" },
      icon: TrendingUp,
      size: "lg",
      config: marketMoversConfig,
      component: MarketMoversWidget,
    },
    {
      id: "watchlist",
      title: { fr: "Marché — suivi", en: "Market — watchlist" },
      icon: Star,
      size: "sm",
      config: marketWatchlistConfig,
      component: MarketWatchlistWidget,
    },
    {
      id: "watchlist-grid",
      title: { fr: "Marché — types suivis", en: "Market — tracked types" },
      icon: LayoutGrid,
      size: "md",
      config: marketWatchlistGridConfig,
      component: MarketWatchlistGridWidget,
    },
  ],
};
