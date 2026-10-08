import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// One-off config for producing a single self-contained HTML file (used only
// to publish a shareable preview). The main dev/build setup in
// vite.config.ts is unaffected.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
    outDir: "dist-artifact",
    emptyOutDir: true,
  },
});
