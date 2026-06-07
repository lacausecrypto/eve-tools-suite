import { HeartCrack } from "lucide-react";
import type { ToolModule } from "@/core/module/types";
import { LossModule } from "./LossModule";

export const lossManifest: ToolModule = {
  id: "loss",
  name: { fr: "Analyseur de Pertes", en: "Loss Analyzer" },
  tagline: {
    fr: "Post-mortem de killmail — qui t'a tué et pourquoi",
    en: "Killmail post-mortem — who killed you and why",
  },
  description: {
    fr:
      "Colle un lien killmail/zKill ou un pseudo de pilote (on retrouve sa " +
      "dernière perte) et obtiens un post-mortem digeste : qui t'a tué (final " +
      "blow, top dégâts), composition du gang, valeurs ISK détruit/droppé, fit " +
      "reconstruit et pistes « ce qui aurait pu sauver le fit ». Réutilise le " +
      "moteur ESI + zKillboard de la suite.",
    en:
      "Paste a killmail/zKill link or a pilot name (we find their latest loss) " +
      "and get a digestible post-mortem: who killed you (final blow, top damage), " +
      "gang composition, destroyed/dropped ISK, reconstructed fit and " +
      "'what could have saved the fit' tips. Reuses the suite's ESI + zKillboard engine.",
  },
  icon: HeartCrack,
  accent: "hsl(var(--primary))",
  status: "beta",
  version: "0.1.0",
  esi: {
    publicEsi: true,
    auth: false,
    thirdParty: ["zKillboard"],
    eulaSafe: true,
  },
  component: LossModule,
};
