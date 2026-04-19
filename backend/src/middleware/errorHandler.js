const { AppError } = require("../utils/AppError");
const { logger } = require("../utils/logger");

function errorHandler(err, req, res, next) {
  // Multer / upload errors normalization
  if (err && err.code === "LIMIT_FILE_SIZE") {
    err = new AppError("File too large", 400, "FILE_SIZE");
  }
  if (err && err.message === "UNSUPPORTED_FILE_TYPE") {
    err = new AppError("Unsupported file type", 400, "FILE_TYPE");
  }

  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;

  const message =
    statusCode === 500
      ? "Something went wrong"
      : err.message || "Request failed";

  const payload = {
    success: false,
    message,
  };

  if (isAppError && err.details) payload.details = err.details;

  logger.error("Request error", {
    path: req.path,
    method: req.method,
    statusCode,
    message: err.message,
    stack: err.stack,
  });

  res.status(statusCode).json(payload);
}

module.exports = { errorHandler };

