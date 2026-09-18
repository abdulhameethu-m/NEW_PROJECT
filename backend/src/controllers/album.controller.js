const albumService = require("../services/album.service");
const { asyncHandler } = require("../utils/asyncHandler");

const createAlbum = asyncHandler(async (req, res) => {
  const createdBy = req.user?.role === "vendor" ? req.user.sub : (req.user?._id || req.user?.sub || "admin");
  const album = await albumService.createAlbum(req.body, createdBy);
  res.status(201).json({ success: true, album });
});

const listAlbums = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const albums = await albumService.listAlbums(createdBy);
  res.json({ success: true, albums });
});

const getAlbum = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const album = await albumService.getAlbum(req.params.id, createdBy);
  res.json({ success: true, album });
});

const updateAlbum = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  const album = await albumService.updateAlbum(req.params.id, req.body, createdBy);
  res.json({ success: true, album });
});

const deleteAlbum = asyncHandler(async (req, res) => {
  const isVendor = req.user?.role === "vendor";
  const createdBy = isVendor ? req.user.sub : undefined;
  await albumService.deleteAlbum(req.params.id, createdBy);
  res.json({ success: true, message: "Album deleted successfully" });
});

module.exports = {
  createAlbum,
  listAlbums,
  getAlbum,
  updateAlbum,
  deleteAlbum,
};
