const { AppError } = require("../../utils/AppError");

class TrackingSecurityService {
  async evaluateEvent(req, eventType) {
    return {
      status: "allowed",
      counted: true,
      tracked: true,
      reason: "passed",
      fraudScore: 0,
      fraudLevel: "low",
    };
  }
}

module.exports = new TrackingSecurityService();
