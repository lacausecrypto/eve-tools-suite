import { describe, expect, it } from "vitest";
import { bestPrice, effectivePrice, type Order } from "./index";

describe("effectivePrice (VWAP)", () => {
  const book: Order[] = [
    { price: 10, volume: 100 },
    { price: 12, volume: 100 },
    { price: 15, volume: 100 },
  ];
  it("mange le carnet et pondère par volume", () => {
    expect(effectivePrice(book, 100)).toBe(10);
    // 100@10 + 50@12 = (1000+600)/150 = 10.6667
    expect(effectivePrice(book, 150)).toBeCloseTo(1600 / 150, 9);
  });
  it("VWAP du disponible si le carnet ne couvre pas tout", () => {
    expect(effectivePrice(book, 1000)).toBeCloseTo((1000 + 1200 + 1500) / 300, 9);
  });
  it("0 si carnet vide ; meilleur ordre si qty<=0", () => {
    expect(effectivePrice([], 50)).toBe(0);
    expect(effectivePrice(book, 0)).toBe(10);
  });
});

describe("bestPrice", () => {
  it("renvoie le premier ordre, 0 si vide", () => {
    expect(bestPrice([{ price: 7, volume: 1 }])).toBe(7);
    expect(bestPrice([])).toBe(0);
  });
});
