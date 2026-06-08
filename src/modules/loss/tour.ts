import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useLossInput } from "./app/store";

export const lossTour: ModuleTour = {
  id: "loss",
  demo: () => {
    const restore = snapshot(useLossInput);
    useLossInput.getState().setInput("https://zkillboard.com/kill/120814500/");
    return restore;
  },
  steps: [
    { anchor: "loss.input", titleKey: "tour.loss.input.title", bodyKey: "tour.loss.input.body" },
    { anchor: "loss.run", titleKey: "tour.loss.run.title", bodyKey: "tour.loss.run.body" },
    { anchor: "loss.body", titleKey: "tour.loss.body.title", bodyKey: "tour.loss.body.body" },
  ],
};

registerMessages({
  fr: {
    "tour.loss.input.title": "1. L'entrée",
    "tour.loss.input.body": "Colle un lien zKillboard, un id de killmail, ou simplement un pseudo de pilote (on récupère sa dernière perte). Un exemple est pré-rempli ; la touche Entrée lance aussi l'analyse.",
    "tour.loss.run.title": "2. Analyser",
    "tour.loss.run.body": "La suite récupère le killmail (ESI + zKillboard) et reconstruit l'engagement.",
    "tour.loss.body.title": "3. Le post-mortem",
    "tour.loss.body.body": "Ici s'affichent : qui t'a tué, la taille du gang (solo → blob), la valeur détruite/droppée, le fit reconstitué slot par slot, et des pistes sur ce qui aurait pu sauver le vaisseau.",
  },
  en: {
    "tour.loss.input.title": "1. The input",
    "tour.loss.input.body": "Paste a zKillboard link, a killmail id, or just a pilot name (we fetch their latest loss). A sample is pre-filled; Enter also runs it.",
    "tour.loss.run.title": "2. Analyze",
    "tour.loss.run.body": "The suite fetches the killmail (ESI + zKillboard) and rebuilds the engagement.",
    "tour.loss.body.title": "3. The post-mortem",
    "tour.loss.body.body": "Here you get: who killed you, gang size (solo → blob), ISK destroyed/dropped, the reconstructed fit slot by slot, and hints on what could have saved the ship.",
  },
});
