import { registerMessages } from "@/core/i18n";

/** Traductions propres au module Appraisal (clés préfixées `appraisal.`). */
registerMessages({
  fr: {
    // Hubs (labels rendus via la clé, plus de littéral en dur dans l'UI)
    "appraisal.hub.jita": "Jita (Forge)",
    "appraisal.hub.amarr": "Amarr (Domain)",
    "appraisal.hub.dodixie": "Dodixie (Sinq)",
    "appraisal.hub.rens": "Rens (Heimatar)",
    "appraisal.hub.hek": "Hek (Metropolis)",

    // Saisie
    "appraisal.input.title": "Items à estimer",
    "appraisal.input.placeholder":
      "Colle n'importe quoi :\n• inventaire / scan de cargo / contrat\n• multibuy (Nom  Qté)\n• butin, liste de noms\n\nTritanium\t12 500\nGila\nLarge Skill Injector x3",
    "appraisal.vwap.label": "VWAP par profondeur",
    "appraisal.vwap.hint": "(Jita · gros volumes)",
    "appraisal.run": "Estimer sur tous les hubs",

    // Appraisals sauvegardés
    "appraisal.saved.title": "Appraisals sauvegardés",

    // États
    "appraisal.loading": "Résolution & valorisation sur 5 hubs…",
    "appraisal.error.desktopOnly":
      "Appraisal indisponible hors application desktop (ESI/Fuzzwork bloqués en dev navigateur).",

    // Comparaison des hubs
    "appraisal.hubs.caption": "Valeur par hub — clique pour le détail",
    "appraisal.hubs.summary":
      "{lines} types · {units} unités · {volume} · EIV {eiv} ISK",
    "appraisal.badge.sell": "vente",
    "appraisal.badge.buy": "achat",
    "appraisal.hub.buySuffix": "achat",

    // KPIs
    "appraisal.kpi.sell": "Vente ({hub})",
    "appraisal.kpi.buy": "Achat",
    "appraisal.kpi.split": "Split",
    "appraisal.kpi.eiv": "EIV",

    // Actions
    "appraisal.copy": "Copier le résumé",
    "appraisal.copied": "Copié",
    "appraisal.save": "Sauvegarder",

    // Bascule de base
    "appraisal.basis.sell": "Vente",
    "appraisal.basis.buy": "Achat",
    "appraisal.basis.split": "Split",

    // Non reconnus
    "appraisal.unresolved": "Non reconnus ({n}) : {names}{more}",

    // En-têtes de table
    "appraisal.table.item": "Item",
    "appraisal.table.qty": "Qté",
    "appraisal.table.unit": "Unitaire",
    "appraisal.table.total": "Total",
    "appraisal.table.volume": "m³",
    "appraisal.table.pct": "%",

    // Pied de table
    "appraisal.footer": "Total {basis} ({hub}) :",
    "appraisal.footer.note": " · prix via Fuzzwork · EIV = prix ajusté ESI.",

    // Intro (les **mots** sont rendus en gras par le composant)
    "appraisal.intro.body":
      "Colle un **inventaire**, un **scan de cargo**, le contenu d'un **contrat** ou une liste **multibuy** → valeur **achat / vente / split** sur **les 5 grands hubs**, avec volume et EIV. Le remplaçant intégré d'Evepraisal.",
    "appraisal.intro.tag.allHubs": "Tous les hubs",
    "appraisal.intro.tag.vwap": "VWAP profondeur",
    "appraisal.intro.tag.perLine": "Détail par ligne",

    // Résumé copiable (compute.ts)
    "appraisal.summary.header":
      "Appraisal ({hub}) — {lines} types · {units} unités · {volume} m³",
    "appraisal.summary.totals":
      "Jita achat {buy} ISK · vente {sell} ISK · split {split} ISK · EIV {eiv} ISK",
  },
  en: {
    // Hubs
    "appraisal.hub.jita": "Jita (Forge)",
    "appraisal.hub.amarr": "Amarr (Domain)",
    "appraisal.hub.dodixie": "Dodixie (Sinq)",
    "appraisal.hub.rens": "Rens (Heimatar)",
    "appraisal.hub.hek": "Hek (Metropolis)",

    // Input
    "appraisal.input.title": "Items to appraise",
    "appraisal.input.placeholder":
      "Paste anything:\n• inventory / cargo scan / contract\n• multibuy (Name  Qty)\n• loot, list of names\n\nTritanium\t12 500\nGila\nLarge Skill Injector x3",
    "appraisal.vwap.label": "Depth-based VWAP",
    "appraisal.vwap.hint": "(Jita · large volumes)",
    "appraisal.run": "Appraise on all hubs",

    // Saved appraisals
    "appraisal.saved.title": "Saved appraisals",

    // States
    "appraisal.loading": "Resolving & valuing on 5 hubs…",
    "appraisal.error.desktopOnly":
      "Appraisal unavailable outside the desktop app (ESI/Fuzzwork blocked in browser dev).",

    // Hub comparison
    "appraisal.hubs.caption": "Value per hub — click for the breakdown",
    "appraisal.hubs.summary":
      "{lines} types · {units} units · {volume} · EIV {eiv} ISK",
    "appraisal.badge.sell": "sell",
    "appraisal.badge.buy": "buy",
    "appraisal.hub.buySuffix": "buy",

    // KPIs
    "appraisal.kpi.sell": "Sell ({hub})",
    "appraisal.kpi.buy": "Buy",
    "appraisal.kpi.split": "Split",
    "appraisal.kpi.eiv": "EIV",

    // Actions
    "appraisal.copy": "Copy summary",
    "appraisal.copied": "Copied",
    "appraisal.save": "Save",

    // Basis toggle
    "appraisal.basis.sell": "Sell",
    "appraisal.basis.buy": "Buy",
    "appraisal.basis.split": "Split",

    // Unresolved
    "appraisal.unresolved": "Unresolved ({n}): {names}{more}",

    // Table headers
    "appraisal.table.item": "Item",
    "appraisal.table.qty": "Qty",
    "appraisal.table.unit": "Unit",
    "appraisal.table.total": "Total",
    "appraisal.table.volume": "m³",
    "appraisal.table.pct": "%",

    // Table footer
    "appraisal.footer": "Total {basis} ({hub}):",
    "appraisal.footer.note": " · prices via Fuzzwork · EIV = ESI adjusted price.",

    // Intro (**words** are rendered bold by the component)
    "appraisal.intro.body":
      "Paste an **inventory**, a **cargo scan**, the contents of a **contract** or a **multibuy** list → **buy / sell / split** value across **the 5 major hubs**, with volume and EIV. The built-in Evepraisal replacement.",
    "appraisal.intro.tag.allHubs": "All hubs",
    "appraisal.intro.tag.vwap": "Depth VWAP",
    "appraisal.intro.tag.perLine": "Per-line breakdown",

    // Copyable summary (compute.ts)
    "appraisal.summary.header":
      "Appraisal ({hub}) — {lines} types · {units} units · {volume} m³",
    "appraisal.summary.totals":
      "Jita buy {buy} ISK · sell {sell} ISK · split {split} ISK · EIV {eiv} ISK",
  },
});
