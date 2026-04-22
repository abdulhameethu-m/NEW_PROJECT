import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(frontendRoot, "node_modules/react"),
      "react-dom": path.resolve(frontendRoot, "node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
});
