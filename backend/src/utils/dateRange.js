const { AppError } = require("./AppError");

function parseDateValue(value, label) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`Invalid ${label}`, 400, "VALIDATION_ERROR");
  }
  return parsed;
}

function normalizeDateRange({ startDate, endDate } = {}) {
  const parsedStart = parseDateValue(startDate, "startDate");
  const parsedEnd = parseDateValue(endDate, "endDate");

  if (!parsedStart && !parsedEnd) {
    return null;
  }

  const range = {};
  if (parsedStart) {
    parsedStart.setHours(0, 0, 0, 0);
    range.$gte = parsedStart;
  }
  if (parsedEnd) {
    parsedEnd.setHours(23, 59, 59, 999);
    range.$lte = parsedEnd;
  }

  if (range.$gte && range.$lte && range.$gte > range.$lte) {
    throw new AppError("startDate cannot be after endDate", 400, "VALIDATION_ERROR");
  }

  return range;
}

function applyDateRange(query, range, field = "createdAt") {
  if (!range) return query;
  query[field] = range;
  return query;
}

module.exports = {
  normalizeDateRange,
  applyDateRange,
};
