const multer = require("multer");
const { ALLOWED_MIME, MAX_FILE_SIZE } = require("../utils/upload");

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error("UNSUPPORTED_FILE_TYPE"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { upload };

