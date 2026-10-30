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

import { activationForEvent, sanitizeEventProps, analyticsConfigured, track, setConsent } from "@/core/analytics";
import { useSettings } from "@/core/settings";

describe("analytics — allowlist stricte", () => {
  it("conserve uniquement les propriétés prévues pour l'événement", () => {
    expect(sanitizeEventProps("market_load_succeeded", {
      scope: "hubs", duration_ms: 42, count: 3, tool: "market",
    })).toEqual({ scope: "hubs", duration_ms: 42, count: 3 });
  });

  it("accepte les identifiants réels des modules", () => {
    const modules = ["mining", "pirate", "pi", "loss", "skills", "industry", "market", "trade", "atelier", "activity", "abyssal", "appraisal", "lp", "refine", "academy"];
    for (const tool of modules) {
      expect(sanitizeEventProps("tool_opened", { tool })).toEqual({ tool });
    }
    expect(sanitizeEventProps("app_opened", { language: "fr" })).toEqual({ language: "fr" });
    expect(sanitizeEventProps("app_opened", { language: "fr-FR" })).toEqual({});
  });

  it("rejette les contenus collés même si la clé paraît anodine", () => {
    const pasted = "Rifter; 125mm Gatling AutoCannon; fit data";
    expect(sanitizeEventProps("fit_generated", {
      payload: pasted,
      input: pasted,
      tool: pasted,
      notes: "Jita market prices",
      arbitrary: "short text",
    })).toEqual({});
  });

  it("rejette les valeurs d'enum inconnues et les compteurs invalides", () => {
    expect(sanitizeEventProps("market_load_succeeded", {
      scope: "private structure",
      count: -1,
      duration_ms: Infinity,
    })).toEqual({});
  });

  it("n'accepte ni URL ni propriété d'un autre événement", () => {
    expect(sanitizeEventProps("tool_opened", {
      tool: "market",
      scope: "hubs",
      $current_url: "https://example.com/?private=1",
      pasted_fit: "secret fit",
    })).toEqual({ tool: "market" });
  });

  it("valide les dimensions bornées de première valeur", () => {
    expect(sanitizeEventProps("activation_completed", {
      tool: "refine",
      activation_action: "refine_calculated",
      activation_session: 2,
      time_to_value_ms: 12_345,
      item_name: "Veldspar",
    })).toEqual({
      tool: "refine",
      activation_action: "refine_calculated",
      activation_session: 2,
      time_to_value_ms: 12_345,
    });
  });

  it("couvre une action de première valeur pour les 15 outils", () => {
    const tools = new Set([
      "mining", "pirate", "pi", "loss", "skills", "industry", "market", "trade",
      "atelier", "activity", "abyssal", "appraisal", "lp", "refine", "academy",
    ]);
    const events = [
      "fit_generated", "appraisal_run", "abyssal_evaluated", "lp_store_computed",
      "activity_loot_valued", "mining_session_started", "industry_esi_import",
      "pirate_analyzed", "loss_analyzed", "skills_esi_import", "trade_station_scanned",
      "market_load_succeeded", "pi_setup_saved", "refine_calculated",
      "academy_lesson_completed",
    ] as const;
    for (const event of events) tools.delete(activationForEvent(event)?.tool ?? "unknown");
    expect([...tools]).toEqual([]);
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
