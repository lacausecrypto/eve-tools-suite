import type { Deck } from "../lib/types";

/** Paquets de flashcards — répétition espacée (Leitner) sur les fondamentaux. */
export const DECKS: Deck[] = [
  {
    id: "damage",
    title: "Dégâts & trous de résistance",
    description: "Quel type frappe quoi.",
    cards: [
      { id: "dmg-shield", front: "Trou de résistance d'un tank BOUCLIER ?", back: "EM (0 % de résistance de base)." },
      { id: "dmg-armor", front: "Trou de résistance d'un tank ARMURE ?", back: "Explosif (10 % de base)." },
      { id: "dmg-types", front: "Les 4 types de dégâts ?", back: "EM, Thermique, Cinétique, Explosif." },
      { id: "dmg-vs-shield", front: "Munition idéale contre un bouclier ?", back: "EM / Thermique." },
      { id: "dmg-vs-armor", front: "Munition idéale contre l'armure ?", back: "Explosif / Cinétique." },
    ],
  },
  {
    id: "sensors",
    title: "Senseurs par race",
    description: "Pour le brouillage (ECM).",
    cards: [
      { id: "sen-cal", front: "Senseur des vaisseaux Caldari ?", back: "Gravimetric." },
      { id: "sen-gal", front: "Senseur des vaisseaux Gallente ?", back: "Magnetometric." },
      { id: "sen-min", front: "Senseur des vaisseaux Minmatar ?", back: "Ladar." },
      { id: "sen-amarr", front: "Senseur des vaisseaux Amarr ?", back: "Radar." },
    ],
  },
  {
    id: "weapons",
    title: "Armes par race",
    description: "Système d'arme dominant.",
    cards: [
      { id: "wp-amarr", front: "Arme dominante Amarr ?", back: "Énergie (lasers) — dégâts EM/Thermique." },
      { id: "wp-min", front: "Arme dominante Minmatar ?", back: "Projectiles (autocannons/artillerie) — tous types." },
      { id: "wp-gal", front: "Arme dominante Gallente ?", back: "Hybrides (blasters/rails) + drones." },
      { id: "wp-cal", front: "Arme dominante Caldari ?", back: "Missiles + hybrides (railguns)." },
    ],
  },
  {
    id: "tackle",
    title: "Tackle & propulsion",
    description: "Retenir et fuir.",
    cards: [
      { id: "tk-point", front: "Portée et effet du Warp Disruptor (point) ?", back: "~20-24 km, 1 point, empêche le warp." },
      { id: "tk-scram", front: "Portée et effet du Warp Scrambler (scram) ?", back: "~7,5 km, 2 points, empêche le warp ET coupe le MWD." },
      { id: "tk-web", front: "Effet d'un Stasis Webifier ?", back: "Réduit fortement la vitesse de la cible." },
      { id: "tk-warp", front: "À quelle vitesse entres-tu en warp ?", back: "75 % de ta vitesse max, une fois aligné." },
    ],
  },
  {
    id: "space",
    title: "Espace & sécurité",
    description: "Où, et à quel risque.",
    cards: [
      { id: "sp-hs", front: "Statut d'un système high-sec ?", back: "0.5 à 1.0 — CONCORD venge les agressions." },
      { id: "sp-ls", front: "Statut d'un système low-sec ?", back: "0.1 à 0.4 — pas de CONCORD, gardes de portes seulement." },
      { id: "sp-ns", front: "Statut d'un système null-sec ?", back: "0.0 et moins — aucune loi, souveraineté." },
      { id: "sp-wh", front: "Particularité d'un wormhole ?", back: "Pas de Local peuplé : le d-scan est ta seule alerte." },
    ],
  },
];

/** Toutes les cartes, à plat. */
export const ALL_CARDS = DECKS.flatMap((d) => d.cards);
