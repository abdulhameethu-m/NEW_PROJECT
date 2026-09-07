/**
 * media-asset-registry.test.js
 *
 * Tests for the centralized Media Asset Registry.
 *
 * Run: npm test -- --testPathPattern=media-asset-registry
 */

// Case-insensitive require cache clearing for Windows compatibility
function clearFromCache(filename) {
  const resolved = require.resolve(filename).toLowerCase().replace(/\\/g, "/");
  Object.keys(require.cache).forEach(key => {
    const normalizedKey = key.toLowerCase().replace(/\\/g, "/");
    if (normalizedKey === resolved) {
      delete require.cache[key];
    }
  });
}

clearFromCache("../src/config/cloudinary");
clearFromCache("../src/models/MediaAsset");
clearFromCache("../src/services/media.service");

const crypto = require("crypto");
const cloudinaryConfig = require("../src/config/cloudinary");
const { MediaAsset } = require("../src/models/MediaAsset");

// Attach spies on configureCloudinary before destructuring to capture reference
vi.spyOn(cloudinaryConfig, "configureCloudinary").mockReturnValue({
  enabled: true,
  cloudinary: {
    uploader: {
      upload_stream: vi.fn(),
      destroy: vi.fn(),
    },
  },
});

// Destructure from the spied config object so the test uses the spy
const { configureCloudinary } = cloudinaryConfig;

// Attach spies on the real MediaAsset model
vi.spyOn(MediaAsset, "findOne").mockResolvedValue(null);
vi.spyOn(MediaAsset, "findById").mockResolvedValue(null);
vi.spyOn(MediaAsset, "findByIdAndUpdate").mockResolvedValue({});
vi.spyOn(MediaAsset, "find").mockResolvedValue([]);
vi.spyOn(MediaAsset, "countDocuments").mockResolvedValue(0);
vi.spyOn(MediaAsset, "aggregate").mockResolvedValue([]);
vi.spyOn(MediaAsset, "create").mockResolvedValue(null);

const mediaService = require("../src/services/media.service");

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(content = "hello world", mimetype = "image/jpeg", originalname = "test.jpg") {
  const buffer = Buffer.from(content);
  return { buffer, mimetype, originalname, size: buffer.length };
}

function makeContext(overrides = {}) {
  return {
    folder: "products",
    entityType: "Product",
    entityId: "product123",
    field: "images",
    createdBy: "user456",
    ...overrides,
  };
}

function makeCloudinaryResult() {
  return {
    public_id: "test_folder/mock_public_id",
    secure_url: "https://res.cloudinary.com/test/mock.jpg",
    resource_type: "image",
    format: "jpg",
    width: 800,
    height: 600,
    bytes: 12345,
  };
}

function setupCloudinaryMock() {
  const cloudinaryResult = makeCloudinaryResult();
  configureCloudinary.mockReturnValue({
    enabled: true,
    cloudinary: {
      uploader: {
        upload_stream: vi.fn((opts, cb) => ({
          end: vi.fn(() => cb(null, cloudinaryResult)),
        })),
        destroy: vi.fn().mockResolvedValue({ result: "ok" }),
      },
    },
  });
  return cloudinaryResult;
}

function makeSaveableAsset(overrides = {}) {
  const asset = {
    _id: "asset123",
    contentHash: null,
    status: "UPLOADING",
    references: [],
    usageCount: 0,
    cloudinaryPublicId: null,
    secureUrl: null,
    ...overrides,
    save: vi.fn().mockResolvedValue(true),
    toObject: vi.fn(function () { return { ...this }; }),
  };
  // Allow set() to update properties on the asset object
  asset.set = vi.fn(function (updates) { Object.assign(this, updates); });
  return asset;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default MediaAsset stubs — individual tests override as needed
  MediaAsset.findOne.mockResolvedValue(null);
  MediaAsset.findById.mockResolvedValue(null);
  MediaAsset.findByIdAndUpdate.mockResolvedValue({});
  MediaAsset.find.mockResolvedValue([]);
  MediaAsset.countDocuments.mockResolvedValue(0);
  MediaAsset.aggregate.mockResolvedValue([]);
  MediaAsset.create.mockResolvedValue(makeSaveableAsset());
});

// ── calculateContentHash ──────────────────────────────────────────────────────

describe("calculateContentHash", () => {
  it("returns a 64-char lowercase hex string", () => {
    const hash = mediaService.calculateContentHash(Buffer.from("test content"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the same hash for identical content", () => {
    const buf = Buffer.from("same content");
    expect(mediaService.calculateContentHash(buf)).toBe(mediaService.calculateContentHash(buf));
  });

  it("returns different hashes for different content", () => {
    const h1 = mediaService.calculateContentHash(Buffer.from("content A"));
    const h2 = mediaService.calculateContentHash(Buffer.from("content B"));
    expect(h1).not.toBe(h2);
  });

  it("matches reference SHA-256", () => {
    const buf = Buffer.from("known input");
    const expected = crypto.createHash("sha256").update(buf).digest("hex");
    expect(mediaService.calculateContentHash(buf)).toBe(expected);
  });

  it("throws for non-Buffer input", () => {
    expect(() => mediaService.calculateContentHash("not a buffer")).toThrow(TypeError);
  });
});

// ── uploadIfNotExists — new file ──────────────────────────────────────────────

describe("uploadIfNotExists — new file", () => {
  it("creates a new MediaAsset and uploads to Cloudinary when no existing asset", async () => {
    setupCloudinaryMock();

    const newAsset = makeSaveableAsset();
    MediaAsset.findOne.mockResolvedValue(null);
    MediaAsset.create.mockResolvedValue(newAsset);

    const file = makeFile();
    const result = await mediaService.uploadIfNotExists(file, makeContext());

    expect(MediaAsset.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: "UPLOADING" })
    );
    expect(newAsset.save).toHaveBeenCalled();
    expect(result.url).toBe("https://res.cloudinary.com/test/mock.jpg");
  });
});

// ── uploadIfNotExists — duplicate (deduplication) ────────────────────────────

describe("uploadIfNotExists — duplicate file (deduplication)", () => {
  it("returns existing READY asset without uploading to Cloudinary", async () => {
    setupCloudinaryMock();

    const existingAsset = makeSaveableAsset({
      status: "READY",
      secureUrl: "https://res.cloudinary.com/test/existing.jpg",
      cloudinaryPublicId: "existing_public_id",
    });
    MediaAsset.findOne.mockResolvedValue(existingAsset);

    const file = makeFile("same bytes");
    const result = await mediaService.uploadIfNotExists(file, makeContext());

    expect(MediaAsset.create).not.toHaveBeenCalled();
    expect(result.url).toBe("https://res.cloudinary.com/test/existing.jpg");
  });
});

// ── uploadIfNotExists — race condition ───────────────────────────────────────

describe("uploadIfNotExists — race condition", () => {
  it("handles E11000 and returns the winner asset after polling", async () => {
    setupCloudinaryMock();

    const winnerAsset = makeSaveableAsset({
      status: "READY",
      secureUrl: "https://res.cloudinary.com/test/winner.jpg",
      cloudinaryPublicId: "winner_id",
    });

    // First findOne → null (no existing READY asset)
    // Second findOne (race poll) → winnerAsset with READY status
    MediaAsset.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValue(winnerAsset);

    const dupKeyError = new Error("E11000 duplicate key error");
    dupKeyError.code = 11000;
    MediaAsset.create.mockRejectedValue(dupKeyError);

    const file = makeFile("raced content");
    const result = await mediaService.uploadIfNotExists(file, makeContext());

    expect(result.url).toBe("https://res.cloudinary.com/test/winner.jpg");
  });
});

// ── addReference ──────────────────────────────────────────────────────────────

describe("addReference", () => {
  it("calls findByIdAndUpdate with $inc usageCount:1 when no duplicate reference", async () => {
    MediaAsset.findOne.mockResolvedValue(null); // no existing duplicate

    await mediaService.addReference("asset123", {
      entityType: "Product",
      entityId: "p1",
      field: "images",
    });

    expect(MediaAsset.findByIdAndUpdate).toHaveBeenCalledWith(
      "asset123",
      expect.objectContaining({ $inc: { usageCount: 1 } })
    );
  });

  it("does NOT add duplicate reference for same entity/field", async () => {
    MediaAsset.findOne.mockResolvedValue({ _id: "asset123" }); // already tracked

    await mediaService.addReference("asset123", {
      entityType: "Product",
      entityId: "p1",
      field: "images",
    });

    expect(MediaAsset.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

// ── removeReference ───────────────────────────────────────────────────────────

describe("removeReference", () => {
  it("marks asset as ORPHANED when usageCount reaches zero", async () => {
    const assetWithRef = makeSaveableAsset({
      status: "READY",
      references: [{ entityType: "Product", entityId: "p1", field: "images" }],
      usageCount: 1,
    });
    MediaAsset.findById.mockResolvedValue(assetWithRef);

    await mediaService.removeReference("asset123", "Product", "p1");

    expect(assetWithRef.status).toBe("ORPHANED");
    expect(assetWithRef.orphanedAt).toBeDefined();
    expect(assetWithRef.save).toHaveBeenCalled();
  });

  it("does NOT mark ORPHANED if references still remain", async () => {
    const assetWithRefs = makeSaveableAsset({
      status: "READY",
      references: [
        { entityType: "Product", entityId: "p1", field: "images" },
        { entityType: "Review",  entityId: "r1", field: "images" },
      ],
      usageCount: 2,
    });
    MediaAsset.findById.mockResolvedValue(assetWithRefs);

    await mediaService.removeReference("asset123", "Product", "p1");

    expect(assetWithRefs.status).toBe("READY");
  });
});

// ── safeDelete ────────────────────────────────────────────────────────────────

describe("safeDelete", () => {
  it("blocks deletion when usageCount > 0 (active references)", async () => {
    const activeAsset = makeSaveableAsset({
      status: "READY",
      usageCount: 2,
      references: [
        { entityType: "Product", entityId: "p1" },
        { entityType: "Review",  entityId: "r1" },
      ],
    });
    MediaAsset.findById.mockResolvedValue(activeAsset);

    const result = await mediaService.safeDelete("asset123");

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/2 active reference/);
  });

  it("deletes from Cloudinary and marks DELETED when usageCount is 0", async () => {
    const { cloudinary } = setupCloudinaryMock();

    const orphanedAsset = makeSaveableAsset({
      status: "ORPHANED",
      usageCount: 0,
      references: [],
      cloudinaryPublicId: "folder/asset123",
      resourceType: "image",
    });
    MediaAsset.findById.mockResolvedValue(orphanedAsset);

    const result = await mediaService.safeDelete("asset123");

    expect(result.success).toBe(true);
    expect(orphanedAsset.status).toBe("DELETED");
    expect(orphanedAsset.deletedAt).toBeDefined();
  });
});

// ── getMetrics ────────────────────────────────────────────────────────────────

describe("getMetrics", () => {
  it("returns correct aggregate metrics", async () => {
    MediaAsset.aggregate.mockResolvedValue([
      { _id: "READY",    count: 42 },
      { _id: "ORPHANED", count: 3  },
      { _id: "DELETED",  count: 5  },
    ]);
    MediaAsset.countDocuments.mockResolvedValue(40);

    const metrics = await mediaService.getMetrics();

    expect(metrics.totalAssets).toBe(50);
    expect(metrics.readyAssets).toBe(42);
    expect(metrics.orphanedAssets).toBe(3);
    expect(metrics.deletedAssets).toBe(5);
    expect(metrics.totalCloudinaryAssets).toBe(40);
  });
});
