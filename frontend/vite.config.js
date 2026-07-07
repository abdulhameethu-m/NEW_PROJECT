import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));
const reactRoot = path.resolve(frontendRoot, "node_modules/react");
const reactDomRoot = path.resolve(frontendRoot, "node_modules/react-dom");
// Vendor-only chunking. App routes already use React.lazy; grouping app pages here
// makes one route download whole admin/vendor/influencer feature bundles.
const vendorChunks = {
  "vendor-react": /\/node_modules\/(?:react|react-dom|react-router|react-router-dom)\//,
  "vendor-icons": /\/node_modules\/lucide-react\//,
  "vendor-dates": /\/node_modules\/(?:date-fns|react-date-range)\//,
  "vendor-charts": /\/node_modules\/recharts\//,
  "vendor-interactions": /\/node_modules\/(?:framer-motion|@dnd-kit|react-rnd|react-intersection-observer)\//,
  "vendor-http": /\/node_modules\/axios\//,
  "vendor-state": /\/node_modules\/zustand\//,
  "vendor-ui": /\/node_modules\/(?:@react-google-maps|@radix-ui)\//,
};

/**
 * Determine chunk name for a module
 */
function getChunkName(id) {
  const normalizedId = id.replace(/\\/g, "/");

  // Skip non-node_modules
  if (!normalizedId.includes("/node_modules/")) {
    return undefined;
  }

  for (const [chunkName, pattern] of Object.entries(vendorChunks)) {
    if (pattern.test(normalizedId)) {
      return chunkName;
    }
  }

  // Default vendor chunk
  return "vendor";
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep route-level lazy imports lazy at the network layer. Vite's default
    // modulepreload can eagerly fetch shared dashboard/vendor chunks from HTML.
    modulePreload: false,

    // Optimize rollup configuration
    rollupOptions: {
      output: {
        // Optimize chunk file names for caching
        chunkFileNames: () => {
          return `chunks/[name]-[hash].js`;
        },
        entryFileNames: "[name]-[hash].js",
        
        // Advanced code splitting strategy
        manualChunks(id) {
          // Vendor chunks
          const vendorChunk = getChunkName(id);
          if (vendorChunk) return vendorChunk;

          return undefined;
        },
      },
    },

    // Chunk size optimization
    minify: "oxc",

    // Enable source maps in production for error tracking
    sourcemap: "hidden",

    // Optimize chunk sizes
    cssCodeSplit: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsm: true,
    },

    // Performance hints
    reportCompressedSize: true,
  },

  resolve: {
    alias: [
      { find: "react/jsx-dev-runtime", replacement: path.resolve(reactRoot, "jsx-dev-runtime.js") },
      { find: "react/jsx-runtime", replacement: path.resolve(reactRoot, "jsx-runtime.js") },
      { find: "react-dom/client", replacement: path.resolve(reactDomRoot, "client.js") },
      { find: "react-dom", replacement: reactDomRoot },
      { find: "react", replacement: reactRoot },
      { find: "@/", replacement: path.resolve(frontendRoot, "src/") },
      { find: "@components", replacement: path.resolve(frontendRoot, "src/components") },
      { find: "@pages", replacement: path.resolve(frontendRoot, "src/pages") },
      { find: "@utils", replacement: path.resolve(frontendRoot, "src/utils") },
      { find: "@services", replacement: path.resolve(frontendRoot, "src/services") },
      { find: "@hooks", replacement: path.resolve(frontendRoot, "src/hooks") },
      { find: "@context", replacement: path.resolve(frontendRoot, "src/context") },
    ],
    dedupe: ["react", "react-dom"],
  },

  // Dev server configuration
  server: {
    middlewareMode: false,
    fs: {
      strict: true,
    },
  },

  // Optimization configuration
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "axios",
      "zustand",
    ],
  },
});
