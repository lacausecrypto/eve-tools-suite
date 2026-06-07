import { Gift } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { LpModule } from "./LpModule";

import { lpTour } from "./tour";

export const lpManifest: ToolModule = {
  id: "lp",
  name: { fr: "Convertisseur LP", en: "LP Converter" },
  tagline: {
    fr: "ISK par point de loyauté — meilleures offres des LP stores",
    en: "ISK per loyalty point — best LP store deals",
  },
  description: {
    fr:
      "Choisis une corporation NPC et obtiens toutes les offres de son LP store " +
      "classées par ISK par point de loyauté : revente Jita (après taxe et " +
      "courtage), coût ISK et items requis déduits, filtre de liquidité (volume " +
      "marché) et plan de conversion selon ton solde de LP. 100 % ESI publique " +
      "(/loyalty/stores) + Fuzzwork, réutilise le service de pricing.",
    en:
      "Pick an NPC corporation and get all its LP store offers ranked by ISK per " +
      "loyalty point: Jita resale (after sales tax and broker fees), ISK cost and " +
      "required items deducted, liquidity filter (market volume) and a conversion " +
      "plan for your LP balance. Public ESI (/loyalty/stores) + Fuzzwork, reuses " +
      "the shared pricing service.",
  },
  icon: Gift,
  accent: "hsl(var(--primary))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["Fuzzwork"],
    eulaSafe: true,
  },
  component: LpModule,
  tour: lpTour,
};
