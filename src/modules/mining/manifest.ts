import { Coins, History, Pickaxe } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { MiningModule } from "./MiningModule";
import {
  MiningActiveWidget,
  MiningRecentWidget,
  MiningTotalWidget,
  miningActiveConfig,
  miningRecentConfig,
  miningTotalConfig,
} from "./widgets";

export const miningManifest: ToolModule = {
  id: "mining",
  name: { fr: "Gestion de Flotte Minière", en: "Mining Fleet Manager" },
  tagline: {
    fr: "Sessions de minage en flotte & répartition ISK",
    en: "Fleet mining sessions & ISK split",
  },
  description: {
    fr:
      "À partir d'un simple copier-coller des Diffusions de flotte, déduit qui a miné " +
      "quoi, la présence de chacun, valorise au prix Jita (brut/compressé), gère le " +
      "retraitement, les consommables et calcule qui payer et combien.",
    en:
      "From a simple copy-paste of fleet broadcasts, it works out who mined what and " +
      "everyone's presence, values it at Jita prices (raw/compressed), handles " +
      "reprocessing and consumables, and computes who to pay and how much.",
  },
  icon: Pickaxe,
  accent: "hsl(var(--primary))",
  status: "stable",
  version: "1.3.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["Fuzzwork (prix marché)"],
    eulaSafe: true,
  },
  component: MiningModule,
  widgets: [
    {
      id: "active",
      title: { fr: "Mining — session active", en: "Mining — active session" },
      icon: Pickaxe,
      size: "sm",
      config: miningActiveConfig,
      component: MiningActiveWidget,
    },
    {
      id: "total",
      title: { fr: "Mining — total miné", en: "Mining — total mined" },
      icon: Coins,
      size: "sm",
      config: miningTotalConfig,
      component: MiningTotalWidget,
    },
    {
      id: "recent",
      title: { fr: "Mining — sessions récentes", en: "Mining — recent sessions" },
      icon: History,
      size: "md",
      config: miningRecentConfig,
      component: MiningRecentWidget,
    },
  ],
};
