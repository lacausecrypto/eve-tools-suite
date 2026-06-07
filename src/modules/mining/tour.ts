import { registerMessages } from "@/core/i18n";
import { snapshot } from "@/core/tour/demo";
import type { ModuleTour } from "@/core/tour/types";
import { useStore } from "./app/store/useStore";

/** Visite guidée du Mining Fleet Manager (membres + session d'exemple). */
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
    { anchor: "mining.root", titleKey: "tour.mining.s1.title", bodyKey: "tour.mining.s1.body" },
    { anchor: "mining.root", titleKey: "tour.mining.s2.title", bodyKey: "tour.mining.s2.body" },
    { anchor: "mining.root", titleKey: "tour.mining.s3.title", bodyKey: "tour.mining.s3.body" },
  ],
};

registerMessages({
  fr: {
    "tour.mining.s1.title": "Flotte de minage",
    "tour.mining.s1.body": "Ajoute les membres de ta flotte (un exemple est créé) et démarre une session : qui mine, où, pendant combien de temps.",
    "tour.mining.s2.title": "Valeur extraite",
    "tour.mining.s2.body": "Importe les diffusions de flotte ou saisis le butin : l'outil le valorise au prix Jita (brut ou compressé).",
    "tour.mining.s3.title": "Partage équitable",
    "tour.mining.s3.body": "À la clôture, l'ISK est répartie équitablement entre les participants — avec un pourcentage de rachat corpo réglable.",
  },
  en: {
    "tour.mining.s1.title": "Mining fleet",
    "tour.mining.s1.body": "Add your fleet members (a sample is created) and start a session: who mines, where, for how long.",
    "tour.mining.s2.title": "Extracted value",
    "tour.mining.s2.body": "Import fleet broadcasts or enter the loot: the tool values it at Jita prices (raw or compressed).",
    "tour.mining.s3.title": "Fair split",
    "tour.mining.s3.body": "On close, ISK is split fairly between participants — with an adjustable corp buyback percentage.",
  },
});
