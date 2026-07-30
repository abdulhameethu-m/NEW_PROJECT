/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const DEFAULT_LOCAL_URI = "mongodb://127.0.0.1:27017/amazon_likee";
const ROOT = path.resolve(__dirname, "../..");
const BACKEND_SRC = path.join(ROOT, "src");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const FRONTEND_SRC = path.join(PROJECT_ROOT, "frontend", "src");
const REPORT_DIR = path.join(ROOT, "reports");

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs"]);
const SOURCE_DIRS = [
  path.join(BACKEND_SRC, "models"),
  path.join(BACKEND_SRC, "modules"),
  path.join(BACKEND_SRC, "controllers"),
  path.join(BACKEND_SRC, "services"),
  path.join(BACKEND_SRC, "repositories"),
  path.join(BACKEND_SRC, "routes"),
  path.join(BACKEND_SRC, "jobs"),
  path.join(BACKEND_SRC, "middleware"),
  path.join(BACKEND_SRC, "utils"),
  path.join(BACKEND_SRC, "config"),
  FRONTEND_SRC,
];

const CRITICAL_COLLECTION_PATTERNS = [
  /audit/i,
  /ledger/i,
  /wallet/i,
  /payment/i,
  /payout/i,
  /refund/i,
  /order/i,
  /settlement/i,
  /invoice/i,
  /security/i,
  /analytics/i,
  /metric/i,
  /campaign/i,
  /config/i,
  /session/i,
];

function argValue(name, fallback = "") {
  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function maskUri(uri = "") {
  return uri.replace(/\/\/([^:/?#]+):([^@/?#]+)@/, "//$1:***@");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", "coverage", "uploads", ".git"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, out);
    else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) out.push(fullPath);
  }
  return out;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function countLiteral(sourceFiles, literal) {
  if (!literal) return 0;
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`, "gi");
  return sourceFiles.reduce((count, file) => {
    const text = readText(file);
    return count + (text.match(pattern) || []).length;
  }, 0);
}

function compactPath(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}

function loadModelFiles() {
  const candidates = [
    ...walk(path.join(BACKEND_SRC, "models")),
    ...walk(path.join(BACKEND_SRC, "modules")),
    ...walk(path.join(BACKEND_SRC, "services")),
  ].filter((file) => {
    const normalized = file.replace(/\\/g, "/");
    return /\/model(s)?\.js$/i.test(normalized) || /\/.*Model\.js$/i.test(normalized) || normalized.includes("/models/");
  });

  const failures = [];
  for (const file of candidates) {
    try {
      require(file);
    } catch (error) {
      failures.push({ file: compactPath(file), error: error.message });
    }
  }
  return { loadedFiles: candidates.map(compactPath), failures };
}

function schemaReferencePaths(model) {
  const refs = [];
  model.schema.eachPath((schemaPath, schemaType) => {
    const options = schemaType.options || {};
    const casterOptions = schemaType.caster?.options || {};
    const ref = options.ref || casterOptions.ref;
    const instance = schemaType.instance || schemaType.caster?.instance;
    if (ref || instance === "ObjectID") {
      refs.push({
        path: schemaPath,
        ref: typeof ref === "function" ? "[dynamic]" : ref || "",
        isArray: Boolean(schemaType.$isMongooseArray),
      });
    }
  });
  return refs;
}

function modelInventory(sourceFiles) {
  return Object.values(mongoose.models)
    .map((model) => ({
      modelName: model.modelName,
      collection: model.collection.name,
      schemaPaths: Object.keys(model.schema.paths).length,
      referencePaths: schemaReferencePaths(model),
      declaredIndexes: model.schema.indexes().map(([fields, options]) => ({ fields, options })),
      sourceHits: countLiteral(sourceFiles, model.modelName) + countLiteral(sourceFiles, model.collection.name),
    }))
    .sort((a, b) => a.collection.localeCompare(b.collection));
}

async function collectionStats(db, collectionName) {
  try {
    const stats = await db.command({ collStats: collectionName });
    return {
      storageSize: stats.storageSize || 0,
      totalIndexSize: stats.totalIndexSize || 0,
      avgObjSize: stats.avgObjSize || 0,
      size: stats.size || 0,
    };
  } catch (error) {
    return { storageSize: 0, totalIndexSize: 0, avgObjSize: 0, size: 0, statsError: error.message };
  }
}

async function lastUpdated(collection) {
  try {
    const [row] = await collection
      .find({}, { projection: { updatedAt: 1, createdAt: 1 } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(1)
      .toArray();
    return row?.updatedAt || row?.createdAt || null;
  } catch {
    return null;
  }
}

async function sampleFields(collection) {
  try {
    const [doc] = await collection.find({}).limit(1).toArray();
    return doc ? Object.keys(doc).sort() : [];
  } catch {
    return [];
  }
}

function classifyCollection(collectionName, model, sourceHits) {
  const protectedReason = CRITICAL_COLLECTION_PATTERNS.find((pattern) => pattern.test(collectionName));
  if (protectedReason) return { status: "protected", reason: "financial, audit, analytics, config, order, campaign, session, or security history" };
  if (model) return { status: "used", reason: `owned by Mongoose model ${model.modelName}` };
  if (sourceHits > 0) return { status: "referenced", reason: "referenced in source code without a loaded Mongoose model" };
  if (/^(tmp|temp|test|demo|seed|migration|backup|old|legacy)[_-]/i.test(collectionName)) {
    return { status: "needs-verification", reason: "name looks temporary or legacy, but deletion still requires backup and manual approval" };
  }
  return { status: "needs-verification", reason: "no model/source owner found; verify manually before cleanup" };
}

async function inspectCollections(db, models, sourceFiles) {
  const modelByCollection = new Map(models.map((model) => [model.collection, model]));
  const collections = await db.listCollections().toArray();
  const rows = [];
  for (const info of collections) {
    const collection = db.collection(info.name);
    const [count, indexes, stats, updatedAt, fields] = await Promise.all([
      collection.countDocuments({}),
      collection.indexes().catch((error) => [{ error: error.message }]),
      collectionStats(db, info.name),
      lastUpdated(collection),
      sampleFields(collection),
    ]);
    const sourceHits = countLiteral(sourceFiles, info.name);
    const model = modelByCollection.get(info.name);
    rows.push({
      name: info.name,
      type: info.type,
      count,
      indexCount: Array.isArray(indexes) ? indexes.length : 0,
      indexes,
      ...stats,
      averageDocumentSize: stats.avgObjSize || (count ? Math.round((stats.size || 0) / count) : 0),
      lastUpdated: updatedAt,
      fields,
      modelName: model?.modelName || null,
      sourceHits,
      classification: classifyCollection(info.name, model, sourceHits),
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function duplicateIndexCandidates(collections) {
  const results = [];
  for (const collection of collections) {
    const seen = new Map();
    for (const index of collection.indexes || []) {
      if (!index.key) continue;
      const key = JSON.stringify(index.key);
      if (seen.has(key)) {
        results.push({ collection: collection.name, indexes: [seen.get(key), index.name], key: index.key });
      } else {
        seen.set(key, index.name);
      }
    }
  }
  return results;
}

async function orphanReferenceReport(db, models) {
  const modelByName = new Map(models.map((model) => [model.modelName, model]));
  const results = [];
  for (const model of models) {
    const refs = model.referencePaths.filter((ref) => ref.ref && ref.ref !== "[dynamic]" && modelByName.has(ref.ref));
    for (const ref of refs) {
      const target = modelByName.get(ref.ref);
      const localField = ref.path;
      const collection = db.collection(model.collection);
      try {
        const [summary] = await collection.aggregate([
          { $match: { [localField]: { $exists: true, $ne: null } } },
          { $limit: 5000 },
          {
            $lookup: {
              from: target.collection,
              localField,
              foreignField: "_id",
              as: "__target",
            },
          },
          { $match: { "__target.0": { $exists: false } } },
          { $group: { _id: null, count: { $sum: 1 }, examples: { $push: "$_id" } } },
          { $project: { _id: 0, count: 1, examples: { $slice: ["$examples", 5] } } },
        ]).toArray();
        if (summary?.count) {
          results.push({
            collection: model.collection,
            modelName: model.modelName,
            field: localField,
            targetCollection: target.collection,
            targetModel: target.modelName,
            orphanCountInFirst5000: summary.count,
            examples: summary.examples.map(String),
          });
        }
      } catch (error) {
        results.push({
          collection: model.collection,
          modelName: model.modelName,
          field: localField,
          targetCollection: target.collection,
          targetModel: target.modelName,
          error: error.message,
        });
      }
    }
  }
  return results;
}

function sourceUsageReport(sourceFiles) {
  const groups = [
    { name: "apis", pattern: /router\.(get|post|put|patch|delete)\(/g },
    { name: "aggregations", pattern: /\.aggregate\(/g },
    { name: "populates", pattern: /\.populate\(/g },
    { name: "lookups", pattern: /\$lookup/g },
    { name: "cronOrQueues", pattern: /(node-cron|new Queue\(|queue\.process|cron\.schedule)/g },
    { name: "directCollections", pattern: /\.collection\(/g },
  ];
  return sourceFiles.map((file) => {
    const text = readText(file);
    const counts = {};
    for (const group of groups) counts[group.name] = (text.match(group.pattern) || []).length;
    return { file: compactPath(file), ...counts };
  }).filter((row) => Object.entries(row).some(([key, value]) => key !== "file" && value > 0));
}

function buildCleanupPlan(collections, orphanReferences, duplicateIndexes) {
  return {
    safeToDeleteNow: [],
    needsBackupFirst: collections
      .filter((collection) => collection.classification.status === "needs-verification")
      .map((collection) => ({
        collection: collection.name,
        count: collection.count,
        reason: collection.classification.reason,
        action: "Manual verification required. Export backup before any delete.",
      })),
    protected: collections
      .filter((collection) => collection.classification.status === "protected")
      .map((collection) => ({ collection: collection.name, reason: collection.classification.reason })),
    orphanReferenceFixes: orphanReferences.map((ref) => ({
      ...ref,
      action: "Investigate owner workflow before unset/delete. Do not remove financial, order, audit, wallet, or ledger history.",
    })),
    duplicateIndexes: duplicateIndexes.map((item) => ({
      ...item,
      action: "Review MongoDB usage stats in Atlas/local before dropping any index.",
    })),
  };
}

function markdownReport(report) {
  const lines = [];
  lines.push("# Database Audit, Optimization, and Cleanup Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Database: ${report.database.name}`);
  lines.push(`URI: ${report.database.uri}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Collections scanned: ${report.summary.collectionsScanned}`);
  lines.push(`- Models scanned: ${report.summary.modelsScanned}`);
  lines.push(`- Schemas loaded: ${report.summary.schemasLoaded}`);
  lines.push(`- APIs/service usage files scanned: ${report.summary.sourceFilesScanned}`);
  lines.push(`- Broken reference groups: ${report.summary.brokenReferenceGroups}`);
  lines.push(`- Duplicate index candidates: ${report.summary.duplicateIndexCandidates}`);
  lines.push(`- Safe-to-delete candidates: ${report.cleanupPlan.safeToDeleteNow.length}`);
  lines.push("");
  lines.push("## Cleanup Policy");
  lines.push("");
  lines.push("No database records were deleted by this script. Financial records, campaign history, audit logs, orders, ledgers, wallets, analytics, sessions, and configuration collections are protected by default.");
  lines.push("");
  lines.push("## Collections");
  lines.push("");
  lines.push("| Collection | Model | Docs | Indexes | Storage | Status |");
  lines.push("| --- | --- | ---: | ---: | ---: | --- |");
  for (const collection of report.collections) {
    lines.push(`| ${collection.name} | ${collection.modelName || "-"} | ${collection.count} | ${collection.indexCount} | ${collection.storageSize} | ${collection.classification.status} |`);
  }
  lines.push("");
  lines.push("## Broken References");
  lines.push("");
  if (!report.orphanReferences.length) {
    lines.push("No broken ObjectId references were detected in the sampled schema-backed scan.");
  } else {
    for (const ref of report.orphanReferences) {
      lines.push(`- ${ref.collection}.${ref.field} -> ${ref.targetCollection}: ${ref.orphanCountInFirst5000 || "error"} ${ref.error ? `(${ref.error})` : ""}`);
    }
  }
  lines.push("");
  lines.push("## Cleanup Candidates");
  lines.push("");
  if (!report.cleanupPlan.needsBackupFirst.length) {
    lines.push("No unowned collections were detected.");
  } else {
    for (const item of report.cleanupPlan.needsBackupFirst) {
      lines.push(`- ${item.collection}: ${item.reason} (${item.count} docs)`);
    }
  }
  lines.push("");
  lines.push("## Rollback Plan");
  lines.push("");
  lines.push("Before any execute-mode cleanup, export BSON, JSON, index definitions, and this report. Restore with mongorestore for BSON or mongoimport per collection for JSON.");
  lines.push("");
  lines.push("## Verification Results");
  lines.push("");
  lines.push("Audit completed in dry-run mode. Run application smoke tests after any future cleanup: admin, vendor, influencer, staff, storefront, orders, products, inventory, payments, escrow, wallets, commission, affiliate, campaigns, content, media, shipping, returns, refunds, analytics, reports, notifications, and audit logs.");
  return `${lines.join("\n")}\n`;
}

async function auditDatabase(uri, label, sourceFiles) {
  await mongoose.disconnect().catch(() => {});
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, autoIndex: false });
  const db = mongoose.connection.db;
  const models = modelInventory(sourceFiles);
  const collections = await inspectCollections(db, models, sourceFiles);
  const duplicateIndexes = duplicateIndexCandidates(collections);
  const orphanReferences = await orphanReferenceReport(db, models);
  return {
    label,
    name: db.databaseName,
    uri: maskUri(uri),
    models,
    collections,
    duplicateIndexes,
    orphanReferences,
  };
}

async function main() {
  if (hasArg("--execute")) {
    throw new Error("This audit tool is dry-run only. Create a reviewed backup and a dedicated cleanup migration before executing deletes.");
  }

  const sourceFiles = SOURCE_DIRS.flatMap((dir) => walk(dir));
  const modelLoad = loadModelFiles();
  const localUri = argValue("--local-uri", process.env.MONGODB_URI || process.env.MONGODB_FALLBACK_URI || DEFAULT_LOCAL_URI);
  const atlasUri = argValue("--atlas-uri", "");
  const includeSourceUsage = hasArg("--include-source-usage");

  const local = await auditDatabase(localUri, "local", sourceFiles);
  let atlas = null;
  if (atlasUri) {
    atlas = await auditDatabase(atlasUri, "atlas", sourceFiles);
  }

  const collectionNameSet = new Set(local.collections.map((collection) => collection.name));
  const modelCollectionSet = new Set(local.models.map((model) => model.collection));
  const missingCollectionsForModels = [...modelCollectionSet].filter((collection) => !collectionNameSet.has(collection)).sort();
  const collectionsWithoutModels = local.collections
    .filter((collection) => !collection.modelName)
    .map((collection) => collection.name);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "dry-run",
    database: { label: local.label, name: local.name, uri: local.uri },
    modelLoad,
    summary: {
      collectionsScanned: local.collections.length,
      modelsScanned: local.models.length,
      schemasLoaded: local.models.length,
      sourceFilesScanned: sourceFiles.length,
      brokenReferenceGroups: local.orphanReferences.filter((item) => !item.error).length,
      duplicateIndexCandidates: local.duplicateIndexes.length,
      collectionsWithoutModels: collectionsWithoutModels.length,
      missingCollectionsForModels: missingCollectionsForModels.length,
    },
    models: local.models,
    collections: local.collections,
    orphanReferences: local.orphanReferences,
    duplicateIndexes: local.duplicateIndexes,
    sourceUsage: includeSourceUsage ? sourceUsageReport(sourceFiles) : [],
    drift: atlas
      ? {
          atlasDatabase: { name: atlas.name, uri: atlas.uri },
          localOnlyCollections: local.collections.map((item) => item.name).filter((name) => !atlas.collections.some((item) => item.name === name)),
          atlasOnlyCollections: atlas.collections.map((item) => item.name).filter((name) => !local.collections.some((item) => item.name === name)),
          differentIndexCounts: local.collections
            .map((collection) => {
              const peer = atlas.collections.find((item) => item.name === collection.name);
              return peer && peer.indexCount !== collection.indexCount
                ? { collection: collection.name, local: collection.indexCount, atlas: peer.indexCount }
                : null;
            })
            .filter(Boolean),
        }
      : null,
    cleanupPlan: buildCleanupPlan(local.collections, local.orphanReferences, local.duplicateIndexes),
    optimizationSummary: {
      indexReviewRequired: local.duplicateIndexes.length > 0,
      missingIndexReview: "Use this report with production query logs/Atlas profiler before adding or dropping indexes.",
      performanceReview: "Storage, count, average document size, declared schema indexes, populate, lookup, cron, queue, and direct collection usage are captured for review.",
    },
    risks: [
      "Do not delete financial, order, campaign, wallet, ledger, audit, analytics, session, or config data without archival and owner approval.",
      "Collections without a loaded model can still be used by raw MongoDB calls, migrations, analytics jobs, or external integrations.",
      "Index removal must be based on MongoDB usage statistics and slow query evidence, not name similarity alone.",
    ],
    rollbackPlan: [
      "Export BSON with mongodump before any cleanup.",
      "Export JSON for human-readable verification of target collections.",
      "Save index definitions from this report before any index migration.",
      "Run cleanup in staging first, then repeat this audit and application smoke tests.",
    ],
    verificationResults: {
      dryRunCompleted: true,
      destructiveChanges: false,
      executeModeAvailable: false,
    },
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(REPORT_DIR, `database-audit-${stamp}.json`);
  const mdPath = path.join(REPORT_DIR, `database-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, markdownReport(report));

  console.log(JSON.stringify({
    mode: report.mode,
    database: report.database,
    summary: report.summary,
    reports: {
      json: compactPath(jsonPath),
      markdown: compactPath(mdPath),
    },
    cleanupPlan: {
      safeToDeleteNow: report.cleanupPlan.safeToDeleteNow.length,
      needsBackupFirst: report.cleanupPlan.needsBackupFirst.length,
      protected: report.cleanupPlan.protected.length,
      orphanReferenceFixes: report.cleanupPlan.orphanReferenceFixes.length,
    },
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
