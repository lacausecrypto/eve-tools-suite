/**
 * Traductions du module Market Browser. Clés préfixées « market. ».
 * Enregistrées à l'import du module (avant le premier rendu).
 */
import { registerMessages } from "@/core/i18n";

const fr = {
  // MarketView — en-tête / actions
  "market.header.unitVolume": "Volume unitaire {n} m³",
  "market.action.watch": "Suivre",
  "market.action.analyze": "Analyse",
  "market.action.refresh": "Rafraîchir",

  // MarketView — états
  "market.loading.book": "Chargement du carnet d'ordres…",
  "market.error.load": "Impossible de charger le marché",
  "market.loading.history": "Chargement de l'historique…",

  // MarketView — onglets analyse
  "market.tab.priceVolume": "Prix & volume",
  "market.tab.depth": "Profondeur du carnet",

  // MarketView — sections ordres
  "market.section.sellers": "Vendeurs · {n} ordres",
  "market.section.buyers": "Acheteurs · {n} ordres",

  // MarketView — état vide
  "market.empty.title": "Explorateur de marché",
  "market.empty.body":
    "Cherche un objet ou parcours le catalogue à gauche. Carnet d'ordres complet (vendeurs/acheteurs), moyennes 5 %, marge, volumes et historique — sur les grands hubs ou agrégé.",
  "market.empty.webNote":
    "Mode web : ESI publique en direct. L'application desktop pose le User-Agent conforme et surveille le quota d'erreurs.",

  // Portées (SCOPES) — seul l'agrégat est traduisible (le reste sont des noms propres)
  "market.scope.hubs": "Tous les hubs majeurs",

  // OrderTable — colonnes
  "market.col.region": "Région",
  "market.col.quantity": "Quantité",
  "market.col.price": "Prix",
  "market.col.location": "Localisation",
  "market.col.range": "Portée",
  "market.col.minVol": "Vol. min",
  "market.col.expiresIn": "Expire dans",
  "market.col.modified": "Modifié",

  // OrderTable — état / actions
  "market.orders.emptySell": "Aucun ordre de vente (selon les filtres).",
  "market.orders.emptyBuy": "Aucun ordre d'achat (selon les filtres).",
  "market.orders.collapse": "Réduire (afficher les {n} meilleurs)",
  "market.orders.showMore": "Voir les {n} autres ordres",
  "market.orders.copyTitle": "Copier « {name} »",
  "market.orders.copied": "Localisation copiée",
  "market.orders.copyFailed": "Copie impossible",

  // Sidebar
  "market.search.placeholder": "Nom d'objet…",
  "market.search.noExact": "Aucun objet exact « {query} » sur ESI.",
  "market.filters.hide": "Masquer les filtres",
  "market.filters.show": "Filtres",
  "market.filters.price": "Prix (ISK)",
  "market.filters.quantity": "Quantité",
  "market.filters.security": "Sécurité",
  "market.filters.locationRegex": "Localisation (regex)",
  "market.filters.locationPlaceholder": "ex. Jita|Amarr",
  "market.filters.npcOnly": "Stations PNJ uniquement",
  "market.filters.reset": "Réinitialiser les filtres",
  "market.range.min": "min",
  "market.range.max": "max",
  "market.watchlist.title": "Suivi",
  "market.catalog.curated": "Populaire",
  "market.catalog.full": "Tout le marché",

  // CatalogTree — libellés du catalogue curé (les noms de groupes EVE propres
  // restent inchangés et passent par le repli sur la clé brute).
  "market.cat.Vaisseaux miniers": "Vaisseaux miniers",
  "market.cat.Vaisseaux de combat": "Vaisseaux de combat",
  "market.cat.Logistique": "Logistique",
  "market.cat.Minerais & minéraux": "Minerais & minéraux",
  "market.cat.Glace & carburant": "Glace & carburant",
  "market.cat.Munitions & charges": "Munitions & charges",
  "market.cat.Drones": "Drones",
  "market.cat.Modules populaires": "Modules populaires",
  "market.cat.Special & consommables": "Spécial & consommables",
  "market.cat.Minéraux": "Minéraux",
  "market.cat.Minerais courants": "Minerais courants",
  "market.cat.Minerais profonds": "Minerais profonds",
  "market.cat.Minerais nullsec": "Minerais nullsec",
  "market.cat.Glace": "Glace",
  "market.cat.Produits de glace": "Produits de glace",
  "market.cat.Charges hybrides": "Charges hybrides",
  "market.cat.Munitions projectiles": "Munitions projectiles",
  "market.cat.Cristaux de fréquence": "Cristaux de fréquence",
  "market.cat.Missiles légers": "Missiles légers",
  "market.cat.Drones de combat": "Drones de combat",
  "market.cat.Drones Sentry / lourds": "Drones Sentry / lourds",
  "market.cat.Défense": "Défense",
  "market.cat.Propulsion & tackle": "Propulsion & tackle",
  "market.cat.Comptes & SP": "Comptes & SP",

  // CatalogTree / MarketGroupTree
  "market.catalog.noMatch": "Aucun objet du catalogue ne correspond — appuie sur Entrée pour chercher tout EVE.",
  "market.tree.building": "Construction du catalogue marché…",
  "market.tree.progress": "{done} / {total} groupes",
  "market.tree.onceNote": "Une seule fois — ensuite chargé depuis le cache local.",
  "market.tree.noGroup": "Aucun groupe correspondant.",

  // StatTiles
  "market.stat.avgSell": "Vente moy. (5%)",
  "market.stat.avgBuy": "Achat moy. (5%)",
  "market.stat.margin": "Marge",
  "market.stat.sellVolume": "Volume vente",
  "market.stat.buyVolume": "Volume achat",
  "market.stat.spread": "Spread",
  "market.stat.jumps": "Sauts",
  "market.stat.best": "meilleur {n}",

  // HistoryChart — contrôles / légende / métriques
  "market.history.volUnits": "Vol. unités",
  "market.history.volIsk": "Vol. ISK",
  "market.history.average": "Moyenne",
  "market.history.ma5": "MA5",
  "market.history.ma20": "MA20",
  "market.history.hiLo": "Haut / bas",
  "market.history.avgVolDay": "Volume moy/j",
  "market.history.iskTradedDay": "ISK échangés/j",
  "market.history.daysToClear": "Jours d'écoulement",
  "market.history.daysToClearHint": "stock vente / vol. quotidien",
  "market.history.lessThan": "< 0.1 j",
  "market.history.days": "{n} j",
  "market.history.axisLabel": "Historique de prix",
  "market.history.high": "Haut",
  "market.history.low": "Bas",
  "market.history.volumeIsk": "Volume ISK",
  "market.history.volume": "Volume",
  "market.history.notEnough": "Pas assez d'historique sur cette plage.",

  // Plages d'historique (RANGE_LABEL)
  "market.range.1m": "1 mois",
  "market.range.3m": "3 mois",
  "market.range.1y": "1 an",
  "market.range.all": "Tout",

  // DepthChart
  "market.depth.empty": "Pas d'ordres à afficher pour la profondeur.",
  "market.depth.buy": "Achat",
  "market.depth.sell": "Vente",
  "market.depth.spread": "Spread",
  "market.depth.maxDepth": "Profondeur max {n}",
  "market.depth.axisLabel": "Profondeur du carnet",
  "market.depth.buyGtePrice": "Achat ≥ prix",
  "market.depth.sellLtePrice": "Vente ≤ prix",

  // format.ts — temps / portée d'ordre
  "market.fmt.expired": "expiré",
  "market.fmt.dhm": "{d}j {h}h {m}m",
  "market.fmt.hm": "{h}h {m}m",
  "market.fmt.min": "{m} min",
  "market.fmt.justNow": "à l'instant",
  "market.fmt.agoMin": "il y a {n} min",
  "market.fmt.agoHour": "il y a {n} h",
  "market.fmt.agoDay": "il y a {n} j",
  "market.range.station": "Station",
  "market.range.solarsystem": "Système",
  "market.range.region": "Région",
  "market.range.jumps": "{n} sauts",
};

const en: Record<keyof typeof fr, string> = {
  // MarketView — header / actions
  "market.header.unitVolume": "Unit volume {n} m³",
  "market.action.watch": "Watch",
  "market.action.analyze": "Analysis",
  "market.action.refresh": "Refresh",

  // MarketView — states
  "market.loading.book": "Loading order book…",
  "market.error.load": "Unable to load the market",
  "market.loading.history": "Loading history…",

  // MarketView — analysis tabs
  "market.tab.priceVolume": "Price & volume",
  "market.tab.depth": "Order book depth",

  // MarketView — order sections
  "market.section.sellers": "Sellers · {n} orders",
  "market.section.buyers": "Buyers · {n} orders",

  // MarketView — empty state
  "market.empty.title": "Market explorer",
  "market.empty.body":
    "Search for an item or browse the catalog on the left. Full order book (sellers/buyers), 5% averages, margin, volumes and history — on the major hubs or aggregated.",
  "market.empty.webNote":
    "Web mode: live public ESI. The desktop app sets the compliant User-Agent and watches the error budget.",

  // Scopes (SCOPES) — only the aggregate is translatable (the rest are proper nouns)
  "market.scope.hubs": "All major hubs",

  // OrderTable — columns
  "market.col.region": "Region",
  "market.col.quantity": "Quantity",
  "market.col.price": "Price",
  "market.col.location": "Location",
  "market.col.range": "Range",
  "market.col.minVol": "Min vol.",
  "market.col.expiresIn": "Expires in",
  "market.col.modified": "Updated",

  // OrderTable — state / actions
  "market.orders.emptySell": "No sell orders (per the filters).",
  "market.orders.emptyBuy": "No buy orders (per the filters).",
  "market.orders.collapse": "Collapse (show top {n})",
  "market.orders.showMore": "Show the other {n} orders",
  "market.orders.copyTitle": "Copy “{name}”",
  "market.orders.copied": "Location copied",
  "market.orders.copyFailed": "Copy failed",

  // Sidebar
  "market.search.placeholder": "Item name…",
  "market.search.noExact": "No exact item “{query}” on ESI.",
  "market.filters.hide": "Hide filters",
  "market.filters.show": "Filters",
  "market.filters.price": "Price (ISK)",
  "market.filters.quantity": "Quantity",
  "market.filters.security": "Security",
  "market.filters.locationRegex": "Location (regex)",
  "market.filters.locationPlaceholder": "e.g. Jita|Amarr",
  "market.filters.npcOnly": "NPC stations only",
  "market.filters.reset": "Reset filters",
  "market.range.min": "min",
  "market.range.max": "max",
  "market.watchlist.title": "Watchlist",
  "market.catalog.curated": "Popular",
  "market.catalog.full": "Whole market",

  // CatalogTree — curated catalog labels (EVE proper group names stay as-is via
  // the raw-key fallback).
  "market.cat.Vaisseaux miniers": "Mining ships",
  "market.cat.Vaisseaux de combat": "Combat ships",
  "market.cat.Logistique": "Logistics",
  "market.cat.Minerais & minéraux": "Ores & minerals",
  "market.cat.Glace & carburant": "Ice & fuel",
  "market.cat.Munitions & charges": "Ammo & charges",
  "market.cat.Drones": "Drones",
  "market.cat.Modules populaires": "Popular modules",
  "market.cat.Special & consommables": "Special & consumables",
  "market.cat.Minéraux": "Minerals",
  "market.cat.Minerais courants": "Common ores",
  "market.cat.Minerais profonds": "Deep ores",
  "market.cat.Minerais nullsec": "Nullsec ores",
  "market.cat.Glace": "Ice",
  "market.cat.Produits de glace": "Ice products",
  "market.cat.Charges hybrides": "Hybrid charges",
  "market.cat.Munitions projectiles": "Projectile ammo",
  "market.cat.Cristaux de fréquence": "Frequency crystals",
  "market.cat.Missiles légers": "Light missiles",
  "market.cat.Drones de combat": "Combat drones",
  "market.cat.Drones Sentry / lourds": "Sentry / heavy drones",
  "market.cat.Défense": "Defense",
  "market.cat.Propulsion & tackle": "Propulsion & tackle",
  "market.cat.Comptes & SP": "Accounts & SP",

  // CatalogTree / MarketGroupTree
  "market.catalog.noMatch": "No catalog item matches — press Enter to search all of EVE.",
  "market.tree.building": "Building market catalog…",
  "market.tree.progress": "{done} / {total} groups",
  "market.tree.onceNote": "Once only — then loaded from the local cache.",
  "market.tree.noGroup": "No matching group.",

  // StatTiles
  "market.stat.avgSell": "Avg sell (5%)",
  "market.stat.avgBuy": "Avg buy (5%)",
  "market.stat.margin": "Margin",
  "market.stat.sellVolume": "Sell volume",
  "market.stat.buyVolume": "Buy volume",
  "market.stat.spread": "Spread",
  "market.stat.jumps": "Jumps",
  "market.stat.best": "best {n}",

  // HistoryChart — controls / legend / metrics
  "market.history.volUnits": "Vol. units",
  "market.history.volIsk": "Vol. ISK",
  "market.history.average": "Average",
  "market.history.ma5": "MA5",
  "market.history.ma20": "MA20",
  "market.history.hiLo": "High / low",
  "market.history.avgVolDay": "Avg volume/day",
  "market.history.iskTradedDay": "ISK traded/day",
  "market.history.daysToClear": "Days to clear",
  "market.history.daysToClearHint": "sell stock / daily vol.",
  "market.history.lessThan": "< 0.1 d",
  "market.history.days": "{n} d",
  "market.history.axisLabel": "Price history",
  "market.history.high": "High",
  "market.history.low": "Low",
  "market.history.volumeIsk": "Volume ISK",
  "market.history.volume": "Volume",
  "market.history.notEnough": "Not enough history over this range.",

  // History ranges (RANGE_LABEL)
  "market.range.1m": "1 month",
  "market.range.3m": "3 months",
  "market.range.1y": "1 year",
  "market.range.all": "All",

  // DepthChart
  "market.depth.empty": "No orders to display for the depth.",
  "market.depth.buy": "Buy",
  "market.depth.sell": "Sell",
  "market.depth.spread": "Spread",
  "market.depth.maxDepth": "Max depth {n}",
  "market.depth.axisLabel": "Order book depth",
  "market.depth.buyGtePrice": "Buy ≥ price",
  "market.depth.sellLtePrice": "Sell ≤ price",

  // format.ts — time / order range
  "market.fmt.expired": "expired",
  "market.fmt.dhm": "{d}d {h}h {m}m",
  "market.fmt.hm": "{h}h {m}m",
  "market.fmt.min": "{m} min",
  "market.fmt.justNow": "just now",
  "market.fmt.agoMin": "{n} min ago",
  "market.fmt.agoHour": "{n} h ago",
  "market.fmt.agoDay": "{n} d ago",
  "market.range.station": "Station",
  "market.range.solarsystem": "System",
  "market.range.region": "Region",
  "market.range.jumps": "{n} jumps",
};

registerMessages({ fr, en });
