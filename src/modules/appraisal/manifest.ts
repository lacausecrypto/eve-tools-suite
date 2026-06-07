import { Receipt } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { AppraisalModule } from "./AppraisalModule";

import { appraisalTour } from "./tour";

export const appraisalManifest: ToolModule = {
  id: "appraisal",
  name: { fr: "Estimateur de prix", en: "Appraisal" },
  tagline: {
    fr: "Estime tout — valeur Jita achat/vente, volume, EIV",
    en: "Appraise anything — Jita buy/sell value, volume, EIV",
  },
  description: {
    fr:
      "Le remplaçant intégré d'Evepraisal : colle n'importe quoi (inventaire, " +
      "scan de cargo, contenu d'un contrat, butin, liste multibuy) et obtiens la " +
      "valeur instantanée — Jita achat / vente / split, volume total (m³) et EIV " +
      "(prix ajusté), avec le détail par ligne et le pourcentage de chaque item. " +
      "Choix du hub (Jita/Amarr/Dodixie/Rens/Hek), mode VWAP par profondeur du " +
      "carnet pour les gros volumes, résumé copiable et historique. Réutilise le " +
      "service de pricing partagé. 100 % ESI publique + Fuzzwork.",
    en:
      "The built-in Evepraisal replacement: paste anything (inventory, cargo " +
      "scan, contract contents, loot, multibuy list) and get instant value — " +
      "Jita buy / sell / split, total volume (m³) and EIV (adjusted price), with " +
      "a per-line breakdown and each item's share. Hub selection " +
      "(Jita/Amarr/Dodixie/Rens/Hek), order-book VWAP mode for large volumes, " +
      "copyable summary and history. Reuses the shared pricing service. Public " +
      "ESI + Fuzzwork.",
  },
  icon: Receipt,
  accent: "hsl(var(--primary))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["Fuzzwork"],
    eulaSafe: true,
  },
  component: AppraisalModule,
  tour: appraisalTour,
};
