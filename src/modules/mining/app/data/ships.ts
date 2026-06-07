// Vaisseaux d'extraction / soutien minier d'EVE Online, groupés par classe.
// Sert au sélecteur de barge par membre dans une session.

export interface ShipGroup {
  /** Clé i18n stable du groupe (label rendu via t("mining.shipGroup." + key)). */
  key: string;
  group: string;
  ships: string[];
}

export const MINING_SHIPS: ShipGroup[] = [
  { key: "frigate", group: "Frégate de minage", ships: ["Venture", "Prospect", "Endurance"] },
  { key: "barge", group: "Barge d'extraction", ships: ["Procurer", "Retriever", "Covetor"] },
  { key: "exhumer", group: "Exhumer", ships: ["Skiff", "Mackinaw", "Hulk"] },
  { key: "industrialCommand", group: "Commandement industriel", ships: ["Porpoise", "Orca"] },
  { key: "capital", group: "Capital", ships: ["Rorqual"] },
  { key: "other", group: "Autre", ships: ["Autre vaisseau"] },
];

export const ALL_SHIPS: string[] = MINING_SHIPS.flatMap((g) => g.ships);

/** Classe d'un vaisseau (pour l'affichage / le rapport). */
export function shipClass(ship: string): string {
  return (
    MINING_SHIPS.find((g) => g.ships.includes(ship))?.group ?? "—"
  );
}
