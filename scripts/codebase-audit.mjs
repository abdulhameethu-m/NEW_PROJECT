import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const now = new Date().toISOString().slice(0, 10);
const docsDir = path.join(root, "docs");
const graphPath = path.join(docsDir, `enterprise-codebase-dependency-graph-${now}.json`);
const reportPath = path.join(docsDir, `enterprise-codebase-audit-${now}.md`);

const sourceRoots = [
  path.join(root, "frontend", "src"),
  path.join(root, "backend", "src"),
];

const skipDirs = new Set([
  ".git",
  ".agents",
  "node_modules",
  "dist",
  "coverage",
  "uploads",
  ".vite",
]);

const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs"]);
const assetExtensions = new Set([".css", ".json", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"]);

function slash(value) {
  return value.replace(/\\/g, "/");
}

function relative(filePath) {
  return slash(path.relative(root, filePath));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function resolveCandidate(baseDir, specifier) {
  const raw = specifier.startsWith("@/")
    ? path.join(root, "frontend", "src", specifier.slice(2))
    : specifier.startsWith("@components")
      ? path.join(root, "frontend", "src", "components", specifier.slice("@components".length))
      : specifier.startsWith("@pages")
        ? path.join(root, "frontend", "src", "pages", specifier.slice("@pages".length))
        : specifier.startsWith("@utils")
          ? path.join(root, "frontend", "src", "utils", specifier.slice("@utils".length))
          : specifier.startsWith("@services")
            ? path.join(root, "frontend", "src", "services", specifier.slice("@services".length))
            : specifier.startsWith("@hooks")
              ? path.join(root, "frontend", "src", "hooks", specifier.slice("@hooks".length))
              : specifier.startsWith("@context")
                ? path.join(root, "frontend", "src", "context", specifier.slice("@context".length))
                : specifier.startsWith(".")
                  ? path.resolve(baseDir, specifier)
                  : "";

  if (!raw) return null;
  const candidates = [raw];
  for (const ext of [...sourceExtensions, ...assetExtensions]) candidates.push(`${raw}${ext}`);
  for (const ext of [...sourceExtensions, ...assetExtensions]) candidates.push(path.join(raw, `index${ext}`));
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null;
}

function packageName(specifier) {
  if (!specifier || specifier.startsWith(".") || specifier.startsWith("@/")) return "";
  if (specifier.startsWith("@components") || specifier.startsWith("@pages") || specifier.startsWith("@utils") || specifier.startsWith("@services") || specifier.startsWith("@hooks") || specifier.startsWith("@context")) return "";
  if (specifier.startsWith("node:")) return specifier;
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

function extractSpecifiers(text) {
  const specs = [];
  const patterns = [
    /\bimport\s+(?:[^'"()]+?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[^'"()]+?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) specs.push(match[1]);
  }
  return [...new Set(specs)];
}

function extractFrontendRoutes(text) {
  return [...text.matchAll(/<Route\b[^>]*\bpath=["']([^"']+)["'][^>]*\belement=\{<([A-Za-z0-9_]+)/g)]
    .map((match) => ({ path: match[1], component: match[2] }));
}

function extractLazyImports(text) {
  return [...text.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*lazy(?:Named|Default)\s*\(\s*\(\)\s*=>\s*import\(["']([^"']+)["']\)/g)]
    .map((match) => ({ component: match[1], specifier: match[2] }));
}

function extractBackendRoutes(text) {
  return [...text.matchAll(/app\.use\(\s*["']([^"']+)["']\s*,\s*([^;\n]+)/g)]
    .map((match) => ({ mount: match[1], handler: match[2].trim() }));
}

function extractExpressEndpoints(text, file) {
  return [...text.matchAll(/\brouter\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g)]
    .map((match) => ({ method: match[1].toUpperCase(), path: match[2], file }));
}

function extractMongooseModels(text, file) {
  const rows = [];
  for (const match of text.matchAll(/mongoose\.model\(\s*["']([^"']+)["']/g)) {
    rows.push({ model: match[1], file });
  }
  for (const match of text.matchAll(/modelName:\s*["']([^"']+)["']/g)) {
    rows.push({ model: match[1], file });
  }
  return rows;
}

function extractSchedulers(text, file) {
  const rows = [];
  for (const match of text.matchAll(/cron\.schedule\(\s*([^,\n]+)/g)) rows.push({ type: "cron", expression: match[1].trim(), file });
  for (const match of text.matchAll(/new\s+Queue\(\s*["']([^"']+)["']/g)) rows.push({ type: "bull", queue: match[1], file });
  return rows;
}

function categorize(file) {
  const rel = relative(file);
  if (rel.includes("/__tests__/") || /\.(test|spec)\.[jt]sx?$/.test(rel)) return "test";
  if (rel.startsWith("frontend/src/types/")) return "type-definition";
  if (rel.startsWith("frontend/src/pages/")) return "frontend-page";
  if (rel.startsWith("frontend/src/components/")) return "frontend-component";
  if (rel.startsWith("frontend/src/hooks/")) return "frontend-hook";
  if (rel.startsWith("frontend/src/context/")) return "frontend-context";
  if (rel.startsWith("frontend/src/services/")) return "frontend-service";
  if (rel.startsWith("frontend/src/utils/")) return "frontend-utility";
  if (rel.startsWith("backend/src/routes/")) return "backend-route";
  if (rel.startsWith("backend/src/controllers/")) return "backend-controller";
  if (rel.startsWith("backend/src/services/")) return "backend-service";
  if (rel.startsWith("backend/src/modules/")) return "backend-module";
  if (rel.startsWith("backend/src/models/")) return "backend-model";
  if (rel.startsWith("backend/src/jobs/")) return "backend-job";
  if (rel.startsWith("backend/src/middleware/")) return "backend-middleware";
  if (rel.startsWith("backend/src/scripts/")) return "backend-script";
  return "source";
}

function fileSize(file) {
  return fs.statSync(file).size;
}

fs.mkdirSync(docsDir, { recursive: true });

const files = sourceRoots.flatMap((dir) => walk(dir)).filter((file) => {
  const ext = path.extname(file);
  return sourceExtensions.has(ext) || assetExtensions.has(ext);
});
const sourceFiles = files.filter((file) => sourceExtensions.has(path.extname(file)));
const fileSet = new Set(files.map((file) => path.resolve(file)));

const graph = {};
const inbound = new Map(files.map((file) => [path.resolve(file), []]));
const packageImports = new Map();
const frontendRoutes = [];
const lazyImports = [];
const backendRoutes = [];
const backendEndpoints = [];
const mongooseModels = [];
const schedulers = [];

for (const file of sourceFiles) {
  const abs = path.resolve(file);
  const rel = relative(file);
  const text = fs.readFileSync(file, "utf8");
  const specs = extractSpecifiers(text);
  graph[rel] = {
    category: categorize(file),
    size: fileSize(file),
    imports: [],
    packages: [],
  };

  for (const spec of specs) {
    const resolved = resolveCandidate(path.dirname(file), spec);
    const pkg = packageName(spec);
    if (resolved && fileSet.has(path.resolve(resolved))) {
      const target = path.resolve(resolved);
      graph[rel].imports.push(relative(target));
      inbound.get(target)?.push(rel);
    } else if (pkg) {
      graph[rel].packages.push(pkg);
      if (!packageImports.has(pkg)) packageImports.set(pkg, []);
      packageImports.get(pkg).push(rel);
    }
  }

  if (rel === "frontend/src/App.jsx") {
    frontendRoutes.push(...extractFrontendRoutes(text));
    lazyImports.push(...extractLazyImports(text).map((row) => {
      const resolved = resolveCandidate(path.dirname(file), row.specifier);
      return { ...row, file: resolved ? relative(resolved) : "" };
    }));
  }
  if (rel === "backend/src/app.js") backendRoutes.push(...extractBackendRoutes(text));
  if (rel.startsWith("backend/src/routes/") || rel.startsWith("backend/src/modules/")) {
    backendEndpoints.push(...extractExpressEndpoints(text, rel));
  }
  mongooseModels.push(...extractMongooseModels(text, rel));
  schedulers.push(...extractSchedulers(text, rel));
}

const entryFiles = new Set([
  "frontend/src/main.jsx",
  "frontend/src/App.jsx",
  "backend/src/server.js",
  "backend/src/app.js",
]);

for (const pkgFile of [
  path.join(root, "frontend", "package.json"),
  path.join(root, "backend", "package.json"),
]) {
  const pkg = readJson(pkgFile);
  const scripts = Object.values(pkg.scripts || {});
  for (const script of scripts) {
    for (const match of String(script).matchAll(/\b(?:node|nodemon)\s+([^\s]+)/g)) {
      const candidate = path.resolve(path.dirname(pkgFile), match[1]);
      if (fs.existsSync(candidate)) entryFiles.add(relative(candidate));
    }
  }
}

for (const row of lazyImports) if (row.file) entryFiles.add(row.file);
for (const row of schedulers) entryFiles.add(row.file);

const noInbound = files
  .filter((file) => sourceExtensions.has(path.extname(file)))
  .map((file) => {
    const abs = path.resolve(file);
    const rel = relative(file);
    return {
      file: rel,
      category: categorize(file),
      size: fileSize(file),
      inbound: inbound.get(abs) || [],
      isEntry: entryFiles.has(rel),
      proof: entryFiles.has(rel) ? "entry-or-runtime-trigger" : "zero-static-inbound-needs-runtime-verification",
    };
  })
  .filter((row) => row.inbound.length === 0 && !row.isEntry)
  .sort((a, b) => b.size - a.size);

const largeFiles = files
  .map((file) => ({ file: relative(file), category: categorize(file), size: fileSize(file) }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 40);

function packageReport(packageJsonPath) {
  const pkg = readJson(packageJsonPath);
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  return Object.keys(deps).sort().map((name) => ({
    package: name,
    version: deps[name],
    importCount: (packageImports.get(name) || []).length,
    importedBy: [...new Set(packageImports.get(name) || [])].slice(0, 20),
    status: (packageImports.get(name) || []).length ? "referenced" : "no-static-source-import",
  }));
}

const packageUsage = {
  frontend: packageReport(path.join(root, "frontend", "package.json")),
  backend: packageReport(path.join(root, "backend", "package.json")),
};

const duplicateMounts = Object.entries(
  backendRoutes.reduce((acc, row) => {
    acc[row.mount] ||= [];
    acc[row.mount].push(row.handler);
    return acc;
  }, {})
).filter(([, handlers]) => handlers.length > 1)
  .map(([mount, handlers]) => ({ mount, handlers }));

const duplicateEndpoints = Object.entries(
  backendEndpoints.reduce((acc, row) => {
    const key = `${row.method} ${row.path}`;
    acc[key] ||= [];
    acc[key].push(row.file);
    return acc;
  }, {})
).filter(([, filesForEndpoint]) => new Set(filesForEndpoint).size > 1)
  .map(([endpoint, filesForEndpoint]) => ({ endpoint, files: [...new Set(filesForEndpoint)] }));

const output = {
  generatedAt: new Date().toISOString(),
  totals: {
    files: files.length,
    sourceFiles: sourceFiles.length,
    frontendRoutes: frontendRoutes.length,
    backendMounts: backendRoutes.length,
    backendEndpoints: backendEndpoints.length,
    mongooseModels: mongooseModels.length,
    schedulers: schedulers.length,
  },
  graph,
  inbound: Object.fromEntries([...inbound.entries()].map(([file, refs]) => [relative(file), refs])),
  frontendRoutes,
  lazyImports,
  backendRoutes,
  backendEndpoints,
  mongooseModels,
  schedulers,
  largeFiles,
  noInbound,
  packageUsage,
  duplicates: {
    backendMounts: duplicateMounts,
    backendEndpoints: duplicateEndpoints,
  },
};

fs.writeFileSync(graphPath, `${JSON.stringify(output, null, 2)}\n`);

function table(rows, columns) {
  if (!rows.length) return "_None found._\n";
  const header = `| ${columns.join(" |")} |`;
  const sep = `| ${columns.map(() => "---").join(" |")} |`;
  const body = rows.map((row) => `| ${columns.map((col) => String(row[col] ?? "").replace(/\|/g, "\\|")).join(" |")} |`);
  return [header, sep, ...body].join("\n") + "\n";
}

const report = `# Enterprise Codebase Audit - ${now}

## Section 1 - Architecture Findings

- Frontend: Vite React SPA with route declarations in \`frontend/src/App.jsx\`.
- Backend: Express API mounted from \`backend/src/app.js\` with Mongoose domain models and Bull/Cron jobs.
- Source files scanned: ${output.totals.sourceFiles}
- Frontend route declarations: ${output.totals.frontendRoutes}
- Backend route mounts: ${output.totals.backendMounts}
- Backend endpoint declarations: ${output.totals.backendEndpoints}
- Mongoose model declarations found: ${output.totals.mongooseModels}
- Scheduled/queue triggers found: ${output.totals.schedulers}
- Full JSON graph: \`${relative(graphPath)}\`

## Section 2 - Unused Files

The following files have zero static inbound imports in the source graph. They are **not automatically safe to delete**; each one needs runtime verification for routing, scripts, external calls, generated imports, and scheduled triggers.

${table(noInbound.slice(0, 40).map((row) => ({
  file: row.file,
  category: row.category,
  size: row.size,
  proof: row.proof,
})), ["file", "category", "size", "proof"])}

## Section 3 - Unused Services

Potential service candidates are the zero-inbound rows whose category is \`frontend-service\` or \`backend-service\`. Treat backend services as active until controller/module/script usage and external integrations are checked.

${table(noInbound.filter((row) => row.category.endsWith("service") && row.category !== "test").slice(0, 30).map((row) => ({
  file: row.file,
  size: row.size,
  proof: row.proof,
})), ["file", "size", "proof"])}

## Section 4 - Unused APIs

No API route was removed. Backend mounts and endpoints were mapped for manual verification. Duplicate/shadow candidates are listed below.

Duplicate mount handler groups:

${duplicateMounts.length ? duplicateMounts.map((row) => `- \`${row.mount}\`: ${row.handlers.join(", ")}`).join("\n") : "_None found._"}

Duplicate endpoint path groups:

${duplicateEndpoints.length ? duplicateEndpoints.slice(0, 80).map((row) => `- \`${row.endpoint}\`: ${row.files.join(", ")}`).join("\n") : "_None found._"}

## Section 5 - Unused Schemas

Mongoose schemas/models require database/runtime verification before removal. Model declarations found:

${table(mongooseModels.slice(0, 60).map((row) => ({
  model: row.model,
  file: row.file,
})), ["model", "file"])}

## Section 6 - Unused Database Connections

No unused database connection was removed. The audit identified Redis/Bull usage and Mongo/Mongoose usage through imports and queue declarations. Database cleanup requires live collection statistics and query profiling.

Schedulers and queues:

${table(schedulers.map((row) => ({
  type: row.type,
  expression: row.expression || row.queue || "",
  file: row.file,
})), ["type", "expression", "file"])}

## Section 7 - Duplicate Logic

High-signal duplicate/shadow areas:

- Payment routes are mounted under both \`/api/payments\` and \`/api/payment\`; likely compatibility alias, verify external clients before removal.
- Large domain services contain repeated dashboard and analytics aggregation patterns; split read models only after profiling.
- Frontend pages with tabbed mega-components should be decomposed into tab-level lazy chunks.

Largest files:

${table(largeFiles.slice(0, 30), ["file", "category", "size"])}

## Section 8 - Safe Removal Plan

For every candidate:

1. Confirm zero static inbound references in \`${relative(graphPath)}\`.
2. Confirm it is not an App route, backend route mount, package script target, cron job, Bull queue, webhook handler, or external integration callback.
3. Confirm no dynamic string-based import or external HTTP client depends on it.
4. Remove in a small batch.
5. Run frontend build and backend route/domain tests.

Package candidates with no static source imports:

${table([...packageUsage.frontend, ...packageUsage.backend].filter((row) => row.status === "no-static-source-import").map((row) => ({
  package: row.package,
  version: row.version,
  status: row.status,
})), ["package", "version", "status"])}

Build tools, CLIs, type packages, and packages loaded by configuration may legitimately appear in this list. Remove packages only after checking \`package.json\` scripts, config files, generated code, and runtime integration settings.

## Section 9 - Performance Optimization Plan

- Keep frontend app code route-split. Avoid feature-level app chunks that pull whole admin/vendor/influencer panels.
- Split large active pages:
  - \`VendorInfluencerPage.jsx\`
  - \`AdminHomepageContainersPage.jsx\`
  - \`AdminInfluencerCommercePage.jsx\`
  - \`InfluencerPublicStorefrontPage.jsx\`
- Add request timing middleware and profile slow dashboard endpoints.
- Capture Mongo \`explain("executionStats")\` for dashboard, campaign, affiliate tracking, commission, wallet, escrow, and analytics queries before adding/removing indexes.
- Move expensive dashboard analytics to pre-aggregated read models where endpoints aggregate many collections on every load.

## Section 10 - Implementation Changes

- Added repeatable audit generator: \`scripts/codebase-audit.mjs\`.
- Generated dependency graph: \`${relative(graphPath)}\`.
- Generated this enterprise audit report.
- No files, routes, schemas, jobs, packages, or APIs were deleted in this pass.
`;

fs.writeFileSync(reportPath, report);

console.log(`Wrote ${relative(graphPath)}`);
console.log(`Wrote ${relative(reportPath)}`);
