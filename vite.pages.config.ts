import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const pagesRoot = fileURLToPath(new URL("./github-pages", import.meta.url));
const outputDirectory = fileURLToPath(new URL("./dist-pages", import.meta.url));
const publicDirectory = fileURLToPath(new URL("./public", import.meta.url));

export default defineConfig({
  root: pagesRoot,
  base: "/disc-flow/",
  publicDir: publicDirectory,
  plugins: [react()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
  },
});
