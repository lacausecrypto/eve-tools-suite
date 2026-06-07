import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Config Vite pour la suite (frontend React empaqueté par Tauri).
// Le serveur dev tourne sur un port fixe pour que Tauri puisse s'y attacher.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mining": path.resolve(__dirname, "./src/modules/mining/app"),
    },
  },
  clearScreen: false,
  server: {
    port: 5180,
    strictPort: true,
  },
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
