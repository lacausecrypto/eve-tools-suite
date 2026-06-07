/**
 * Traductions du module Convertisseur LP. Enregistrées à l'import (avant le
 * premier rendu) via `registerMessages`. Clés préfixées « lp. ».
 */
import { registerMessages } from "@/core/i18n";

registerMessages({
  fr: {
    "lp.corp.label": "Corporation NPC (LP store)",
    "lp.corp.placeholder": "Ex. Guristas, Sisters of EVE, Amarr Navy…",
    "lp.basis.label": "Revente",
    "lp.basis.sell": "Vente (patient)",
    "lp.basis.buy": "Achat (dump)",
    "lp.lpBalance.label": "Ton solde LP (plan)",
    "lp.lpBalance.placeholder": "ex. 250000",
    "lp.tax": "Taxe %",
    "lp.broker": "Courtage %",
    "lp.minVolume": "Volume min",
    "lp.profitableOnly": "Rentables uniquement",

    "lp.error.web": "Chargement indisponible hors application desktop (ESI/Fuzzwork bloqués en dev navigateur).",
    "lp.loading": "Chargement des offres & valorisation…",
    "lp.empty.filters": "Aucune offre rentable/liquide pour ces filtres. Assouplis « rentables uniquement » ou le volume min.",

    "lp.kpi.bestPerLp": "Meilleur ISK/LP",
    "lp.kpi.avgPerLp": "ISK/LP moyen (top)",
    "lp.kpi.profitableOffers": "Offres rentables",
    "lp.kpi.profitForLp": "Profit ({lp} LP)",
    "lp.kpi.tip": "Astuce",
    "lp.kpi.tipValue": "Saisis ton LP",

    "lp.col.offer": "Offre",
    "lp.col.lp": "LP",
    "lp.col.isk": "+ ISK",
    "lp.col.profit": "Profit/unité",
    "lp.col.iskPerLp": "ISK / LP",
    "lp.col.volume": "Volume",
    "lp.col.forYourLp": "Pour ton LP",
    "lp.required": "+{n} requis",

    "lp.footnote": "Profit = revente Jita (après frais) − coût ISK − items requis (achetés au prix de vente). Volume = ordres de vente Jita (proxy de liquidité). ",
    "lp.footnote.unpriced": "{n} offre(s) sans prix marché masquée(s).",

    "lp.intro.lead.choose": "Choisis une ",
    "lp.intro.lead.corp": "corporation NPC",
    "lp.intro.lead.andGet": " et obtiens toutes ses offres de LP store classées par ",
    "lp.intro.lead.iskPerLp": "ISK par point de loyauté",
    "lp.intro.lead.tail": " — revente Jita après frais, items requis déduits, filtre de liquidité et plan selon ton solde de LP.",
  },
  en: {
    "lp.corp.label": "NPC corporation (LP store)",
    "lp.corp.placeholder": "e.g. Guristas, Sisters of EVE, Amarr Navy…",
    "lp.basis.label": "Resell",
    "lp.basis.sell": "Sell (patient)",
    "lp.basis.buy": "Buy (dump)",
    "lp.lpBalance.label": "Your LP balance (plan)",
    "lp.lpBalance.placeholder": "e.g. 250000",
    "lp.tax": "Tax %",
    "lp.broker": "Broker %",
    "lp.minVolume": "Min volume",
    "lp.profitableOnly": "Profitable only",

    "lp.error.web": "Loading unavailable outside the desktop app (ESI/Fuzzwork blocked in browser dev).",
    "lp.loading": "Loading offers & valuation…",
    "lp.empty.filters": "No profitable/liquid offer for these filters. Loosen 'profitable only' or the min volume.",

    "lp.kpi.bestPerLp": "Best ISK/LP",
    "lp.kpi.avgPerLp": "Average ISK/LP (top)",
    "lp.kpi.profitableOffers": "Profitable offers",
    "lp.kpi.profitForLp": "Profit ({lp} LP)",
    "lp.kpi.tip": "Tip",
    "lp.kpi.tipValue": "Enter your LP",

    "lp.col.offer": "Offer",
    "lp.col.lp": "LP",
    "lp.col.isk": "+ ISK",
    "lp.col.profit": "Profit/unit",
    "lp.col.iskPerLp": "ISK / LP",
    "lp.col.volume": "Volume",
    "lp.col.forYourLp": "For your LP",
    "lp.required": "+{n} required",

    "lp.footnote": "Profit = Jita resale (after fees) − ISK cost − required items (bought at sell price). Volume = Jita sell orders (liquidity proxy). ",
    "lp.footnote.unpriced": "{n} offer(s) without market price hidden.",

    "lp.intro.lead.choose": "Pick an ",
    "lp.intro.lead.corp": "NPC corporation",
    "lp.intro.lead.andGet": " and get all its LP store offers ranked by ",
    "lp.intro.lead.iskPerLp": "ISK per loyalty point",
    "lp.intro.lead.tail": " — Jita resale after fees, required items deducted, liquidity filter and a plan based on your LP balance.",
  },
});
