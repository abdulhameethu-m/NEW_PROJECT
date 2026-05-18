const mongoose = require("mongoose");
const { logger } = require("./logger");

async function withOptionalTransaction(work, { source = "transaction" } = {}) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (error) {
    const message = String(error?.message || "");
    if (
      message.includes("Transaction numbers are only allowed") ||
      message.includes("replica set") ||
      message.includes("standalone")
    ) {
      logger.warn("Mongo transaction unavailable, falling back to non-transactional flow", { source });
      return await work(null);
    }
    throw error;
  } finally {
    await session.endSession().catch(() => {});
  }
}

module.exports = {
  withOptionalTransaction,
};
