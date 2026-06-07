import { describe, expect, it } from "vitest";
import { fifoCostBasis, type WalletTx } from "./fifo";

describe("fifoCostBasis", () => {
  it("calcule le profit réalisé FIFO et la base restante", () => {
    const txns: WalletTx[] = [
      { date: "2026-06-01", typeId: 34, quantity: 100, unitPrice: 10, isBuy: true },
      { date: "2026-06-02", typeId: 34, quantity: 100, unitPrice: 12, isBuy: true },
      { date: "2026-06-03", typeId: 34, quantity: 150, unitPrice: 15, isBuy: false },
    ];
    const cb = fifoCostBasis(txns).get(34)!;
    expect(cb.soldQty).toBe(150);
    expect(cb.realizedProfit).toBe(650); // 2250 - (100*10 + 50*12)
    expect(cb.remainingQty).toBe(50);
    expect(cb.remainingCost).toBe(600);
    expect(cb.avgCost).toBe(12);
  });

  it("une vente sans stock suffisant ne consomme que le disponible", () => {
    const cb = fifoCostBasis([
      { date: "a", typeId: 1, quantity: 10, unitPrice: 5, isBuy: true },
      { date: "b", typeId: 1, quantity: 30, unitPrice: 8, isBuy: false },
    ]).get(1)!;
    expect(cb.soldQty).toBe(10);
    expect(cb.realizedProfit).toBe(30); // 10*8 - 10*5
    expect(cb.remainingQty).toBe(0);
  });
});
