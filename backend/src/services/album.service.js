// album.service.js
const { MediaAlbum } = require("../models/MediaAlbum");
const { MediaAsset } = require("../models/MediaAsset");

async function createAlbum(data, createdBy) {
  const album = await MediaAlbum.create({
    name: data.name,
    description: data.description,
    createdBy,
  });
  return album;
}

async function listAlbums() {
  // Sort albums by most recently created
  const albums = await MediaAlbum.find().sort({ createdAt: -1 });
  return albums;
}

async function getAlbum(id) {
  const album = await MediaAlbum.findById(id).populate("coverImage");
  if (!album) throw new Error("Album not found");
  return album;
}

async function updateAlbum(id, data) {
  const album = await MediaAlbum.findByIdAndUpdate(id, data, { new: true });
  if (!album) throw new Error("Album not found");
  return album;
}

async function deleteAlbum(id) {
  // Delete the album
  const album = await MediaAlbum.findByIdAndDelete(id);
  if (!album) throw new Error("Album not found");

  // Remove this album from any assets that reference it
  await MediaAsset.updateMany({ albums: id }, { $pull: { albums: id } });

  return album;
}

module.exports = {
  createAlbum,
  listAlbums,
  getAlbum,
  updateAlbum,
  deleteAlbum,
};
