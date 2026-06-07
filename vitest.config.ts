import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Config Vitest de la suite. Les tests sont **purs** (logique métier, environnement
 * node, pas de DOM). Lancer : `npm test` (après `npm install`).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mining": path.resolve(__dirname, "./src/modules/mining/app"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Tests purs : analytics neutralisée (sinon `.env.production` injecte la clé
    // et `analyticsConfigured()` serait vrai pendant les tests).
    env: { VITE_POSTHOG_KEY: "", VITE_POSTHOG_HOST: "" },
  },
});
