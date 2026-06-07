import { registerModules } from "@/core/module/registry";
import { miningManifest } from "./mining/manifest";
import { pirateManifest } from "./pirate/manifest";
import { piManifest } from "./pi/manifest";
import { lossManifest } from "./loss/manifest";
import { skillsManifest } from "./skills/manifest";
import { industryManifest } from "./industry/manifest";
import { marketManifest } from "./market/manifest";
import { tradeManifest } from "./trade/manifest";
import { atelierManifest } from "./atelier/manifest";
import { activityManifest } from "./activity/manifest";
import { abyssalManifest } from "./abyssal/manifest";
import { appraisalManifest } from "./appraisal/manifest";
import { lpManifest } from "./lp/manifest";
import { refineManifest } from "./refine/manifest";
// Le Ship Recognition Trainer est désormais regroupé dans l'EVE Academy
// (sous-page « Entraînement ») ; il n'est plus enregistré comme outil séparé.
import { academyManifest } from "./academy/manifest";

/**
 * Point d'enregistrement de tous les modules-outils de la suite.
 * Ajouter un outil = créer son dossier `modules/<id>/` avec un manifeste, puis
 * l'ajouter ici. Rien d'autre dans le shell ne change.
 */
registerModules([
  miningManifest,
  pirateManifest,
  piManifest,
  lossManifest,
  skillsManifest,
  industryManifest,
  marketManifest,
  tradeManifest,
  atelierManifest,
  activityManifest,
  abyssalManifest,
  appraisalManifest,
  lpManifest,
  refineManifest,
  academyManifest,
]);
