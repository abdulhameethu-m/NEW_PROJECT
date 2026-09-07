const albumService = require("../services/album.service");
const { asyncHandler } = require("../utils/asyncHandler");

const createAlbum = asyncHandler(async (req, res) => {
  const createdBy = req.user?._id || req.user?.sub || "admin";
  const album = await albumService.createAlbum(req.body, createdBy);
  res.status(201).json({ success: true, album });
});

const listAlbums = asyncHandler(async (req, res) => {
  const albums = await albumService.listAlbums();
  res.json({ success: true, albums });
});

const getAlbum = asyncHandler(async (req, res) => {
  const album = await albumService.getAlbum(req.params.id);
  res.json({ success: true, album });
});

const updateAlbum = asyncHandler(async (req, res) => {
  const album = await albumService.updateAlbum(req.params.id, req.body);
  res.json({ success: true, album });
});

const deleteAlbum = asyncHandler(async (req, res) => {
  await albumService.deleteAlbum(req.params.id);
  res.json({ success: true, message: "Album deleted successfully" });
});

module.exports = {
  createAlbum,
  listAlbums,
  getAlbum,
  updateAlbum,
  deleteAlbum,
};
