import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const mem = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, String(v)),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
      key: (i: number) => [...mem.keys()][i] ?? null,
      get length() { return mem.size; },
    } as Storage;
  }
});

import { sanitizeEventProps, analyticsConfigured, track, setConsent } from "@/core/analytics";
import { useSettings } from "@/core/settings";

describe("analytics — allowlist stricte", () => {
  it("conserve uniquement les enums autorisés", () => {
    expect(sanitizeEventProps({
      tool: "mining", platform: "desktop", runtime: "web", source: "launcher",
      success: true, count: 3,
    })).toEqual({
      tool: "mining", platform: "desktop", runtime: "web", source: "launcher",
      success: true, count: 3,
    });
  });

  it("accepte les identifiants réels des modules", () => {
    const modules = ["mining", "pirate", "pi", "loss", "skills", "industry", "market", "trade", "atelier", "activity", "abyssal", "appraisal", "lp", "refine", "academy"];
    for (const tool of modules) {
      expect(sanitizeEventProps({ tool })).toEqual({ tool });
    }
    expect(sanitizeEventProps({ language: "fr" })).toEqual({ language: "fr" });
    expect(sanitizeEventProps({ language: "fr-FR" })).toEqual({});
  });

  it("rejette les contenus collés même si la clé paraît anodine", () => {
    const pasted = "Rifter; 125mm Gatling AutoCannon; fit data";
    expect(sanitizeEventProps({
      payload: pasted,
      input: pasted,
      tool: pasted,
      notes: "Jita market prices",
      arbitrary: "short text",
    })).toEqual({});
  });

  it("rejette les valeurs d'enum inconnues et les compteurs invalides", () => {
    expect(sanitizeEventProps({
      tool: "a player-pasted fit",
      platform: "my machine name",
      count: -1,
      duration_ms: Infinity,
      success: "yes",
    })).toEqual({});
  });

  it("n'accepte pas de propriétés URL libres", () => {
    expect(sanitizeEventProps({
      landing_path: "/#download",
      referrer: "social",
      $current_url: "https://example.com/?private=1",
      pasted_fit: "secret fit",
    })).toEqual({ landing_path: "/#download", referrer: "social" });
  });
});

describe("analytics — opt-in strict / configuration", () => {
  it("désactivée sans configuration (VITE_POSTHOG_* absents en test)", () => {
    expect(analyticsConfigured()).toBe(false);
  });

  it("track() est un no-op silencieux quand non démarré", () => {
    expect(() => track("tool_opened", { tool: "mining" })).not.toThrow();
  });

  it("setConsent persiste le choix dans les réglages", () => {
    setConsent("denied");
    expect(useSettings.getState().analyticsConsent).toBe("denied");
    setConsent("granted");
    expect(useSettings.getState().analyticsConsent).toBe("granted");
  });
});
