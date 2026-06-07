import { describe, expect, it } from "vitest";
import { ledgerTotals, shoppingList, type LedgerEntry } from "./store";

function entry(p: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: "x", createdAt: 0, outputTypeId: 1, outputName: "X", runs: 1, unitsProduced: 1,
    totalCost: 0, unitCost: 0, expectedUnitSell: 0, expectedProfit: 0, feeRate: 0,
    status: "planned", ...p,
  };
}

describe("shoppingList", () => {
  it("agrège les matériaux des jobs ouverts et fusionne par type", () => {
    const entries: LedgerEntry[] = [
      entry({ id: "a", materials: [{ typeId: 34, name: "Tritanium", qty: 1000 }, { typeId: 35, name: "Pyerite", qty: 200 }] }),
      entry({ id: "b", materials: [{ typeId: 34, name: "Tritanium", qty: 500 }] }),
      entry({ id: "c", status: "done", materials: [{ typeId: 34, name: "Tritanium", qty: 999 }] }), // ignoré (vendu)
    ];
    const list = shoppingList(entries);
    expect(list.jobCount).toBe(2);
    const trit = list.lines.find((l) => l.typeId === 34)!;
    expect(trit.qty).toBe(1500); // a+b, c exclu
    expect(list.lines[0].typeId).toBe(34); // trié par quantité desc
    expect(list.multibuy).toContain("Tritanium\t1500");
  });
});

describe("ledgerTotals", () => {
  it("sépare en-production / réalisé", () => {
    const t = ledgerTotals([
      entry({ status: "planned", totalCost: 1000, expectedProfit: 300 }),
      entry({ status: "done", realizedProfit: 250 }),
    ]);
    expect(t.inProductionCost).toBe(1000);
    expect(t.expectedProfit).toBe(300);
    expect(t.realizedProfit).toBe(250);
    expect(t.openCount).toBe(1);
    expect(t.doneCount).toBe(1);
  });
});
