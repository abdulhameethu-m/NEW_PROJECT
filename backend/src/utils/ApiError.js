const { AppError } = require("./AppError");

class ApiError extends AppError {
  constructor(statusCode = 500, message = "Internal Server Error", code = "API_ERROR", details) {
    super(message, statusCode, code, details);
  }
}

module.exports = { ApiError };