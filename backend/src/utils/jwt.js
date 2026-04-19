const jwt = require("jsonwebtoken");

function signAccessToken(user) {
  const payload = {
    sub: String(user._id),
    role: user.role,
    email: user.email,
  };

  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn });
}

function signRefreshToken({ user, sessionId }) {
  const payload = {
    sub: String(user._id),
    sid: String(sessionId),
    role: user.role,
  };

  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
