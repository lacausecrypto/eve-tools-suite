/**
 * Traductions du module Pirate (« L'Assistant du Pirate »). Clés préfixées
 * « pirate. ». Enregistrées à l'import du module (avant le premier rendu).
 *
 * Les noms propres EVE (factions, vaisseaux, systèmes, classes de coques issues
 * de l'ESI/SDE) ne sont PAS traduits — seule la prose descriptive l'est.
 */
import { registerMessages } from "@/core/i18n";

const fr = {
  // Barre d'action / synthèse
  "pirate.summary.pilots": "{n} pilotes · {ms} ms",
  "pirate.watchlist.button": "Surveillance ({n})",

  // Panneau watchlist
  "pirate.watchlist.title": "Ta liste de surveillance",
  "pirate.watchlist.subtitle":
    "Les tags persistent localement et se réappliquent aux scans futurs.",
  "pirate.watchlist.empty":
    "Aucun pilote tagué pour l'instant. Tague quelqu'un dans le tableau ci-dessous.",
  "pirate.watchlist.notePlaceholder": "ajoute une note…",

  // Saisie
  "pirate.input.placeholder":
    "Dans EVE : Ctrl+A → Ctrl+C la liste des membres du local, puis appuie sur le raccourci global (Cmd/Ctrl+Shift+L) où que tu sois — ou colle ici (analyse auto), ou Ctrl+Entrée.",
  "pirate.input.analyze": "Analyser",
  "pirate.input.analyzing": "Analyse…",
  "pirate.input.clear": "Effacer",

  // Filtres
  "pirate.filter.search": "Filtrer nom / corpo / alliance…",
  "pirate.filter.hideHarmless": "Masquer inoffensifs",
  "pirate.filter.foesOnly": "Ennemis seulement",
  "pirate.filter.count": "{shown} / {total}",

  // En-têtes de colonnes
  "pirate.col.threat": "Menace",
  "pirate.col.pilot": "Pilote",
  "pirate.col.corpAlliance": "Corpo / Alliance",
  "pirate.col.sec": "Sec",
  "pirate.col.kd": "K/D",
  "pirate.col.danger": "Danger",
  "pirate.col.seen": "Vu",
  "pirate.col.flies": "Vole",
  "pirate.col.tag": "Tag",

  // État vide
  "pirate.empty":
    "Aucun pilote pour l'instant. Colle une copie du local-chat ou d'une liste de membres ci-dessus.",

  // Niveaux de menace (libellés affichés)
  "pirate.threat.deadly": "mortel",
  "pirate.threat.dangerous": "dangereux",
  "pirate.threat.moderate": "modéré",
  "pirate.threat.harmless": "inoffensif",
  "pirate.threat.unknown": "inconnu",

  // Tags de surveillance (libellés affichés)
  "pirate.tag.none": "— aucun —",
  "pirate.tag.placeholder": "— tag —",
  "pirate.tag.friend": "ami",
  "pirate.tag.foe": "ennemi",
  "pirate.tag.cyno": "cyno",
  "pirate.tag.spy": "espion",

  // Ligne pilote
  "pirate.row.predictFit": "Prédire le fit depuis les pertes récentes",
  "pirate.row.cyno": "CYNO",
  "pirate.row.suspectedCyno": "Cyno suspecté",
  "pirate.row.notableHull": "Classe de coque notable qu'il pilote",
  "pirate.row.kills": "{n} kills",

  // Panneau de fit — états
  "pirate.fit.loading": "Reconstruction du fit depuis les pertes récentes…",

  // Panneau de fit — verdict cyno
  "pirate.fit.cynoSuspect": "Cyno suspecté · {pct}%",

  // Panneau de fit — activité
  "pirate.fit.activity": "Activité (UTC, sur {n} pertes)",
  "pirate.fit.primetimeNow": "● en primetime maintenant",
  "pirate.fit.outsidePrimetime": "hors primetime maintenant",
  "pirate.fit.hourTooltip": "{hour}:00 UTC — {n} pertes",

  // Panneau de fit — fits prédits
  "pirate.fit.predicted":
    "Fits prédits · {n} de ses propres pertes examinées · la doctrine complète le reste",
  "pirate.fit.lost": "perdu",
  "pirate.fit.flownByOrg": "piloté par l'org",
  "pirate.fit.sample": "{n}× {what}",
  "pirate.fit.killmail": "killmail",

  // Sources de fit (libellés affichés)
  "pirate.source.own_loss": "fit perso",
  "pirate.source.corp_doctrine": "doctrine corpo",
  "pirate.source.alliance_doctrine": "doctrine alliance",

  // Niveaux de confiance (libellés affichés)
  "pirate.conf.high": "élevée",
  "pirate.conf.medium": "moyenne",
  "pirate.conf.low": "faible",

  // Groupes de slots (libellés affichés)
  "pirate.slot.high": "Hauts",
  "pirate.slot.mid": "Médians",
  "pirate.slot.low": "Bas",
  "pirate.slot.rig": "Rigs",
  "pirate.slot.other": "Drones / Subs",

  // Réseau de gang
  "pirate.net.show": "Afficher le réseau de gang",
  "pirate.net.loading": "Analyse des kills récents…",
  "pirate.net.fliesWith": "Vole souvent avec · {n} kills récents examinés",
  "pirate.net.empty": "Aucun équipier récurrent trouvé.",
  "pirate.net.openZkill": "Ouvrir sur zKillboard",
  "pirate.net.failed": "échec de la recherche réseau",
};

const en: typeof fr = {
  // Action bar / summary
  "pirate.summary.pilots": "{n} pilots · {ms} ms",
  "pirate.watchlist.button": "Watchlist ({n})",

  // Watchlist panel
  "pirate.watchlist.title": "Your watchlist",
  "pirate.watchlist.subtitle":
    "Tags persist locally and re-apply to future scans.",
  "pirate.watchlist.empty":
    "No tagged pilots yet. Tag someone in the table below.",
  "pirate.watchlist.notePlaceholder": "add a note…",

  // Input
  "pirate.input.placeholder":
    "In EVE: Ctrl+A → Ctrl+C the local member list, then press the global hotkey (Cmd/Ctrl+Shift+L) anywhere — or paste here (auto-analyzes), or Ctrl+Enter.",
  "pirate.input.analyze": "Analyze",
  "pirate.input.analyzing": "Analyzing…",
  "pirate.input.clear": "Clear",

  // Filters
  "pirate.filter.search": "Filter name / corp / alliance…",
  "pirate.filter.hideHarmless": "Hide harmless",
  "pirate.filter.foesOnly": "Foes only",
  "pirate.filter.count": "{shown} / {total}",

  // Column headers
  "pirate.col.threat": "Threat",
  "pirate.col.pilot": "Pilot",
  "pirate.col.corpAlliance": "Corp / Alliance",
  "pirate.col.sec": "Sec",
  "pirate.col.kd": "K/D",
  "pirate.col.danger": "Danger",
  "pirate.col.seen": "Seen",
  "pirate.col.flies": "Flies",
  "pirate.col.tag": "Tag",

  // Empty state
  "pirate.empty":
    "No pilots yet. Paste a local-chat or member-list copy above.",

  // Threat levels (display labels)
  "pirate.threat.deadly": "deadly",
  "pirate.threat.dangerous": "dangerous",
  "pirate.threat.moderate": "moderate",
  "pirate.threat.harmless": "harmless",
  "pirate.threat.unknown": "unknown",

  // Watch tags (display labels)
  "pirate.tag.none": "— none —",
  "pirate.tag.placeholder": "— tag —",
  "pirate.tag.friend": "friend",
  "pirate.tag.foe": "foe",
  "pirate.tag.cyno": "cyno",
  "pirate.tag.spy": "spy",

  // Pilot row
  "pirate.row.predictFit": "Predict fit from recent losses",
  "pirate.row.cyno": "CYNO",
  "pirate.row.suspectedCyno": "Suspected cyno",
  "pirate.row.notableHull": "Notable hull class they fly",
  "pirate.row.kills": "{n} kills",

  // Fit panel — states
  "pirate.fit.loading": "Reconstructing fit from recent losses…",

  // Fit panel — cyno verdict
  "pirate.fit.cynoSuspect": "Suspected cyno · {pct}%",

  // Fit panel — activity
  "pirate.fit.activity": "Activity (UTC, from {n} losses)",
  "pirate.fit.primetimeNow": "● in primetime now",
  "pirate.fit.outsidePrimetime": "outside primetime now",
  "pirate.fit.hourTooltip": "{hour}:00 UTC — {n} losses",

  // Fit panel — predicted fits
  "pirate.fit.predicted":
    "Predicted fits · {n} of their own losses examined · doctrine fills the rest",
  "pirate.fit.lost": "lost",
  "pirate.fit.flownByOrg": "flown by org",
  "pirate.fit.sample": "{n}× {what}",
  "pirate.fit.killmail": "killmail",

  // Fit sources (display labels)
  "pirate.source.own_loss": "own fit",
  "pirate.source.corp_doctrine": "corp doctrine",
  "pirate.source.alliance_doctrine": "alliance doctrine",

  // Confidence levels (display labels)
  "pirate.conf.high": "high",
  "pirate.conf.medium": "medium",
  "pirate.conf.low": "low",

  // Slot groups (display labels)
  "pirate.slot.high": "High",
  "pirate.slot.mid": "Mid",
  "pirate.slot.low": "Low",
  "pirate.slot.rig": "Rigs",
  "pirate.slot.other": "Drones / Subs",

  // Gang network
  "pirate.net.show": "Show gang network",
  "pirate.net.loading": "Analyzing recent kills…",
  "pirate.net.fliesWith": "Frequently flies with · {n} recent kills examined",
  "pirate.net.empty": "No recurring wingmen found.",
  "pirate.net.openZkill": "Open on zKillboard",
  "pirate.net.failed": "network lookup failed",
};

registerMessages({ fr, en });
