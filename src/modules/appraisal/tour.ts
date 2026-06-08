import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useAppraisal } from "./app/store";

const DEMO = "Tritanium 50000\nPyerite 12000\nMexallon 3000\nIsogen 800\nNocxium 120";

export const appraisalTour: ModuleTour = {
  id: "appraisal",
  demo: () => {
    const restore = snapshot(useAppraisal);
    useAppraisal.getState().setText(DEMO);
    return restore;
  },
  steps: [
    { anchor: "appraisal.input", titleKey: "tour.appraisal.input.title", bodyKey: "tour.appraisal.input.body" },
    { anchor: "appraisal.vwap", titleKey: "tour.appraisal.vwap.title", bodyKey: "tour.appraisal.vwap.body" },
    { anchor: "appraisal.run", titleKey: "tour.appraisal.run.title", bodyKey: "tour.appraisal.run.body" },
    { anchor: "appraisal.results", titleKey: "tour.appraisal.results.title", bodyKey: "tour.appraisal.results.body" },
  ],
};

registerMessages({
  fr: {
    "tour.appraisal.input.title": "1. Colle ton lot",
    "tour.appraisal.input.body": "Colle ici n'importe quel texte EVE : inventaire, scan de cargo, contenu de contrat, loot. Un exemple est déjà collé — une ligne = un objet (avec sa quantité).",
    "tour.appraisal.vwap.title": "2. Option VWAP",
    "tour.appraisal.vwap.body": "Active VWAP pour des prix moyens pondérés par le volume échangé : plus robuste que la moyenne simple, surtout sur les marchés peu liquides.",
    "tour.appraisal.run.title": "3. Estimer",
    "tour.appraisal.run.body": "Lance l'estimation : la suite résout chaque objet et calcule sa valeur sur tous les hubs majeurs (Jita, Amarr, Dodixie, Rens, Hek).",
    "tour.appraisal.results.title": "4. Résultat & détail",
    "tour.appraisal.results.body": "Valeur totale achat/vente, volume (m³) et EIV s'affichent ici. Choisis le hub de référence, la base (vente/achat/split) pour trier le détail, et copie un résumé partageable.",
  },
  en: {
    "tour.appraisal.input.title": "1. Paste your batch",
    "tour.appraisal.input.body": "Paste any EVE text here: inventory, cargo scan, contract contents, loot. A sample is already pasted — one line = one item (with its quantity).",
    "tour.appraisal.vwap.title": "2. VWAP option",
    "tour.appraisal.vwap.body": "Enable VWAP for volume-weighted average prices: more robust than a simple mean, especially on thin markets.",
    "tour.appraisal.run.title": "3. Appraise",
    "tour.appraisal.run.body": "Run it: the suite resolves each item and values it across all major hubs (Jita, Amarr, Dodixie, Rens, Hek).",
    "tour.appraisal.results.title": "4. Result & breakdown",
    "tour.appraisal.results.body": "Total buy/sell value, volume (m³) and EIV show here. Pick the reference hub, the basis (sell/buy/split) to sort the breakdown, and copy a shareable summary.",
  },
});
