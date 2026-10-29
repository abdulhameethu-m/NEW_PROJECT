const axios = require("axios");
const { Notification } = require("../models/Notification");
const { User } = require("../models/User");
const { logger } = require("./logger");

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Validate if a token is a valid Expo push token format
 */
function isExpoPushToken(token) {
  return typeof token === "string" && (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));
}

/**
 * Send raw push notifications via Expo Push API
 */
async function sendExpoPushNotifications(messages = []) {
  if (!messages.length) return [];

  try {
    const response = await axios.post(EXPO_PUSH_URL, messages, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const receipts = response.data?.data || [];
    logger.info("Expo push notifications dispatched", { count: messages.length, receiptsCount: receipts.length });
    return receipts;
  } catch (error) {
    logger.error("Failed to dispatch Expo push notifications", {
      error: error?.response?.data || error.message,
    });
    return [];
  }
}

/**
 * Create an in-app notification record and send push notification if tokens exist
 */
async function sendCustomerNotification(userId, { type = "SYSTEM", title, message, data = {}, sendPush = true }) {
  try {
    // 1. Create in-app notification record
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
    });

    // 2. Dispatch push notification if requested
    if (sendPush) {
      const user = await User.findById(userId).select("pushTokens preferences");
      const pushEnabled = user?.preferences?.notificationPreferences?.channels?.push !== false;

      if (pushEnabled && user?.pushTokens && user.pushTokens.length > 0) {
        const validTokens = user.pushTokens.map((p) => p.token).filter(isExpoPushToken);

        if (validTokens.length > 0) {
          const messages = validTokens.map((token) => ({
            to: token,
            sound: "default",
            title,
            body: message,
            data: {
              ...data,
              notificationId: String(notification._id),
              type,
            },
            badge: 1,
            channelId: "default",
          }));

          sendExpoPushNotifications(messages).catch((err) => {
            logger.warn("Async push notification dispatch error", { err: err.message });
          });
        }
      }
    }

    return notification;
  } catch (err) {
    logger.error("Error sending customer notification", { userId, error: err.message });
    return null;
  }
}

module.exports = {
  isExpoPushToken,
  sendExpoPushNotifications,
  sendCustomerNotification,
};
