/**
 * vendor-media-isolation.test.js
 *
 * Verifies strict tenant isolation for media assets and albums.
 * Ensures vendors cannot read, favorite, delete, or organize assets belonging to another vendor.
 */

const { MediaAsset } = require("../src/models/MediaAsset");
const { MediaAlbum } = require("../src/models/MediaAlbum");
const mediaService = require("../src/services/media.service");
const albumService = require("../src/services/album.service");

describe("Vendor Media & Album Multi-Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mediaService isolation", () => {
    it("listAssets scopes query strictly by createdBy", async () => {
      const findSpy = vi.spyOn(MediaAsset, "find").mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      });
      const countSpy = vi.spyOn(MediaAsset, "countDocuments").mockResolvedValue(0);

      await mediaService.listAssets({ page: 1, limit: 20, createdBy: "vendor_123" });

      expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({ createdBy: "vendor_123" }));
      expect(countSpy).toHaveBeenCalledWith(expect.objectContaining({ createdBy: "vendor_123" }));
    });

    it("getAsset blocks access when createdBy does not match", async () => {
      const foreignAsset = {
        _id: "asset_abc",
        createdBy: "vendor_999",
        originalFilename: "secret.png",
      };
      vi.spyOn(MediaAsset, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(foreignAsset),
      });

      const result = await mediaService.getAsset("asset_abc", "vendor_123");
      expect(result).toBeNull();
    });

    it("getAsset permits access when createdBy matches", async () => {
      const ownAsset = {
        _id: "asset_abc",
        createdBy: "vendor_123",
        originalFilename: "my_product.png",
      };
      vi.spyOn(MediaAsset, "findById").mockReturnValue({
        lean: vi.fn().mockResolvedValue(ownAsset),
      });

      const result = await mediaService.getAsset("asset_abc", "vendor_123");
      expect(result).toEqual(ownAsset);
    });

    it("safeDelete rejects deletion of another tenant's asset", async () => {
      const foreignAsset = {
        _id: "asset_abc",
        createdBy: "vendor_999",
        status: "READY",
        references: [],
        save: vi.fn(),
      };
      vi.spyOn(MediaAsset, "findById").mockResolvedValue(foreignAsset);

      const result = await mediaService.safeDelete("asset_abc", "vendor_123");
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/unauthorized/i);
      expect(foreignAsset.save).not.toHaveBeenCalled();
    });

    it("toggleFavorite rejects favorite toggle on another tenant's asset", async () => {
      const foreignAsset = {
        _id: "asset_abc",
        createdBy: "vendor_999",
        isFavorite: false,
        save: vi.fn(),
      };
      vi.spyOn(MediaAsset, "findById").mockResolvedValue(foreignAsset);

      const result = await mediaService.toggleFavorite("asset_abc", "vendor_123");
      expect(result).toBeNull();
      expect(foreignAsset.save).not.toHaveBeenCalled();
    });

    it("getMetrics isolates counts to the specific tenant when createdBy is passed", async () => {
      const aggregateSpy = vi.spyOn(MediaAsset, "aggregate").mockResolvedValue([
        { _id: "READY", count: 5 }
      ]);
      const countSpy = vi.spyOn(MediaAsset, "countDocuments").mockResolvedValue(5);

      const metrics = await mediaService.getMetrics("vendor_123");

      expect(aggregateSpy).toHaveBeenCalledWith(
        expect.arrayContaining([{ $match: { createdBy: "vendor_123" } }])
      );
      expect(countSpy).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: "vendor_123" })
      );
      expect(metrics.readyAssets).toBe(5);
    });
  });

  describe("albumService isolation", () => {
    it("createAlbum stores createdBy as string", async () => {
      const createSpy = vi.spyOn(MediaAlbum, "create").mockResolvedValue({
        _id: "album_1",
        name: "My Collection",
        createdBy: "vendor_123",
      });

      const album = await albumService.createAlbum({ name: "My Collection" }, "vendor_123");
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        name: "My Collection",
        createdBy: "vendor_123",
      }));
      expect(album.createdBy).toBe("vendor_123");
    });

    it("listAlbums matches createdBy in aggregation pipeline", async () => {
      const aggregateSpy = vi.spyOn(MediaAlbum, "aggregate").mockResolvedValue([]);

      await albumService.listAlbums("vendor_123");

      expect(aggregateSpy).toHaveBeenCalledWith(
        expect.arrayContaining([{ $match: { createdBy: "vendor_123" } }])
      );
    });

    it("getAlbum scopes by createdBy", async () => {
      const findOneSpy = vi.spyOn(MediaAlbum, "findOne").mockReturnValue({
        populate: vi.fn().mockResolvedValue({ _id: "album_1", createdBy: "vendor_123" }),
      });

      await albumService.getAlbum("album_1", "vendor_123");

      expect(findOneSpy).toHaveBeenCalledWith({ _id: "album_1", createdBy: "vendor_123" });
    });

    it("deleteAlbum scopes by createdBy and updates only tenant assets", async () => {
      vi.spyOn(MediaAlbum, "findOneAndDelete").mockResolvedValue({ _id: "album_1" });
      const updateManySpy = vi.spyOn(MediaAsset, "updateMany").mockResolvedValue({});

      await albumService.deleteAlbum("album_1", "vendor_123");

      expect(updateManySpy).toHaveBeenCalledWith(
        { albums: "album_1", createdBy: "vendor_123" },
        { $pull: { albums: "album_1" } }
      );
    });
  });
});
