/**
 * Catalogue de navigation du marché. Plutôt que d'embarquer le SDE complet ou de
 * crawler les ~2400 groupes ESI au démarrage, on organise un arbre **curé** des
 * objets les plus échangés par leur **nom canonique EVE** ; les `type_id` sont
 * résolus à la volée via `POST /universe/ids/` (exact, caché) — donc aucun
 * « nombre magique » d'id à maintenir, et le moteur de recherche couvre le reste.
 */

export interface CatalogGroup {
  /** Libellé du groupe (ex. « Exhumers »). */
  name: string;
  /** Noms d'objets EVE exacts (résolus en type_id à l'exécution). */
  items: string[];
}

export interface CatalogCategory {
  name: string;
  groups: CatalogGroup[];
}

export const CATALOG: CatalogCategory[] = [
  {
    name: "Vaisseaux miniers",
    groups: [
      { name: "Mining Frigates", items: ["Venture", "Prospect", "Endurance"] },
      { name: "Mining Barges", items: ["Procurer", "Retriever", "Covetor"] },
      { name: "Exhumers", items: ["Skiff", "Mackinaw", "Hulk"] },
      { name: "Industrial Command", items: ["Porpoise", "Orca", "Rorqual"] },
    ],
  },
  {
    name: "Vaisseaux de combat",
    groups: [
      {
        name: "Frigates",
        items: ["Rifter", "Merlin", "Punisher", "Incursus", "Tristan", "Kestrel"],
      },
      {
        name: "Assault Frigates",
        items: ["Wolf", "Jaguar", "Harpy", "Hawk", "Enyo", "Retribution"],
      },
      {
        name: "Destroyers",
        items: ["Catalyst", "Cormorant", "Thrasher", "Coercer"],
      },
      {
        name: "Cruisers",
        items: ["Caracal", "Vexor", "Stabber", "Omen", "Thorax", "Rupture", "Moa", "Maller"],
      },
      {
        name: "Heavy Assault Cruisers",
        items: ["Cerberus", "Ishtar", "Muninn", "Zealot", "Eagle", "Deimos"],
      },
      {
        name: "Battlecruisers",
        items: ["Drake", "Hurricane", "Harbinger", "Myrmidon", "Ferox", "Brutix"],
      },
      {
        name: "Battleships",
        items: ["Raven", "Megathron", "Tempest", "Apocalypse", "Dominix", "Maelstrom", "Abaddon", "Rokh"],
      },
      {
        name: "Marauders",
        items: ["Golem", "Kronos", "Vargur", "Paladin"],
      },
    ],
  },
  {
    name: "Logistique",
    groups: [
      {
        name: "Industrials",
        items: ["Iteron Mark V", "Badger", "Bestower", "Wreathe", "Epithal"],
      },
      {
        name: "Deep Space Transports",
        items: ["Occator", "Mastodon", "Impel", "Bustard"],
      },
      {
        name: "Blockade Runners",
        items: ["Viator", "Prowler", "Crane", "Prorator"],
      },
      {
        name: "Freighters",
        items: ["Charon", "Obelisk", "Fenrir", "Providence"],
      },
      {
        name: "Jump Freighters",
        items: ["Anshar", "Ark", "Nomad", "Rhea"],
      },
    ],
  },
  {
    name: "Minerais & minéraux",
    groups: [
      {
        name: "Minéraux",
        items: ["Tritanium", "Pyerite", "Mexallon", "Isogen", "Nocxium", "Zydrine", "Megacyte", "Morphite"],
      },
      {
        name: "Minerais courants",
        items: ["Veldspar", "Scordite", "Pyroxeres", "Plagioclase", "Omber", "Kernite"],
      },
      {
        name: "Minerais profonds",
        items: ["Jaspet", "Hemorphite", "Hedbergite", "Gneiss", "Dark Ochre", "Spodumain"],
      },
      {
        name: "Minerais nullsec",
        items: ["Crokite", "Bistot", "Arkonor", "Mercoxit"],
      },
    ],
  },
  {
    name: "Glace & carburant",
    groups: [
      {
        name: "Glace",
        items: ["Clear Icicle", "White Glaze", "Glacial Mass", "Blue Ice", "Glare Crust", "Dark Glitter"],
      },
      {
        name: "Produits de glace",
        items: ["Heavy Water", "Liquid Ozone", "Strontium Clathrates"],
      },
      {
        name: "Isotopes",
        items: ["Helium Isotopes", "Hydrogen Isotopes", "Nitrogen Isotopes", "Oxygen Isotopes"],
      },
    ],
  },
  {
    name: "Munitions & charges",
    groups: [
      {
        name: "Charges hybrides",
        items: ["Antimatter Charge S", "Antimatter Charge M", "Antimatter Charge L"],
      },
      {
        name: "Munitions projectiles",
        items: ["Fusion S", "Fusion M", "Fusion L", "EMP S", "EMP M", "EMP L"],
      },
      {
        name: "Cristaux de fréquence",
        items: ["Multifrequency S", "Multifrequency M", "Multifrequency L"],
      },
      {
        name: "Missiles légers",
        items: ["Scourge Light Missile", "Inferno Light Missile", "Nova Light Missile", "Mjolnir Light Missile"],
      },
    ],
  },
  {
    name: "Drones",
    groups: [
      {
        name: "Drones de combat",
        items: ["Hobgoblin I", "Hammerhead I", "Ogre I", "Warrior I", "Valkyrie I", "Vespa I"],
      },
      {
        name: "Drones Sentry / lourds",
        items: ["Acolyte I", "Infiltrator I", "Praetor I"],
      },
    ],
  },
  {
    name: "Modules populaires",
    groups: [
      {
        name: "Défense",
        items: ["Damage Control II", "Large Shield Extender II", "1600mm Steel Plates II"],
      },
      {
        name: "Propulsion & tackle",
        items: ["10MN Afterburner II", "Warp Scrambler II", "Warp Disruptor II", "Stasis Webifier II"],
      },
    ],
  },
  {
    name: "Special & consommables",
    groups: [
      {
        name: "Comptes & SP",
        items: ["PLEX", "Large Skill Injector", "Small Skill Injector", "Skill Extractor"],
      },
    ],
  },
];

/** Tous les noms du catalogue, dédupliqués (index de recherche local). */
export const CATALOG_NAMES: string[] = [
  ...new Set(CATALOG.flatMap((c) => c.groups.flatMap((g) => g.items))),
];
