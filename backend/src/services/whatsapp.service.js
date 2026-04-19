const twilio = require("twilio");
const { logger } = require("../utils/logger");

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "").trim();
}

function formatWhatsAppRecipient(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return "";

  // Default to India when only a local 10-digit mobile number is stored.
  if (normalized.length === 10) {
    return `whatsapp:+91${normalized}`;
  }

  if (normalized.startsWith("91") && normalized.length === 12) {
    return `whatsapp:+${normalized}`;
  }

  return `whatsapp:+${normalized}`;
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are not configured");
  }

  return twilio(accountSid, authToken);
}

async function sendWhatsAppMessage(phone, message) {
  if (!phone) return null;

  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!from) {
    throw new Error("TWILIO_WHATSAPP_NUMBER is not configured");
  }

  const to = formatWhatsAppRecipient(phone);
  if (!to) {
    throw new Error("Recipient phone number is invalid");
  }

  const client = getTwilioClient();
  return await client.messages.create({
    from,
    to,
    body: String(message || "").trim(),
  });
}

async function sendWhatsAppTemplateMessage(phone, { contentSid, contentVariables = {} } = {}) {
  if (!phone) return null;

  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!from) {
    throw new Error("TWILIO_WHATSAPP_NUMBER is not configured");
  }

  if (!contentSid) {
    throw new Error("Twilio contentSid is required for template WhatsApp messages");
  }

  const to = formatWhatsAppRecipient(phone);
  if (!to) {
    throw new Error("Recipient phone number is invalid");
  }

  const client = getTwilioClient();
  return await client.messages.create({
    from,
    to,
    contentSid,
    contentVariables: JSON.stringify(contentVariables),
  });
}

async function sendShipmentNotification(phone, payload) {
  if (payload && typeof payload === "object" && payload.contentSid) {
    try {
      return await sendWhatsAppTemplateMessage(phone, payload);
    } catch (error) {
      if (payload.fallbackBody) {
        logger.warn("Twilio template send failed, falling back to plain WhatsApp body", {
          error: error.message,
          contentSid: payload.contentSid,
        });
        return await sendWhatsAppMessage(phone, payload.fallbackBody);
      }
      throw error;
    }
  }

  return await sendWhatsAppMessage(phone, payload);
}

function queueWhatsAppMessage(phone, payload, context = {}, hooks = {}) {
  setImmediate(async () => {
    try {
      const result = await sendShipmentNotification(phone, payload);
      logger.info("WhatsApp shipment notification sent", {
        ...context,
        sid: result?.sid,
      });

      if (typeof hooks.onSuccess === "function") {
        await hooks.onSuccess(result);
      }
    } catch (error) {
      logger.error("WhatsApp shipment notification failed", {
        ...context,
        error: error.message,
      });

      if (typeof hooks.onError === "function") {
        await hooks.onError(error);
      }
    }
  });
}

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppTemplateMessage,
  sendShipmentNotification,
  queueWhatsAppMessage,
  formatWhatsAppRecipient,
};
