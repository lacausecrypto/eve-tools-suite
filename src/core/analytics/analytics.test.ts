import { describe, it, expect, beforeAll } from "vitest";

// Shim localStorage minimal : l'env de test est `node` et le store de réglages
// est persisté (zustand → localStorage). Évite un ReferenceError à l'écriture.
beforeAll(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const mem = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, String(v)),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
      key: (i: number) => [...mem.keys()][i] ?? null,
      get length() {
        return mem.size;
      },
    } as Storage;
  }
});

import {
  sanitizeEventProps,
  analyticsConfigured,
  track,
  setConsent,
} from "@/core/analytics";
import { useSettings } from "@/core/settings";

describe("analytics — anonymisation (no-PII)", () => {
  it("retire les clés sensibles (PII / EVE)", () => {
    const out = sanitizeEventProps({
      tool: "mining", // OK
      members: 3, // OK
      characterName: "Bob Pilot", // sensible
      character_id: 12345, // sensible
      pilot: "Bob", // sensible
      isk: 1_000_000, // sensible
      wallet: 5, // sensible
      email: "a@b.c", // sensible
      access_token: "secret", // sensible
      authorization: "Bearer x", // sensible
      name: "Jita", // suffixe "name" → sensible par prudence
    });
    expect(out).toEqual({ tool: "mining", members: 3 });
  });

  it("retire les textes libres longs (>120 car.)", () => {
    const long = "x".repeat(200);
    const out = sanitizeEventProps({ tool: "appraisal", blob: long, n: 2 });
    expect(out).toEqual({ tool: "appraisal", n: 2 });
  });

  it("conserve les valeurs non-PII (enums, compteurs, booléens)", () => {
    const out = sanitizeEventProps({ role: "ratting", vwap: true, items: 12 });
    expect(out).toEqual({ role: "ratting", vwap: true, items: 12 });
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
