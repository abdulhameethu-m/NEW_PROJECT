import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));
const reactRoot = path.resolve(frontendRoot, "node_modules/react");
const reactDomRoot = path.resolve(frontendRoot, "node_modules/react-dom");
const nodeModuleReactPackages = /\/node_modules\/(?:react|react-dom|react-router|react-router-dom)\//;

// Module categories for chunking
const moduleChunks = {
  // Core vendor chunks
  "vendor-react": /\/node_modules\/(?:react|react-dom|react-router|react-router-dom)\//,
  "vendor-icons": /\/node_modules\/lucide-react\//,
  "vendor-dates": /\/node_modules\/(?:date-fns|react-date-range)\//,
  "vendor-charts": /\/node_modules\/recharts\//,
  "vendor-interactions": /\/node_modules\/(?:framer-motion|@dnd-kit|react-rnd|react-intersection-observer)\//,
  "vendor-http": /\/node_modules\/axios\//,
  "vendor-state": /\/node_modules\/zustand\//,
  "vendor-ui": /\/node_modules\/(?:@react-google-maps|@radix-ui)\//,
  
  // Feature chunks
  "chunk-admin": /\/pages\/Admin|\/components\/admin\//,
  "chunk-vendor": /\/pages\/Vendor|\/components\/vendor\//,
  "chunk-influencer": /\/pages\/influencer|\/components\/influencer\//,
  "chunk-affiliate": /\/pages\/Affiliate|\/components\/affiliate\//,
  "chunk-campaigns": /\/pages\/[^/]*Campaign|\/components\/campaign\//,
  "chunk-analytics": /\/pages\/[^/]*Analytics|\/components\/analytics\//,
  "chunk-commerce": /\/pages\/(?:Products|Cart|Checkout|Order|Wishlist|Compare)|\/components\/commerce\//,
  "chunk-finance": /\/pages\/(?:Payout|Invoice|Finance|Earnings)|\/components\/finance\//,
  "chunk-settings": /\/pages\/(?:Settings|Profile|Support|Notification)|\/components\/settings\//,
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

  // Check vendor chunks
  for (const [chunkName, pattern] of Object.entries(moduleChunks)) {
    if (chunkName.startsWith("vendor-") && pattern.test(normalizedId)) {
      return chunkName;
    }
  }

  // Default vendor chunk
  return "vendor";
}

/**
 * Determine chunk for app code (src/)
 */
function getAppChunkName(id) {
  const normalizedId = id.replace(/\\/g, "/");

  // Skip node_modules and external
  if (normalizedId.includes("/node_modules/") || !normalizedId.includes("/src/")) {
    return undefined;
  }

  // Feature-based chunking
  for (const [chunkName, pattern] of Object.entries(moduleChunks)) {
    if (!chunkName.startsWith("vendor-") && pattern.test(normalizedId)) {
      return chunkName;
    }
  }

  // Category-based chunking for pages
  if (normalizedId.includes("/pages/")) {
    if (normalizedId.includes("Admin")) return "chunk-admin";
    if (normalizedId.includes("Vendor")) return "chunk-vendor";
    if (normalizedId.includes("influencer")) return "chunk-influencer";
    if (normalizedId.includes("Affiliate")) return "chunk-affiliate";
  }

  // Component chunking
  if (normalizedId.includes("/components/")) {
    if (normalizedId.includes("/admin/")) return "chunk-admin";
    if (normalizedId.includes("/vendor/")) return "chunk-vendor";
    if (normalizedId.includes("/influencer/")) return "chunk-influencer";
  }

  return undefined;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize rollup configuration
    rollupOptions: {
      output: {
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split("/").slice(-1)[0].replace(/\.[^.]*$/, "") : "chunk";
          return `chunks/[name]-[hash].js`;
        },
        entryFileNames: "[name]-[hash].js",
        
        // Advanced code splitting strategy
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          // Vendor chunks
          const vendorChunk = getChunkName(id);
          if (vendorChunk) return vendorChunk;

          // App chunks
          const appChunk = getAppChunkName(id);
          if (appChunk) return appChunk;

          return undefined;
        },
      },
    },

    // Chunk size optimization
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },

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
