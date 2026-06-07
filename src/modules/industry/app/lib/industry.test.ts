import { describe, expect, it } from "vitest";
import {
  buildTimeSeconds,
  computeCost,
  effectiveMe,
  estimatedItemValue,
  jobInstallCost,
  requiredQuantity,
  type CostInputs,
  type Recipe,
} from "./industry";

const INPUTS: CostInputs = {
  systemCostIndex: 0.05,
  facilityTax: 0.01,
  sccSurcharge: 0.015,
  materialBasis: "buy",
  productBasis: "sell",
  salesTax: 0.036,
  brokerFee: 0.03,
};

const PRICES = {
  1: { buy: 5, sell: 6, adjusted: 4 },
  2: { buy: 1000, sell: 1100, adjusted: 900 },
  999: { buy: 1800, sell: 2000, adjusted: 1500 },
};

describe("requiredQuantity (ME, arrondi EVE)", () => {
  it("applique le ME et le plancher = runs", () => {
    expect(requiredQuantity(100, 10, 10, 0)).toBe(900);
    expect(requiredQuantity(1, 10, 10, 0)).toBe(10); // plancher = runs
    expect(requiredQuantity(100, 1, 0, 0)).toBe(100);
  });
  it("arrondit (round 2 puis ceil) avec bonus structure", () => {
    expect(requiredQuantity(86, 1, 10, 0.021)).toBe(76); // 86*0.9*0.979=75.78→76
    expect(requiredQuantity(5, 3, 10, 0)).toBe(14); // 5*3*0.9=13.5→14
  });
});

describe("activité & temps", () => {
  it("ignore le ME pour les réactions", () => {
    const reac: Recipe = {
      outputTypeId: 16, outputName: "X", outputPerRun: 1, runs: 1, me: 10,
      facilityMaterialBonus: 0, materials: [{ typeId: 1, name: "A", baseQty: 100 }],
      activity: "reaction",
    };
    expect(effectiveMe(reac)).toBe(0);
    expect(computeCost(reac, PRICES, INPUTS).lines[0].quantity).toBe(100);
  });
  it("calcule le temps de build avec TE + bonus structure", () => {
    const man: Recipe = {
      outputTypeId: 16, outputName: "X", outputPerRun: 1, runs: 10, me: 0,
      facilityMaterialBonus: 0, materials: [{ typeId: 1, name: "A", baseQty: 100 }],
      activity: "manufacturing", te: 20, baseTimePerRun: 600, facilityTimeBonus: 0.25,
    };
    expect(buildTimeSeconds(man)).toBe(3600); // 600*10*0.8*0.75
    const r = computeCost(man, PRICES, INPUTS);
    expect(r.timeSeconds).toBe(3600);
    expect(r.unitsPerHour).toBeCloseTo(10, 6);
  });
});

describe("computeCost (coût complet)", () => {
  const recipe: Recipe = {
    outputTypeId: 999, outputName: "Widget", outputPerRun: 1, runs: 10, me: 10,
    facilityMaterialBonus: 0,
    materials: [{ typeId: 1, name: "A", baseQty: 100 }, { typeId: 2, name: "B", baseQty: 1 }],
  };

  it("EIV = Σ base × adjusted × runs", () => {
    expect(estimatedItemValue(recipe, PRICES)).toBe(13000);
  });
  it("install = EIV × (index + taxe + SCC)", () => {
    expect(jobInstallCost(13000, INPUTS)).toBeCloseTo(975, 6);
  });
  it("coût, profit, ROI et marge", () => {
    const r = computeCost(recipe, PRICES, INPUTS);
    expect(r.materialCost).toBe(14500);
    expect(r.totalCost).toBeCloseTo(15475, 6);
    expect(r.unitCost).toBeCloseTo(1547.5, 6);
    expect(r.netRevenue).toBeCloseTo(18680, 6);
    expect(r.profit).toBeCloseTo(3205, 6);
    expect(r.roiPct).toBeCloseTo(20.7108, 3);
    expect(r.marginPct).toBeCloseTo(17.1574, 3);
    expect(r.hasMissingPrices).toBe(false);
  });
  it("signale les prix manquants", () => {
    expect(computeCost(recipe, { 1: PRICES[1] }, INPUTS).hasMissingPrices).toBe(true);
  });
});
