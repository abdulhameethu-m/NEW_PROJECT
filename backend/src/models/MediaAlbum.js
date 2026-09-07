const { Schema, model } = require("mongoose");

const MediaAlbumSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    coverImage: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    assetCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for fast searching
MediaAlbumSchema.index({ name: "text", description: "text" });

module.exports = { MediaAlbum: model("MediaAlbum", MediaAlbumSchema) };
