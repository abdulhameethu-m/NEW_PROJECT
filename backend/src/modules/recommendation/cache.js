const { redisClient } = require("../../utils/cache");

async function getJson(key) {
  if (!redisClient || redisClient.status !== "ready") return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Cache get error:", error.message);
    return null;
  }
}

async function setJson(key, value, ttlSeconds = 3600) {
  if (!redisClient || redisClient.status !== "ready") return;
  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error("Cache set error:", error.message);
  }
}

async function clearByPrefixes(prefixes = []) {
  if (!redisClient || redisClient.status !== "ready" || !prefixes.length) return;
  try {
    for (const prefix of prefixes) {
      const keys = await redisClient.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }
  } catch (error) {
    console.error("Cache clear error:", error.message);
  }
}

module.exports = {
  getJson,
  setJson,
  clearByPrefixes,
};