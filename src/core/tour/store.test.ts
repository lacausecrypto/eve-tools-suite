import { describe, it, expect, beforeEach } from "vitest";
import { useTour } from "./store";
import { useSettings } from "@/core/settings";
import type { ModuleTour } from "./types";

function tour(id: string, n: number, demo?: ModuleTour["demo"]): ModuleTour {
  return {
    id,
    demo,
    steps: Array.from({ length: n }, (_, i) => ({ titleKey: `t${i}`, bodyKey: `b${i}` })),
  };
}

describe("tour store", () => {
  beforeEach(() => {
    useTour.setState({ tour: null, index: 0, restore: undefined });
    useSettings.setState({ seenTours: [] });
  });

  it("start places the tour at step 0", () => {
    useTour.getState().start(tour("x", 3));
    expect(useTour.getState().tour?.id).toBe("x");
    expect(useTour.getState().index).toBe(0);
  });

  it("next/prev navigate and prev clamps at 0", () => {
    useTour.getState().start(tour("x", 3));
    useTour.getState().next();
    expect(useTour.getState().index).toBe(1);
    useTour.getState().prev();
    useTour.getState().prev();
    expect(useTour.getState().index).toBe(0);
  });

  it("next past the last step ends the tour and marks it seen", () => {
    useTour.getState().start(tour("x", 2));
    useTour.getState().next(); // → last step
    useTour.getState().next(); // → end
    expect(useTour.getState().tour).toBeNull();
    expect(useSettings.getState().seenTours).toContain("x");
  });

  it("skip ends the tour and markTourSeen is idempotent", () => {
    useTour.getState().start(tour("x", 3));
    useTour.getState().skip();
    expect(useTour.getState().tour).toBeNull();
    expect(useSettings.getState().seenTours).toEqual(["x"]);
    useSettings.getState().markTourSeen("x");
    expect(useSettings.getState().seenTours).toEqual(["x"]);
  });

  it("calls the demo restore function on end", () => {
    let restored = false;
    useTour.getState().start(tour("x", 1, () => () => (restored = true)));
    useTour.getState().end();
    expect(restored).toBe(true);
  });

  it("resetTours clears seen tours and onboarding", () => {
    useSettings.setState({ seenTours: ["a", "b"], onboardingDone: true });
    useSettings.getState().resetTours();
    expect(useSettings.getState().seenTours).toEqual([]);
    expect(useSettings.getState().onboardingDone).toBe(false);
  });
});
