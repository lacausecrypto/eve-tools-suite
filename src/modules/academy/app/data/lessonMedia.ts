import type { Block } from "../lib/types";

/**
 * Illustrations par leçon — **images officielles** du serveur CCP
 * (images.evetech.net) par `type_id`, donc représentatives, libres de hotlink et
 * cohérentes avec l'attribution CCP. Rendus pour les vaisseaux/structures, icônes
 * pour les modules/charges/minerais (les modules n'ont pas de rendu 3D).
 * Tous les `type_id` ont été vérifiés via l'ESI, et la disponibilité des images
 * confirmée (HTTP 200) sur le CDN.
 */
export const LESSON_MEDIA: Record<string, Block[]> = {
  // ── Premiers pas ──
  capsule: [
    { t: "img", typeId: 670, variant: "icon", caption: "La capsule (pod) — ton clone pilote." },
  ],
  competences: [
    { t: "img", typeId: 40520, variant: "icon", caption: "Injecteur de compétences (convertit SP en ISK et inversement)." },
  ],
  navigation: [
    {
      t: "gallery",
      caption: "Les deux modules de propulsion.",
      items: [
        { typeId: 12058, label: "Afterburner" },
        { typeId: 12076, label: "Microwarpdrive" },
      ],
    },
  ],
  securite: [
    { t: "img", typeId: 16240, variant: "render", caption: "Le Catalyst, destroyer de ganking courant en high-sec." },
  ],
  fitting: [
    {
      t: "gallery",
      caption: "Un module typique par emplacement.",
      items: [
        { typeId: 2913, label: "Haut : tourelle" },
        { typeId: 3841, label: "Médian : extender" },
        { typeId: 2048, label: "Bas : Damage Control" },
      ],
    },
  ],

  // ── Combat & survie ──
  "degats-resists": [
    { t: "img", typeId: 2048, variant: "icon", caption: "Le Damage Control renforce les résistances des trois couches." },
  ],
  tank: [
    {
      t: "gallery",
      caption: "Tank bouclier (mid), armure (low), réparation active.",
      items: [
        { typeId: 3841, label: "Shield Extender" },
        { typeId: 20353, label: "Steel Plates" },
        { typeId: 3540, label: "Armor Repairer" },
      ],
    },
  ],
  tackle: [
    {
      t: "gallery",
      caption: "Les trois modules de tackle.",
      items: [
        { typeId: 3244, label: "Disruptor (point)" },
        { typeId: 448, label: "Scrambler (scram)" },
        { typeId: 527, label: "Webifier (web)" },
      ],
    },
  ],
  portee: [
    {
      t: "gallery",
      caption: "Tourelle (tracking) vs lanceur de missiles (sig/vélocité).",
      items: [
        { typeId: 2913, label: "AutoCannon" },
        { typeId: 2404, label: "Missile Launcher" },
      ],
    },
  ],
  ewar: [
    { t: "img", typeId: 12267, variant: "icon", caption: "Energy Neutralizer — vide le capacitor ennemi." },
  ],
  desengager: [
    { t: "img", typeId: 30486, variant: "icon", caption: "Sonde de combat : en voir au d-scan = on te cherche." },
  ],

  // ── Économie & métiers ──
  marche: [
    { t: "img", typeId: 44992, variant: "icon", caption: "Le PLEX — bien premium, marché global spécial." },
  ],
  minage: [
    {
      t: "gallery",
      caption: "De la frégate de minage au minerai puis au minéral.",
      items: [
        { typeId: 32880, label: "Venture", variant: "render" },
        { typeId: 1230, label: "Veldspar" },
        { typeId: 34, label: "Tritanium" },
      ],
    },
  ],
  industrie: [
    {
      t: "gallery",
      caption: "Minéraux en entrée → coque en sortie.",
      items: [
        { typeId: 34, label: "Tritanium" },
        { typeId: 587, label: "Rifter", variant: "render" },
      ],
    },
  ],
  exploration: [
    {
      t: "gallery",
      caption: "Lanceur et sondes pour scanner les signatures.",
      items: [
        { typeId: 17938, label: "Probe Launcher" },
        { typeId: 30486, label: "Scanner Probe" },
      ],
    },
  ],
  pi: [
    { t: "img", typeId: 9848, variant: "icon", caption: "Robotics — un produit PI de palier P2." },
  ],

  // ── Espace & communauté ──
  structures: [
    { t: "img", typeId: 35832, variant: "render", caption: "Astrahus — citadelle joueur (dock, marché, industrie)." },
  ],
  logistique: [
    {
      t: "gallery",
      caption: "Gros volume sans défense vs passe-blocus furtif.",
      items: [
        { typeId: 20185, label: "Charon (freighter)", variant: "render" },
        { typeId: 12735, label: "Prowler (BR)", variant: "render" },
      ],
    },
  ],

  // ── Compétences & clones ──
  implants: [
    {
      t: "gallery",
      caption: "Bonus permanents (implants) vs temporaires (boosters).",
      items: [
        { typeId: 10216, label: "Implant" },
        { typeId: 9950, label: "Booster" },
      ],
    },
  ],
  "sp-trading": [
    { t: "img", typeId: 40520, variant: "icon", caption: "Skill Injector : du temps d'entraînement… contre de l'ISK." },
  ],

  // ── Revenus & PvE ──
  missions: [
    { t: "img", typeId: 641, variant: "render", caption: "Le Megathron, battleship classique pour les missions L4." },
  ],
  ratting: [
    { t: "img", typeId: 12005, variant: "render", caption: "L'Ishtar, croiseur à drones prisé pour le ratting." },
  ],
  abyssal: [
    { t: "img", typeId: 17715, variant: "render", caption: "Le Gila, roi de l'Abyssal Deadspace en solo." },
  ],
  incursions: [
    { t: "img", typeId: 17736, variant: "render", caption: "Le Nightmare, battleship faction courant en incursion." },
  ],
  "faction-warfare": [
    { t: "img", typeId: 17841, variant: "render", caption: "Federation Navy Comet — frégate faction reine de la FW." },
  ],

  // ── Vaisseaux & doctrines ──
  classes: [
    {
      t: "gallery",
      caption: "Trois tailles de sub-capitaux.",
      items: [
        { typeId: 603, label: "Frégate (Merlin)", variant: "render" },
        { typeId: 621, label: "Croiseur (Caracal)", variant: "render" },
        { typeId: 641, label: "Battleship (Megathron)", variant: "render" },
      ],
    },
  ],
  tech: [
    {
      t: "gallery",
      caption: "T1 → T2 → T3 (croiseur stratégique).",
      items: [
        { typeId: 597, label: "T1 (Punisher)", variant: "render" },
        { typeId: 12005, label: "T2 (Ishtar)", variant: "render" },
        { typeId: 29990, label: "T3 (Loki)", variant: "render" },
      ],
    },
  ],
  roles: [
    {
      t: "gallery",
      caption: "Interdiction · logistique · EWAR (recon).",
      items: [
        { typeId: 22456, label: "Sabre (DIC)", variant: "render" },
        { typeId: 11987, label: "Guardian (logi)", variant: "render" },
        { typeId: 11957, label: "Falcon (recon)", variant: "render" },
      ],
    },
  ],
  capitaux: [
    {
      t: "gallery",
      caption: "Dreadnought · carrier · capital minier.",
      items: [
        { typeId: 19722, label: "Naglfar (dread)", variant: "render" },
        { typeId: 23757, label: "Archon (carrier)", variant: "render" },
        { typeId: 28352, label: "Rorqual (minier)", variant: "render" },
      ],
    },
  ],
  choisir: [
    {
      t: "gallery",
      caption: "La coque suit l'objectif.",
      items: [
        { typeId: 33468, label: "Astero (explo)", variant: "render" },
        { typeId: 626, label: "Vexor (PvE)", variant: "render" },
        { typeId: 593, label: "Tristan (PvP)", variant: "render" },
      ],
    },
  ],

  // ── Interface & confort ──
  "dscan-probe": [
    { t: "img", typeId: 30486, variant: "icon", caption: "Sonde de combat : à repérer (et à utiliser) au scanner." },
  ],
};
