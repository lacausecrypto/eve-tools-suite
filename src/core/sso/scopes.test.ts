import { describe, it, expect } from "vitest";
import "@/modules"; // enregistre tous les manifestes dans le registre
import { requiredScopes } from "@/core/module/registry";
import { DEFAULT_SCOPES } from "@/core/app";

/**
 * Contrat scopes ↔ endpoints authentifiés.
 *
 * Chaque endpoint ESI authentifié réellement appelé par la suite, avec le scope
 * que CCP exige pour lui. Si un nouvel appel authentifié est ajouté, il faut
 * l'inscrire ici ET déclarer son scope dans le manifeste du module — sinon ce
 * test échoue, ce qui évite les régressions « 403 missing scope » en prod.
 *
 * Source : src/modules/skills/app/api.ts, src/modules/industry/app/api.ts,
 *          src/shell/coreWidgets.tsx (widgets dashboard).
 */
const AUTH_ENDPOINTS: { path: string; scope: string }[] = [
  { path: "/characters/{id}/skills/", scope: "esi-skills.read_skills.v1" },
  { path: "/characters/{id}/attributes/", scope: "esi-skills.read_skills.v1" },
  { path: "/characters/{id}/skillqueue/", scope: "esi-skills.read_skillqueue.v1" },
  { path: "/characters/{id}/wallet/", scope: "esi-wallet.read_character_wallet.v1" },
  { path: "/characters/{id}/wallet/transactions/", scope: "esi-wallet.read_character_wallet.v1" },
  { path: "/characters/{id}/assets/", scope: "esi-assets.read_assets.v1" },
  { path: "/characters/{id}/industry/jobs/", scope: "esi-industry.read_character_jobs.v1" },
];

describe("SSO scopes ↔ endpoints contract", () => {
  it("le login (requiredScopes) couvre tous les endpoints authentifiés", () => {
    const granted = new Set(requiredScopes());
    const missing = AUTH_ENDPOINTS.filter((e) => !granted.has(e.scope));
    expect(
      missing,
      `Endpoints sans scope accordé : ${missing.map((m) => `${m.path} → ${m.scope}`).join(", ")}`,
    ).toEqual([]);
  });

  it("aucun scope superflu : tout scope demandé sert au moins un endpoint (moindre privilège)", () => {
    const used = new Set(AUTH_ENDPOINTS.map((e) => e.scope));
    const superfluous = requiredScopes().filter((s) => !used.has(s));
    expect(
      superfluous,
      `Scopes demandés mais jamais utilisés : ${superfluous.join(", ")}`,
    ).toEqual([]);
  });

  it("DEFAULT_SCOPES (fallback de login()) ⊇ requiredScopes()", () => {
    const fallback = new Set(DEFAULT_SCOPES);
    const uncovered = requiredScopes().filter((s) => !fallback.has(s));
    expect(
      uncovered,
      `requiredScopes non couverts par le fallback : ${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("tous les scopes sont read-only (conformité CCP)", () => {
    const writeScopes = requiredScopes().filter((s) => !/\.read_/.test(s));
    expect(writeScopes, `Scopes en écriture détectés : ${writeScopes.join(", ")}`).toEqual([]);
  });
});
