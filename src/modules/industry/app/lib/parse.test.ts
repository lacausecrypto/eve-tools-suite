import { describe, expect, it } from "vitest";
import { parseQtyList } from "./parse";

describe("parseQtyList", () => {
  it("parse tabulé/espaces/milliers et fusionne les doublons", () => {
    const r = parseQtyList(
      `Tritanium\t1,000\tMineral\nPyerite  200\nMexallon 1 500\nDamage Control II\nTritanium\t500`,
    );
    const by = Object.fromEntries(r.map((x) => [x.name, x.qty]));
    expect(by["Tritanium"]).toBe(1500); // 1000 + 500 fusionnés
    expect(by["Pyerite"]).toBe(200);
    expect(by["Mexallon"]).toBe(1500); // « 1 500 »
    expect(by["Damage Control II"]).toBe(1); // « II » n'est pas une quantité
    expect(r.length).toBe(4);
  });
});
