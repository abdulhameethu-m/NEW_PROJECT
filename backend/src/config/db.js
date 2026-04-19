const mongoose = require("mongoose");
const { logger } = require("../utils/logger");

let isConnected = false;

async function connectDb() {
  if (isConnected) return;

  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = process.env.MONGODB_FALLBACK_URI || "mongodb://127.0.0.1:27017/amazon_likee";
  const connectOptions = {
    autoIndex: process.env.NODE_ENV !== "production",
    serverSelectionTimeoutMS: 5000,
  };

  mongoose.set("strictQuery", true);

  if (!primaryUri && !fallbackUri) {
    throw new Error("Missing MONGODB_URI and fallback MongoDB URI");
  }

  const stableApiOptions = {
    serverApi: {
      version: mongoose.mongo.ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  };

  const options = { ...connectOptions, ...stableApiOptions };

  try {
    const uri = primaryUri || fallbackUri;
    await mongoose.connect(uri, options);
    isConnected = true;
    logger.info(`MongoDB connected: ${uri.startsWith("mongodb+srv://") ? "Atlas" : "local"}`);
    return;
  } catch (primaryError) {
    logger.warn("Primary MongoDB connection failed", { error: primaryError.message });
    if (!primaryUri || primaryUri === fallbackUri) {
      throw primaryError;
    }

    try {
      await mongoose.connect(fallbackUri, connectOptions);
      isConnected = true;
      logger.info("MongoDB connected to fallback local database");
    } catch (fallbackError) {
      logger.error("Fallback MongoDB connection also failed", { error: fallbackError.message });
      throw fallbackError;
    }
  }
}

module.exports = { connectDb };

