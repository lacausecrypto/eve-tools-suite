import { describe, expect, it } from "vitest";
import { buildCostTree, countBuilt, type TreeDeps } from "./buildtree";
import type { ResolvedBlueprint } from "./blueprint";

const BP: Record<string, ResolvedBlueprint> = {
  widget: {
    activity: "manufacturing", outputTypeId: 1, outputName: "Widget", outputPerRun: 1,
    baseTimePerRun: 0, materials: [{ typeId: 2, name: "CompA", baseQty: 1 }],
  },
  compa: {
    activity: "manufacturing", outputTypeId: 2, outputName: "CompA", outputPerRun: 1,
    baseTimePerRun: 0, materials: [{ typeId: 3, name: "Tritanium", baseQty: 100 }],
  },
};
const PROD: Record<string, { typeId: number; name: string }> = {
  widget: { typeId: 1, name: "Widget" },
  compa: { typeId: 2, name: "CompA" },
  tritanium: { typeId: 3, name: "Tritanium" },
};

function deps(buy: Record<number, number>): TreeDeps {
  return {
    resolveProduct: async (n) => PROD[n.toLowerCase()] ?? null,
    getBlueprint: async (n) => BP[n.toLowerCase()] ?? null,
    buyUnitPrice: (id) => buy[id] ?? 0,
    installRate: 0.1, me: 0, facilityMaterialBonus: 0, maxDepth: 5, maxNodes: 100,
  };
}

describe("buildCostTree (build-vs-buy)", () => {
  it("fabrique récursivement quand c'est moins cher", async () => {
    const root = await buildCostTree("Widget", 1, deps({ 1: 1000, 2: 600, 3: 4 }));
    expect(root.mode).toBe("build");
    expect(root.unitCost).toBe(500); // (440 + 0.1*600)/1
    const compA = root.children![0];
    expect(compA.mode).toBe("build");
    expect(compA.unitCost).toBe(440); // 400 + 0.1*400
    expect(compA.savedByBuilding).toBe(160);
    const trit = compA.children![0];
    expect(trit.mode).toBe("buy");
    expect(trit.totalCost).toBe(400);
    expect(countBuilt(root)).toBe(2);
  });

  it("achète un composant si c'est moins cher que le fabriquer", async () => {
    const root = await buildCostTree("Widget", 1, deps({ 1: 1000, 2: 300, 3: 4 }));
    expect(root.children![0].mode).toBe("buy"); // 300 < 440
  });
});
