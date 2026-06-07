/**
 * Traductions du Journal d'Activité (ISK/heure). Clés préfixées « activity. ».
 * Enregistrées dans les dictionnaires partagés à l'import du module.
 */
import { registerMessages } from "@/core/i18n";

const fr = {
  // Onglets
  "activity.tab.session": "Session",
  "activity.tab.history": "Historique",
  "activity.tab.drops": "Taux de drop",

  // SessionView — configuration
  "activity.activity": "Activité",
  "activity.site.runs": "Site / type (pour les taux de drop)",
  "activity.site.optional": "Site / type (optionnel)",
  "activity.site.ph": "Ex. T5 Exotic Gila, Serpentis 10/10…",
  "activity.timer.pause": "Pause",
  "activity.timer.resume": "Reprendre",
  "activity.timer.start": "Démarrer",
  "activity.timer.reset": "Remettre le chrono à zéro",
  "activity.runs": "Runs",

  // SessionView — KPIs
  "activity.kpi.iskPerHour": "ISK / heure",
  "activity.kpi.net": "Net",
  "activity.kpi.gross": "Brut",
  "activity.kpi.loot": "Butin",
  "activity.kpi.costs": "Coûts",
  "activity.kpi.netPerRun": "Net / run",
  "activity.kpi.income": "Revenus",

  // SessionView — butin
  "activity.loot.ore": "Minerai / butin",
  "activity.loot.plain": "Butin",
  "activity.basis.buy": "Jita achat",
  "activity.basis.sell": "Jita vente",
  "activity.loot.ph": "Colle ton butin (inventaire ou multibuy)\nNocxium\t125\nGila Blueprint\nGuristas Shield Booster",
  "activity.loot.value": "Valoriser & ajouter",
  "activity.loot.clear": "Vider",
  "activity.loot.error.desktop": "Échec de la valorisation (ESI/Fuzzwork indisponible).",
  "activity.loot.error.web": "Valorisation indisponible hors application desktop.",
  "activity.loot.unresolved": "Non reconnus : {names}",

  // SessionView — revenus / coûts / clôture
  "activity.income.title": "Revenus ISK",
  "activity.costs.title": "Coûts",
  "activity.entry.label": "Libellé",
  "activity.entry.isk": "ISK (5m, 1.2b)",
  "activity.entry.presetTip": "Saisis le montant puis clique",
  "activity.finish": "Terminer & enregistrer",
  "activity.finish.note":
    "La session est ajoutée à l'historique et alimente les taux de drop. Le chrono est mural (continue même fenêtre fermée tant qu'il tourne).",

  // HistoryView
  "activity.history.empty": "Aucune session enregistrée. Lance un chrono dans l'onglet « Session » puis « Terminer ».",
  "activity.history.sessions": "Sessions",
  "activity.history.sess": "sess.",
  "activity.history.netCumulative": "Net cumulé",
  "activity.history.runs": "runs",

  // DropRatesView
  "activity.drops.filter": "Filtrer par site (optionnel)",
  "activity.drops.filter.ph": "Ex. T5, Gila…",
  "activity.drops.sessions": "session(s)",
  "activity.drops.runs": "runs",
  "activity.drops.avgPerRun": "Valeur moyenne / run :",
  "activity.drops.empty":
    "Pas de butin enregistré pour {activity}. Termine des sessions avec du butin valorisé et un compteur de runs pour bâtir des taux de drop.",
  "activity.drops.col.item": "Objet",
  "activity.drops.col.appeared": "Apparition",
  "activity.drops.col.totalQty": "Qté totale",
  "activity.drops.col.perRun": "Par run",
  "activity.drops.col.valuePerRun": "Valeur / run",

  // Activités (data labels)
  "activity.act.ratting": "Ratting / Anomalies",
  "activity.act.abyssal": "Abyssal Deadspace",
  "activity.act.missions": "Missions (agents)",
  "activity.act.mining": "Minage",
  "activity.act.exploration": "Exploration (data / relic)",
  "activity.act.incursion": "Incursions",

  // Préréglages revenus / coûts (data labels)
  "activity.preset.bounties": "Primes (bounties)",
  "activity.preset.ess": "ESS / récompense",
  "activity.preset.ammo": "Munitions",
  "activity.preset.filaments": "Filaments",
  "activity.preset.reward": "Récompense",
  "activity.preset.bountiesShort": "Primes",
  "activity.preset.lp": "LP (converti en ISK)",
  "activity.preset.crystals": "Cristaux / charges",
  "activity.preset.iskReward": "Récompense ISK",
};

const en = {
  // Tabs
  "activity.tab.session": "Session",
  "activity.tab.history": "History",
  "activity.tab.drops": "Drop rates",

  // SessionView — configuration
  "activity.activity": "Activity",
  "activity.site.runs": "Site / type (for drop rates)",
  "activity.site.optional": "Site / type (optional)",
  "activity.site.ph": "e.g. T5 Exotic Gila, Serpentis 10/10…",
  "activity.timer.pause": "Pause",
  "activity.timer.resume": "Resume",
  "activity.timer.start": "Start",
  "activity.timer.reset": "Reset the timer",
  "activity.runs": "Runs",

  // SessionView — KPIs
  "activity.kpi.iskPerHour": "ISK / hour",
  "activity.kpi.net": "Net",
  "activity.kpi.gross": "Gross",
  "activity.kpi.loot": "Loot",
  "activity.kpi.costs": "Costs",
  "activity.kpi.netPerRun": "Net / run",
  "activity.kpi.income": "Income",

  // SessionView — loot
  "activity.loot.ore": "Ore / loot",
  "activity.loot.plain": "Loot",
  "activity.basis.buy": "Jita buy",
  "activity.basis.sell": "Jita sell",
  "activity.loot.ph": "Paste your loot (inventory or multibuy)\nNocxium\t125\nGila Blueprint\nGuristas Shield Booster",
  "activity.loot.value": "Value & add",
  "activity.loot.clear": "Clear",
  "activity.loot.error.desktop": "Valuation failed (ESI/Fuzzwork unavailable).",
  "activity.loot.error.web": "Valuation unavailable outside the desktop app.",
  "activity.loot.unresolved": "Unrecognized: {names}",

  // SessionView — income / costs / finish
  "activity.income.title": "ISK income",
  "activity.costs.title": "Costs",
  "activity.entry.label": "Label",
  "activity.entry.isk": "ISK (5m, 1.2b)",
  "activity.entry.presetTip": "Enter the amount then click",
  "activity.finish": "Finish & save",
  "activity.finish.note":
    "The session is added to the history and feeds the drop rates. The timer is wall-clock (keeps running even with the window closed while it's on).",

  // HistoryView
  "activity.history.empty": "No session recorded. Start a timer in the « Session » tab then « Finish ».",
  "activity.history.sessions": "Sessions",
  "activity.history.sess": "sess.",
  "activity.history.netCumulative": "Cumulative net",
  "activity.history.runs": "runs",

  // DropRatesView
  "activity.drops.filter": "Filter by site (optional)",
  "activity.drops.filter.ph": "e.g. T5, Gila…",
  "activity.drops.sessions": "session(s)",
  "activity.drops.runs": "runs",
  "activity.drops.avgPerRun": "Average value / run:",
  "activity.drops.empty":
    "No loot recorded for {activity}. Finish sessions with valued loot and a run counter to build drop rates.",
  "activity.drops.col.item": "Item",
  "activity.drops.col.appeared": "Appearance",
  "activity.drops.col.totalQty": "Total qty",
  "activity.drops.col.perRun": "Per run",
  "activity.drops.col.valuePerRun": "Value / run",

  // Activities (data labels)
  "activity.act.ratting": "Ratting / Anomalies",
  "activity.act.abyssal": "Abyssal Deadspace",
  "activity.act.missions": "Missions (agents)",
  "activity.act.mining": "Mining",
  "activity.act.exploration": "Exploration (data / relic)",
  "activity.act.incursion": "Incursions",

  // Income / cost presets (data labels)
  "activity.preset.bounties": "Bounties",
  "activity.preset.ess": "ESS / reward",
  "activity.preset.ammo": "Ammunition",
  "activity.preset.filaments": "Filaments",
  "activity.preset.reward": "Reward",
  "activity.preset.bountiesShort": "Bounties",
  "activity.preset.lp": "LP (converted to ISK)",
  "activity.preset.crystals": "Crystals / charges",
  "activity.preset.iskReward": "ISK reward",
};

registerMessages({ fr, en });
