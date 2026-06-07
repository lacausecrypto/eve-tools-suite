/**
 * Traductions du module Reprocessing & Compression (refine).
 * Enregistrées dans les dictionnaires partagés à l'import du module.
 */
import { registerMessages } from "@/core/i18n";

const fr = {
  // Onglets
  "refine.tab.reprocess": "Reprocess",
  "refine.tab.compress": "Compression (cible minéraux)",

  // Configuration partagée
  "refine.config.baseRate": "Rendement de base structure",
  "refine.preset.npc": "Station NPC",
  "refine.preset.athanor": "Athanor",
  "refine.preset.tatara": "Tatara",
  "refine.skill.reprocessing": "Reprocessing",
  "refine.skill.efficiency": "Reprocessing Eff.",
  "refine.skill.oreProcessing": "Traitement minerai",
  "refine.skill.level": "Niveau {n}",
  "refine.implant": "Implant",
  "refine.implant.none": "Aucun",
  "refine.price": "Prix",
  "refine.price.sell": "Vente",
  "refine.price.buy": "Achat",
  "refine.effectiveRate": "Rendement effectif {rate}",

  // Reprocess — saisie
  "refine.reprocess.title": "Minerai à raffiner",
  "refine.reprocess.placeholder":
    "Colle ton minerai (inventaire / multibuy)\nVeldspar\t120 000\nCompressed Spodumain 5000\nDark Ochre 8000",
  "refine.reprocess.run": "Raffiner & valoriser",

  // Compress — saisie
  "refine.compress.title": "Minéraux requis",
  "refine.compress.compressedOnly": "Minerai compressé uniquement",
  "refine.compress.solve": "Optimiser le mix",
  "refine.compress.clear": "Vider",

  // États
  "refine.status.loading": "Prix & calcul…",

  // KPI Reprocess
  "refine.kpi.refined": "Raffiné ({basis})",
  "refine.kpi.basis.sell": "vente",
  "refine.kpi.basis.buy": "achat",
  "refine.kpi.raw": "Minerai brut",
  "refine.kpi.refineVsSell": "Raffiner vs vendre",
  "refine.kpi.volume": "Volume",

  // Verdict
  "refine.verdict.refine": "✓ Raffiner est plus rentable que vendre le minerai brut.",
  "refine.verdict.sell": "⚠ Vendre le minerai brut rapporte plus que raffiner ici.",

  // Reprocess — tableau & messages
  "refine.rep.none.title": "Aucun minerai reconnu",
  "refine.rep.none.suffix": " ({names}…)",
  "refine.rep.none.check": ". Vérifie les noms.",
  "refine.rep.col.material": "Minéral",
  "refine.rep.col.qty": "Quantité",
  "refine.rep.col.value": "Valeur",
  "refine.rep.unmatched": "Non reconnus : {names}",

  // KPI Compress
  "refine.comp.kpi.totalCost": "Coût total (achat)",
  "refine.comp.kpi.compressedVolume": "Volume compressé",
  "refine.comp.kpi.oreTypes": "Types de minerai",
  "refine.comp.partial": "⚠ Cible partiellement couverte (aucun minerai dispo/prix pour certains minéraux).",
  "refine.comp.col.oreToBuy": "Minerai à acheter",
  "refine.comp.col.units": "Unités",
  "refine.comp.col.cost": "Coût",
  "refine.comp.col.volume": "Volume",
  "refine.comp.produced": "Minéraux produits (avec surplus)",
  "refine.comp.note":
    "Mix glouton quasi-optimal (couverture de minéraux nécessaires par ISK). Coût = achat au prix de vente Jita, après rendement de reprocessing.",

  // Intro
  "refine.intro.reprocess":
    "Colle ton minerai → minéraux récupérés (rendement selon tes compétences/structure), valeur raffinée vs minerai brut, et le verdict raffiner ou vendre.",
  "refine.intro.compress":
    "Saisis tes besoins en minéraux → le meilleur mix de minerai compressé à acheter (coût et volume minimisés), après ton rendement de reprocessing.",

  // Erreur
  "refine.error.web": "Calcul indisponible hors application desktop (Fuzzwork bloqué en dev navigateur).",
};

const en: typeof fr = {
  // Tabs
  "refine.tab.reprocess": "Reprocess",
  "refine.tab.compress": "Compression (mineral target)",

  // Shared configuration
  "refine.config.baseRate": "Structure base yield",
  "refine.preset.npc": "NPC station",
  "refine.preset.athanor": "Athanor",
  "refine.preset.tatara": "Tatara",
  "refine.skill.reprocessing": "Reprocessing",
  "refine.skill.efficiency": "Reprocessing Eff.",
  "refine.skill.oreProcessing": "Ore Processing",
  "refine.skill.level": "Level {n}",
  "refine.implant": "Implant",
  "refine.implant.none": "None",
  "refine.price": "Price",
  "refine.price.sell": "Sell",
  "refine.price.buy": "Buy",
  "refine.effectiveRate": "Effective yield {rate}",

  // Reprocess — input
  "refine.reprocess.title": "Ore to refine",
  "refine.reprocess.placeholder":
    "Paste your ore (inventory / multibuy)\nVeldspar\t120 000\nCompressed Spodumain 5000\nDark Ochre 8000",
  "refine.reprocess.run": "Refine & value",

  // Compress — input
  "refine.compress.title": "Required minerals",
  "refine.compress.compressedOnly": "Compressed ore only",
  "refine.compress.solve": "Optimize the mix",
  "refine.compress.clear": "Clear",

  // States
  "refine.status.loading": "Prices & compute…",

  // Reprocess KPI
  "refine.kpi.refined": "Refined ({basis})",
  "refine.kpi.basis.sell": "sell",
  "refine.kpi.basis.buy": "buy",
  "refine.kpi.raw": "Raw ore",
  "refine.kpi.refineVsSell": "Refine vs sell",
  "refine.kpi.volume": "Volume",

  // Verdict
  "refine.verdict.refine": "✓ Refining is more profitable than selling the raw ore.",
  "refine.verdict.sell": "⚠ Selling the raw ore earns more than refining here.",

  // Reprocess — table & messages
  "refine.rep.none.title": "No ore recognized",
  "refine.rep.none.suffix": " ({names}…)",
  "refine.rep.none.check": ". Check the names.",
  "refine.rep.col.material": "Mineral",
  "refine.rep.col.qty": "Quantity",
  "refine.rep.col.value": "Value",
  "refine.rep.unmatched": "Not recognized: {names}",

  // Compress KPI
  "refine.comp.kpi.totalCost": "Total cost (buy)",
  "refine.comp.kpi.compressedVolume": "Compressed volume",
  "refine.comp.kpi.oreTypes": "Ore types",
  "refine.comp.partial": "⚠ Target partially covered (no available ore/price for some minerals).",
  "refine.comp.col.oreToBuy": "Ore to buy",
  "refine.comp.col.units": "Units",
  "refine.comp.col.cost": "Cost",
  "refine.comp.col.volume": "Volume",
  "refine.comp.produced": "Minerals produced (with surplus)",
  "refine.comp.note":
    "Near-optimal greedy mix (coverage of required minerals per ISK). Cost = purchase at Jita sell price, after reprocessing yield.",

  // Intro
  "refine.intro.reprocess":
    "Paste your ore → minerals recovered (yield based on your skills/structure), refined value vs raw ore, and the refine-or-sell verdict.",
  "refine.intro.compress":
    "Enter your mineral needs → the best compressed-ore mix to buy (cost and volume minimized), after your reprocessing yield.",

  // Error
  "refine.error.web": "Computation unavailable outside the desktop app (Fuzzwork blocked in browser dev).",
};

registerMessages({ fr, en });
