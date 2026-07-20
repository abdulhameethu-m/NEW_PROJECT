import path from "node:path";
import process from "node:process";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const frontendRoot = fileURLToPath(new URL(".", import.meta.url));
const reactRoot = path.resolve(frontendRoot, "node_modules/react");
const reactDomRoot = path.resolve(frontendRoot, "node_modules/react-dom");
// Vendor-only chunking. App routes already use React.lazy; grouping app pages here
// makes one route download whole admin/vendor/influencer feature bundles.
const vendorChunks = {
  "vendor-react-core": /\/node_modules\/(?:react|react-dom|scheduler|use-sync-external-store)\//,
  "vendor-router": /\/node_modules\/(?:react-router|react-router-dom|cookie|set-cookie-parser)\//,
  "vendor-icons": /\/node_modules\/lucide-react\//,
  "vendor-date-range": /\/node_modules\/(?:react-date-range|react-list)\//,
  "vendor-dates": /\/node_modules\/date-fns\//,
  "vendor-charts": /\/node_modules\/recharts\//,
  "vendor-animation": /\/node_modules\/(?:framer-motion|motion-dom|motion-utils)\//,
  "vendor-interactions": /\/node_modules\/(?:@dnd-kit)\//,
  "vendor-http": /\/node_modules\/axios\//,
  "vendor-state": /\/node_modules\/zustand\//,
  "vendor-redux": /\/node_modules\/(?:@reduxjs|react-redux|redux|redux-thunk|reselect|immer)\//,
  "vendor-maps": /\/node_modules\/(?:@react-google-maps|@googlemaps|supercluster|kdbush)\//,
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

function getPackageName(id) {
  const normalizedId = id.replace(/\\/g, "/");
  const marker = "/node_modules/";
  const markerIndex = normalizedId.lastIndexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const parts = normalizedId.slice(markerIndex + marker.length).split("/");
  return parts[0]?.startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "kB", "MB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bundleAnalyzerPlugin() {
  return {
    name: "local-bundle-analyzer",
    apply: "build",
    generateBundle(_, bundle) {
      const chunks = Object.values(bundle)
        .filter((item) => item.type === "chunk")
        .map((chunk) => {
          const packages = {};
          const modules = Object.entries(chunk.modules)
            .map(([id, meta]) => {
              const packageName = getPackageName(id);
              const renderedLength = meta.renderedLength || meta.originalLength || 0;

              if (packageName) {
                packages[packageName] = (packages[packageName] || 0) + renderedLength;
              }

              return {
                id,
                package: packageName,
                renderedLength,
              };
            })
            .sort((left, right) => right.renderedLength - left.renderedLength);

          return {
            fileName: chunk.fileName,
            name: chunk.name,
            size: chunk.code.length,
            gzipSize: gzipSync(chunk.code).length,
            imports: chunk.imports,
            dynamicImports: chunk.dynamicImports,
            moduleCount: modules.length,
            packages: Object.entries(packages)
              .map(([name, size]) => ({ name, size }))
              .sort((left, right) => right.size - left.size),
            largestModules: modules.slice(0, 40),
          };
        })
        .sort((left, right) => right.size - left.size);

      const report = {
        generatedAt: new Date().toISOString(),
        chunks,
      };

      const rows = chunks
        .map((chunk) => {
          const packages = chunk.packages
            .slice(0, 8)
            .map((pkg) => `${escapeHtml(pkg.name)} (${formatBytes(pkg.size)})`)
            .join("<br>");

          return `<tr>
            <td><code>${escapeHtml(chunk.fileName)}</code></td>
            <td>${formatBytes(chunk.size)}</td>
            <td>${formatBytes(chunk.gzipSize)}</td>
            <td>${chunk.moduleCount}</td>
            <td>${packages || "app code"}</td>
          </tr>`;
        })
        .join("");

      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Bundle Analysis</title>
  <style>
    body { color: #172033; font: 14px/1.45 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    p { color: #5d687a; margin: 0 0 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #d9dee8; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #f3f6fb; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; }
    code { color: #253858; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
</head>
<body>
  <h1>Bundle Analysis</h1>
  <p>Generated ${escapeHtml(report.generatedAt)}. JSON details are available in <code>bundle-analysis.json</code>.</p>
  <table>
    <thead>
      <tr><th>Chunk</th><th>Size</th><th>Gzip</th><th>Modules</th><th>Largest packages</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

      this.emitFile({
        type: "asset",
        fileName: "bundle-analysis.json",
        source: JSON.stringify(report, null, 2),
      });
      this.emitFile({
        type: "asset",
        fileName: "bundle-analysis.html",
        source: html,
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const shouldAnalyze = mode === "analyze" || process.env.ANALYZE === "true";

  return {
    plugins: [react(), shouldAnalyze ? bundleAnalyzerPlugin() : null].filter(Boolean),
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

      // Do not emit source maps for normal production hosting.
      sourcemap: shouldAnalyze ? "hidden" : false,

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
  };
});
