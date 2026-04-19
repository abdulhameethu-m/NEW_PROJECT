function ok(res, data = {}, message = "OK") {
  return res.json({ success: true, message, data });
}

function fail(res, statusCode, message, details) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}

module.exports = { ok, fail };

