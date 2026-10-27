import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  base: "/seq-dna-humano/",
  build: {
    rolldownOptions: {
      external: ["@tanstack/react-query"],
    },
    outDir: "docs",
  },
});