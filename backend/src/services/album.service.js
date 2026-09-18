// album.service.js
const { MediaAlbum } = require("../models/MediaAlbum");
const { MediaAsset } = require("../models/MediaAsset");

async function createAlbum(data, createdBy) {
  const album = await MediaAlbum.create({
    name: data.name,
    description: data.description,
    createdBy: String(createdBy),
  });
  return album;
}

async function listAlbums(createdBy = null) {
  // Aggregate albums with accurate live asset counts from MediaAsset
  const albums = await MediaAlbum.aggregate([
    ...(createdBy ? [{ $match: { createdBy: String(createdBy) } }] : []),
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "mediaassets",
        let: { albumId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$$albumId", { $ifNull: ["$albums", []] }] },
                  { $ne: ["$status", "DELETED"] },
                  ...(createdBy ? [{ $eq: ["$createdBy", String(createdBy)] }] : [])
                ]
              }
            }
          },
          { $count: "count" }
        ],
        as: "stats"
      }
    },
    {
      $addFields: {
        assetCount: {
          $ifNull: [{ $arrayElemAt: ["$stats.count", 0] }, 0]
        }
      }
    },
    { $project: { stats: 0 } }
  ]);
  return albums;
}

async function getAlbum(id, createdBy = null) {
  const filter = { _id: id };
  if (createdBy) filter.createdBy = String(createdBy);
  const album = await MediaAlbum.findOne(filter).populate("coverImage");
  if (!album) throw new Error("Album not found");
  return album;
}

async function updateAlbum(id, data, createdBy = null) {
  const filter = { _id: id };
  if (createdBy) filter.createdBy = String(createdBy);
  const album = await MediaAlbum.findOneAndUpdate(filter, data, { new: true });
  if (!album) throw new Error("Album not found");
  return album;
}

async function deleteAlbum(id, createdBy = null) {
  const filter = { _id: id };
  if (createdBy) filter.createdBy = String(createdBy);
  // Delete the album
  const album = await MediaAlbum.findOneAndDelete(filter);
  if (!album) throw new Error("Album not found");

  // Remove this album from any assets that reference it
  const assetFilter = { albums: id };
  if (createdBy) assetFilter.createdBy = String(createdBy);
  await MediaAsset.updateMany(assetFilter, { $pull: { albums: id } });

  return album;
}

module.exports = {
  createAlbum,
  listAlbums,
  getAlbum,
  updateAlbum,
  deleteAlbum,
};
