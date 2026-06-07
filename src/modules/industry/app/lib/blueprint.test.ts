import { describe, expect, it } from "vitest";
import { parseFuzzworkBlueprint } from "./blueprint";

describe("parseFuzzworkBlueprint", () => {
  const manJson = {
    blueprintTypeID: "681",
    activityMaterials: {
      "1": [{ typeid: "34", quantity: "32000" }, { typeid: "35", quantity: "6000" }],
      "8": [{ typeid: "20410", quantity: "2" }],
    },
    activityProducts: { "1": [{ typeid: "587", quantity: "1" }] },
    activityTimes: { "1": [{ time: "6000", activity: "1" }] },
  };

  it("parse la fabrication (valeurs string, temps en tableau)", () => {
    const m = parseFuzzworkBlueprint(manJson, 1)!;
    expect(m.productTypeId).toBe(587);
    expect(m.outputPerRun).toBe(1);
    expect(m.baseTimePerRun).toBe(6000);
    expect(m.materials).toEqual([
      { typeId: 34, baseQty: 32000 },
      { typeId: 35, baseQty: 6000 },
    ]);
  });

  it("renvoie null si l'activité n'a pas de matériaux", () => {
    expect(parseFuzzworkBlueprint(manJson, 11)).toBeNull();
  });

  it("parse une réaction (temps scalaire, clé typeID)", () => {
    const reac = {
      activityMaterials: { "11": [{ typeID: "16634", quantity: "100" }, { typeID: "16635", quantity: "100" }] },
      activityProducts: { "11": [{ typeID: "16640", quantity: "200" }] },
      activityTime: { "11": "10800" },
    };
    const r = parseFuzzworkBlueprint(reac, 11)!;
    expect(r.outputPerRun).toBe(200);
    expect(r.baseTimePerRun).toBe(10800);
    expect(r.materials.length).toBe(2);
  });
});
