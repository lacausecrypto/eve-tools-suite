import { describe, expect, it } from "vitest";
import { brokerFeeFromSkill, salesTaxFromSkill } from "./fees";

describe("frais skill-aware", () => {
  it("courtage : 3 % − 0,3 %/niveau, plancher 1 %", () => {
    expect(brokerFeeFromSkill(0)).toBeCloseTo(0.03, 9);
    expect(brokerFeeFromSkill(5)).toBeCloseTo(0.015, 9);
    expect(brokerFeeFromSkill(99)).toBeCloseTo(0.015, 9); // clampé à 5
  });
  it("taxe de vente : 7,5 % réduit de 11 %/niveau", () => {
    expect(salesTaxFromSkill(0)).toBeCloseTo(0.075, 9);
    expect(salesTaxFromSkill(5)).toBeCloseTo(0.075 * 0.45, 9);
  });
});
