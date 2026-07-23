const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const REEL_MAX_BYTES = Number(process.env.REEL_MAX_UPLOAD_BYTES || 100 * 1024 * 1024);
const REEL_UPLOAD_DIR = path.join(process.cwd(), "uploads", "public", "reels");

const ALLOWED_VIDEO = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_DOCUMENT = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const ALLOWED_VIDEO_EXT = new Set([".mp4", ".webm", ".mov", ".qt"]);
const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const ALLOWED_DOCUMENT_EXT = new Set([".pdf", ".doc", ".docx"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(REEL_UPLOAD_DIR, { recursive: true });
    cb(null, REEL_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".mp4";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});
const reelVideoUpload = multer({
  storage,
  limits: { fileSize: REEL_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_VIDEO.has(file.mimetype) || !ALLOWED_VIDEO_EXT.has(ext)) {
      return cb(new Error("UNSUPPORTED_VIDEO_TYPE"));
    }
    cb(null, true);
  },
});

const reelMediaUpload = multer({
  storage,
  limits: { fileSize: REEL_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (file.fieldname === "video" && ALLOWED_VIDEO.has(file.mimetype) && ALLOWED_VIDEO_EXT.has(ext)) return cb(null, true);
    if (file.fieldname === "thumbnail" && ALLOWED_IMAGE.has(file.mimetype) && ALLOWED_IMAGE_EXT.has(ext)) return cb(null, true);
    if (file.fieldname === "document" && ALLOWED_DOCUMENT.has(file.mimetype) && ALLOWED_DOCUMENT_EXT.has(ext)) return cb(null, true);
    if (file.fieldname === "document") return cb(new Error("UNSUPPORTED_DOCUMENT_TYPE"));
    return cb(new Error(file.fieldname === "thumbnail" ? "UNSUPPORTED_IMAGE_TYPE" : "UNSUPPORTED_VIDEO_TYPE"));
  },
});

function optionalReelVideoUpload(req, res, next) {
  const ct = String(req.headers["content-type"] || "");
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return next();
  }
  return reelVideoUpload.single("video")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "Video file is too large" });
    }
    if (String(err.message) === "UNSUPPORTED_VIDEO_TYPE") {
      return res.status(400).json({ success: false, message: "Unsupported video format. Use MP4, WebM, or MOV." });
    }
    return next(err);
  });
}

function optionalReelMediaUpload(req, res, next) {
  const ct = String(req.headers["content-type"] || "");
  if (!ct.toLowerCase().includes("multipart/form-data")) {
    return next();
  }
  return reelMediaUpload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 10 },
    { name: "document", maxCount: 1 },
  ])(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "Uploaded file is too large" });
    }
    if (String(err.message) === "UNSUPPORTED_IMAGE_TYPE") {
      return res.status(400).json({ success: false, message: "Unsupported thumbnail format. Use JPEG, PNG, WebP, or GIF." });
    }
    if (String(err.message) === "UNSUPPORTED_VIDEO_TYPE") {
      return res.status(400).json({ success: false, message: "Unsupported video format. Use MP4, WebM, or MOV." });
    }
    if (String(err.message) === "UNSUPPORTED_DOCUMENT_TYPE") {
      return res.status(400).json({ success: false, message: "Unsupported document format. Use PDF, DOC, or DOCX." });
    }
    return next(err);
  });
}

module.exports = { optionalReelVideoUpload, optionalReelMediaUpload, REEL_UPLOAD_DIR };
