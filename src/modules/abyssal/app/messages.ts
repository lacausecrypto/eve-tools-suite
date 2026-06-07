/**
 * Traductions du module Appraiser Abyssal. Clés préfixées « abyssal. ».
 * Enregistrées à l'import du module (avant le premier rendu).
 */
import { registerMessages } from "@/core/i18n";

const fr = {
  // Onglets
  "abyssal.tab.evaluate": "Évaluer un roll",
  "abyssal.tab.explore": "Explorer les plages",

  // EvaluateView — saisie
  "abyssal.eval.linkTitle": "Lien du module abyssal",
  "abyssal.eval.placeholder":
    "Lie le module dans un canal de chat, copie la ligne et colle-la ici…\n<url=showinfo:47408//1043571243760>10MN Abyssal Afterburner</url>",
  "abyssal.eval.run": "Évaluer le roll",
  "abyssal.eval.save": "Sauvegarder",
  "abyssal.eval.tip": "Astuce : clic-droit sur le module → Lier, dans un chat.",
  "abyssal.eval.savedTitle": "Rolls sauvegardés",
  "abyssal.eval.savedEmpty":
    "Sauvegarde tes évaluations pour comparer plusieurs modules/contrats côte à côte.",

  // EvaluateView — erreurs
  "abyssal.error.invalidLink":
    "Lien invalide. Lie le module abyssal dans un canal de chat, copie la ligne et colle-la (format showinfo:type//item).",
  "abyssal.error.unknownMutaplasmid": "Mutaplasmide non répertorié dans la base de plages.",
  "abyssal.error.devUnavailable":
    "Évaluation indisponible hors application desktop (ESI direct bloqué en dev).",

  // EvaluateView — résultat
  "abyssal.result.quality": "Qualité du roll",
  "abyssal.result.mutedAttrs": "Attributs mutés",
  "abyssal.ref.base": "Module de base (Jita)",
  "abyssal.ref.mutaplasmid": "Mutaplasmide (Jita)",
  "abyssal.ref.rollCost": "Coût de roll (matière)",

  // EvaluateView — MarketCard
  "abyssal.market.resaleTitle": "Prix de revente (MutaMarket)",
  "abyssal.market.resaleEstTitle": "Prix de revente estimé (MutaMarket)",
  "abyssal.market.noEstimate":
    "Pas encore d'estimation : ce module n'a jamais été vu sur un contrat MutaMarket. Repère : ",
  "abyssal.market.bareModule": "module nu {n} ISK",
  "abyssal.market.bareModuleSuffix": " (valeur plancher, hors mutation).",
  "abyssal.market.appraise": "Appraiser ce module sur MutaMarket ↗",
  "abyssal.market.estHistorical": "estimation historique",
  "abyssal.market.confidence": "± {pct} % · {n} ventes",
  "abyssal.market.updated": " · maj {date}",
  "abyssal.market.marginVsRoll": "Marge vs roll",
  "abyssal.market.onSale": "En vente (contrat)",
  "abyssal.market.viewOn": "Voir sur MutaMarket ↗",

  // EvaluateView — AttrRow
  "abyssal.attr.worst": "pire {n}",
  "abyssal.attr.base": "base {n}",
  "abyssal.attr.best": "meilleur {n}",

  // Qualité (codes stables)
  "abyssal.quality.godroll": "God-roll",
  "abyssal.quality.excellent": "Excellent",
  "abyssal.quality.correct": "Correct",
  "abyssal.quality.poor": "Médiocre",
  "abyssal.quality.bad": "Mauvais",

  // ExploreView
  "abyssal.explore.module": "Module abyssal",
  "abyssal.explore.loading": "(chargement…)",
  "abyssal.explore.families": "· {n} familles",
  "abyssal.explore.placeholder": "Ex. 50MN Abyssal Microwarpdrive, Abyssal Stasis Webifier…",
  "abyssal.explore.values": "Valeurs",
  "abyssal.explore.multipliers": "Multiplicateurs (×)",
  "abyssal.explore.empty":
    "Choisis un module abyssal pour comparer ses mutaplasmides (Decayed / Gravid / Unstable / Glorified…) : amplitude des rolls, coût et plages par attribut, côte à côte.",
  "abyssal.explore.amplitude": "amplitude ±{pct} %",
  "abyssal.explore.rangesByAttr": "Plages par attribut",
  "abyssal.explore.absolute": "valeurs absolues",
  "abyssal.explore.multBase": "multiplicateurs (base = 1×)",
  "abyssal.explore.higherBetter": "↑ mieux",
  "abyssal.explore.lowerBetter": "↓ mieux",
  "abyssal.explore.base": "base {n}",
  "abyssal.explore.footnote":
    "Survole une barre pour les valeurs exactes du tier. La zone ombrée indique le côté « amélioration ». Choisis un module de base pour passer en valeurs absolues.",
};

const en: Record<keyof typeof fr, string> = {
  // Tabs
  "abyssal.tab.evaluate": "Evaluate a roll",
  "abyssal.tab.explore": "Explore ranges",

  // EvaluateView — input
  "abyssal.eval.linkTitle": "Abyssal module link",
  "abyssal.eval.placeholder":
    "Link the module in a chat channel, copy the line and paste it here…\n<url=showinfo:47408//1043571243760>10MN Abyssal Afterburner</url>",
  "abyssal.eval.run": "Evaluate the roll",
  "abyssal.eval.save": "Save",
  "abyssal.eval.tip": "Tip: right-click the module → Link, in a chat.",
  "abyssal.eval.savedTitle": "Saved rolls",
  "abyssal.eval.savedEmpty":
    "Save your evaluations to compare several modules/contracts side by side.",

  // EvaluateView — errors
  "abyssal.error.invalidLink":
    "Invalid link. Link the abyssal module in a chat channel, copy the line and paste it (showinfo:type//item format).",
  "abyssal.error.unknownMutaplasmid": "Mutaplasmid not listed in the ranges database.",
  "abyssal.error.devUnavailable":
    "Evaluation unavailable outside the desktop app (direct ESI blocked in dev).",

  // EvaluateView — result
  "abyssal.result.quality": "Roll quality",
  "abyssal.result.mutedAttrs": "Mutated attributes",
  "abyssal.ref.base": "Base module (Jita)",
  "abyssal.ref.mutaplasmid": "Mutaplasmid (Jita)",
  "abyssal.ref.rollCost": "Roll cost (materials)",

  // EvaluateView — MarketCard
  "abyssal.market.resaleTitle": "Resale price (MutaMarket)",
  "abyssal.market.resaleEstTitle": "Estimated resale price (MutaMarket)",
  "abyssal.market.noEstimate":
    "No estimate yet: this module has never been seen on a MutaMarket contract. Reference: ",
  "abyssal.market.bareModule": "bare module {n} ISK",
  "abyssal.market.bareModuleSuffix": " (floor value, mutation excluded).",
  "abyssal.market.appraise": "Appraise this module on MutaMarket ↗",
  "abyssal.market.estHistorical": "historical estimate",
  "abyssal.market.confidence": "± {pct} % · {n} sales",
  "abyssal.market.updated": " · updated {date}",
  "abyssal.market.marginVsRoll": "Margin vs roll",
  "abyssal.market.onSale": "On sale (contract)",
  "abyssal.market.viewOn": "View on MutaMarket ↗",

  // EvaluateView — AttrRow
  "abyssal.attr.worst": "worst {n}",
  "abyssal.attr.base": "base {n}",
  "abyssal.attr.best": "best {n}",

  // Quality (stable codes)
  "abyssal.quality.godroll": "God-roll",
  "abyssal.quality.excellent": "Excellent",
  "abyssal.quality.correct": "Decent",
  "abyssal.quality.poor": "Mediocre",
  "abyssal.quality.bad": "Bad",

  // ExploreView
  "abyssal.explore.module": "Abyssal module",
  "abyssal.explore.loading": "(loading…)",
  "abyssal.explore.families": "· {n} families",
  "abyssal.explore.placeholder": "e.g. 50MN Abyssal Microwarpdrive, Abyssal Stasis Webifier…",
  "abyssal.explore.values": "Values",
  "abyssal.explore.multipliers": "Multipliers (×)",
  "abyssal.explore.empty":
    "Pick an abyssal module to compare its mutaplasmids (Decayed / Gravid / Unstable / Glorified…): roll amplitude, cost and per-attribute ranges, side by side.",
  "abyssal.explore.amplitude": "amplitude ±{pct} %",
  "abyssal.explore.rangesByAttr": "Ranges by attribute",
  "abyssal.explore.absolute": "absolute values",
  "abyssal.explore.multBase": "multipliers (base = 1×)",
  "abyssal.explore.higherBetter": "↑ better",
  "abyssal.explore.lowerBetter": "↓ better",
  "abyssal.explore.base": "base {n}",
  "abyssal.explore.footnote":
    "Hover a bar for the tier's exact values. The shaded zone indicates the “improvement” side. Pick a base module to switch to absolute values.",
};

registerMessages({ fr, en });
