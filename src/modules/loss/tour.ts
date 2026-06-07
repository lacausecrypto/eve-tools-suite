import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useLossInput } from "./app/store";

/** Visite guidée du Loss Analyzer (entrée d'exemple pré-remplie). */
export const lossTour: ModuleTour = {
  id: "loss",
  demo: () => {
    const restore = snapshot(useLossInput);
    useLossInput.getState().setInput("https://zkillboard.com/kill/120814500/");
    return restore;
  },
  steps: [
    { anchor: "loss.root", titleKey: "tour.loss.s1.title", bodyKey: "tour.loss.s1.body" },
    { anchor: "loss.root", titleKey: "tour.loss.s2.title", bodyKey: "tour.loss.s2.body" },
    { anchor: "loss.root", titleKey: "tour.loss.s3.title", bodyKey: "tour.loss.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.loss.s1.title": "Autopsie de killmail",
    "tour.loss.s1.body": "Colle un lien zKillboard, un id de killmail ou un pseudo (on cherche sa dernière perte). Un exemple est déjà rempli — clique Analyser.",
    "tour.loss.s2.title": "Qui, comment, avec qui",
    "tour.loss.s2.body": "L'outil reconstruit l'engagement : auteurs, taille du gang, valeur ISK détruite/droppée, et le fit reconstitué.",
    "tour.loss.s3.title": "Ce qui aurait aidé",
    "tour.loss.s3.body": "Des pistes heuristiques pointent les trous de résistance et ce qui aurait pu sauver le vaisseau (sans simuler le fit).",
  },
  en: {
    "tour.loss.s1.title": "Killmail post-mortem",
    "tour.loss.s1.body": "Paste a zKillboard link, a killmail id or a name (we find their latest loss). A sample is pre-filled — click Analyze.",
    "tour.loss.s2.title": "Who, how, with whom",
    "tour.loss.s2.body": "The tool rebuilds the engagement: attackers, gang size, ISK destroyed/dropped, and the reconstructed fit.",
    "tour.loss.s3.title": "What would have helped",
    "tour.loss.s3.body": "Heuristics point out resistance holes and what could have saved the ship (without simulating the fit).",
  },
});
