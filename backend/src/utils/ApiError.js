class ApiError extends Error {
  constructor(statusCode = 500, message = "Internal Server Error", code = "API_ERROR", details) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.code = code;
    this.details = details;
  }
}

module.exports = { ApiError };
