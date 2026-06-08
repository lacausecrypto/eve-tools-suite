import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useStore } from "./app/store/useStore";

export const miningTour: ModuleTour = {
  id: "mining",
  demo: () => {
    const restore = snapshot(useStore);
    const s = useStore.getState();
    s.addMember("You");
    s.addMember("Wingman");
    s.addMember("Hauler");
    s.startSession();
    return restore;
  },
  steps: [
    { anchor: "mining.newSession", titleKey: "tour.mining.new.title", bodyKey: "tour.mining.new.body" },
    { anchor: "mining.session", titleKey: "tour.mining.loot.title", bodyKey: "tour.mining.loot.body" },
    { anchor: "mining.session", titleKey: "tour.mining.split.title", bodyKey: "tour.mining.split.body" },
  ],
};

registerMessages({
  fr: {
    "tour.mining.new.title": "1. Nouvelle session",
    "tour.mining.new.body": "Crée une session de minage : nom, type de gisement. Ajoute les membres de ta flotte dans l'onglet Membres (un exemple est déjà créé).",
    "tour.mining.loot.title": "2. Butin valorisé",
    "tour.mining.loot.body": "Dans la session active, saisis le butin ou importe les Diffusions de flotte : tout est valorisé au prix Jita (minerai brut ou compressé).",
    "tour.mining.split.title": "3. Partage équitable",
    "tour.mining.split.body": "À la clôture, l'ISK est répartie équitablement entre les participants (au prorata de présence ou du minerai), avec un % de rachat corpo réglable.",
  },
  en: {
    "tour.mining.new.title": "1. New session",
    "tour.mining.new.body": "Create a mining session: name, belt type. Add your fleet members in the Members tab (a sample is already created).",
    "tour.mining.loot.title": "2. Valued loot",
    "tour.mining.loot.body": "In the active session, enter loot or import Fleet Broadcasts: everything is valued at Jita prices (raw or compressed ore).",
    "tour.mining.split.title": "3. Fair split",
    "tour.mining.split.body": "On close, ISK is split fairly between participants (by presence or by ore), with an adjustable corp buyback %.",
  },
});
