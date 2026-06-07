/**
 * Minéraux d'EVE Online (type_id du SDE `invTypes`) — données canoniques et
 * stables. Servent de raccourci pour composer une recette et font le lien avec
 * le module Mining (qui produit ces minéraux par retraitement de minerai).
 */
export interface Mineral {
  typeId: number;
  name: string;
}

export const MINERALS: Mineral[] = [
  { typeId: 34, name: "Tritanium" },
  { typeId: 35, name: "Pyerite" },
  { typeId: 36, name: "Mexallon" },
  { typeId: 37, name: "Isogen" },
  { typeId: 38, name: "Nocxium" },
  { typeId: 39, name: "Zydrine" },
  { typeId: 40, name: "Megacyte" },
  { typeId: 11399, name: "Morphite" },
];
