const Redis = require("ioredis");
const logger = require("./logger"); // assuming logger exists, else fallback to console

let redisClient = null;

try {
  // Use Upstash Redis URL in production or local in development
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  // Create client, but avoid crashing if Redis is down (so app survives)
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        if (logger && logger.warn) {
          logger.warn("Redis connection retries exhausted. Disabling cache.");
        } else {
          console.warn("Redis connection retries exhausted. Disabling cache.");
        }
        return null; // Stop retrying
      }
      return Math.min(times * 50, 2000);
    },
  });

  redisClient.on("error", (err) => {
    if (logger && logger.error) {
      logger.error("Redis Error:", err.message);
    } else {
      console.error("Redis Error:", err.message);
    }
  });

  redisClient.on("connect", () => {
    if (logger && logger.info) {
      logger.info("Connected to Redis for caching");
    } else {
      console.log("Connected to Redis for caching");
    }
  });
} catch (error) {
  console.error("Failed to initialize Redis client:", error.message);
}

/**
 * Express middleware to cache responses.
 * @param {number} durationInSeconds - Cache duration in seconds
 * @param {function} keyGenerator - Optional function to generate a custom cache key from req
 */
const cacheMiddleware = (durationInSeconds = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    if (!redisClient || redisClient.status !== "ready") {
      // If Redis is not available, just continue without caching
      return next();
    }

    try {
      const key = keyGenerator ? keyGenerator(req) : `cache:${req.originalUrl}`;
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }

      // Intercept res.json to store the response in cache before sending
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful GET responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setex(key, durationInSeconds, JSON.stringify(body)).catch((err) => {
            console.error("Failed to set cache:", err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error.message);
      next(); // Continue even if cache fails
    }
  };
};

/**
 * Utility to clear specific cache keys manually.
 * @param {string} pattern - Redis key pattern (e.g., 'cache:/api/products*')
 */
const invalidateCache = async (pattern) => {
  if (!redisClient || redisClient.status !== "ready") return;
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error("Cache invalidation error:", error.message);
  }
};

module.exports = {
  redisClient,
  cacheMiddleware,
  invalidateCache,
};
