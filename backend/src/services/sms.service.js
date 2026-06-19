/**
 * SMS Service for OTP delivery
 * Supports Twilio for SMS sending
 */

/**
 * Send OTP via SMS for password reset
 * @param {string} phoneNumber - Recipient phone number (10 digits)
 * @param {string} otp - OTP code
 * @param {string} userName - User name for personalization
 * @returns {Promise<void>}
 */
async function sendPasswordResetOTP(phoneNumber, otp, userName = "User") {
  try {
    // Check if SMS is configured
    if (!process.env.SMS_PROVIDER || !process.env.TWILIO_SMS_ACCOUNT_SID || !process.env.TWILIO_SMS_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.warn("SMS provider not configured. Skipping SMS send.");
      return;
    }

    if (process.env.SMS_PROVIDER === "twilio") {
      await sendViaTwilio(phoneNumber, otp, userName);
    } else if (process.env.SMS_PROVIDER === "aws") {
      // Add AWS SNS implementation if needed
      console.warn("AWS SMS provider not yet implemented");
    } else {
      console.warn(`Unknown SMS provider: ${process.env.SMS_PROVIDER}`);
    }
  } catch (error) {
    console.error("Failed to send OTP SMS:", error.message);
    // Don't throw error, let the process continue
    // User can try again
  }
}

/**
 * Send SMS via Twilio
 * @private
 */
async function sendViaTwilio(phoneNumber, otp, userName) {
  try {
    // Dynamically require twilio only if it's configured
    const twilio = require("twilio");
    
    const client = twilio(
      process.env.TWILIO_SMS_ACCOUNT_SID,
      process.env.TWILIO_SMS_AUTH_TOKEN
    );

    const message = `Hi ${userName}, your GRM Platform password reset OTP is: ${otp}. This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share this code with anyone.`;

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phoneNumber}`, // Assuming India, adjust country code as needed
    });

    console.log(`OTP SMS sent successfully to ${phoneNumber}`);
  } catch (error) {
    console.error("Twilio SMS error:", error.message);
    throw error;
  }
}

/**
 * Send welcome SMS
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} userName - User name
 * @returns {Promise<void>}
 */
async function sendWelcomeSMS(phoneNumber, userName = "User") {
  try {
    if (!process.env.SMS_PROVIDER || !process.env.TWILIO_SMS_ACCOUNT_SID) {
      console.warn("SMS provider not configured. Skipping SMS send.");
      return;
    }

    if (process.env.SMS_PROVIDER === "twilio") {
      const twilio = require("twilio");
      const client = twilio(
        process.env.TWILIO_SMS_ACCOUNT_SID,
        process.env.TWILIO_SMS_AUTH_TOKEN
      );

      const message = `Welcome ${userName}! Your account on GRM Platform has been created successfully.`;

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${phoneNumber}`,
      });
    }
  } catch (error) {
    console.error("Failed to send welcome SMS:", error.message);
  }
}

/**
 * Send generic SMS
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} message - SMS message content
 * @returns {Promise<void>}
 */
async function sendSMS(phoneNumber, message) {
  try {
    if (!process.env.SMS_PROVIDER || !process.env.TWILIO_SMS_ACCOUNT_SID) {
      console.warn("SMS provider not configured. Skipping SMS send.");
      return;
    }

    if (process.env.SMS_PROVIDER === "twilio") {
      const twilio = require("twilio");
      const client = twilio(
        process.env.TWILIO_SMS_ACCOUNT_SID,
        process.env.TWILIO_SMS_AUTH_TOKEN
      );

      await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${phoneNumber}`,
      });

      console.log(`SMS sent successfully to ${phoneNumber}`);
    }
  } catch (error) {
    console.error("Failed to send SMS:", error.message);
  }
}

module.exports = {
  sendPasswordResetOTP,
  sendWelcomeSMS,
  sendSMS,
};
