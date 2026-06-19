const nodemailer = require("nodemailer");

// Initialize SMTP transporter
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/**
 * Send OTP via email for password reset
 * @param {string} email - Recipient email
 * @param {string} otp - OTP code
 * @param {string} userName - User name for personalization
 * @returns {Promise<void>}
 */
async function sendPasswordResetOTP(email, otp, userName = "User") {
  try {
    const transporter = getTransporter();

    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn("SMTP credentials not configured. Skipping email send.");
      return;
    }

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "GRM Platform"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Password Reset Code - GRM Platform",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
            
            <p style="color: #666; font-size: 14px;">Hi ${userName},</p>
            
            <p style="color: #666; font-size: 14px;">
              You requested a password reset for your GRM Platform account. 
              Use the OTP code below to proceed with resetting your password.
            </p>
            
            <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #007bff;">
              <p style="margin: 0; font-size: 12px; color: #999;">Verification Code</p>
              <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${otp}</p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.
            </p>
            
            <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 20px;">
              If you didn't request this reset, please ignore this email or contact support immediately.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 10px;">
              <strong>Security Tip:</strong> Never share this code with anyone. GRM Platform support staff will never ask for it.
            </p>
          </div>
        </div>
      `,
      text: `
Password Reset Request for Your GRM Platform Account

Hi ${userName},

You requested a password reset for your GRM Platform account. Use the OTP code below:

${otp}

This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.

If you didn't request this reset, please ignore this email.

Best regards,
GRM Platform Support Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset OTP email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending password reset OTP email:", error.message);
    throw error;
  }
}

/**
 * Send welcome email
 * @param {string} email - Recipient email
 * @param {string} userName - User name
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail(email, userName = "User") {
  try {
    const transporter = getTransporter();

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn("SMTP credentials not configured. Skipping email send.");
      return;
    }

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "GRM Platform"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject: "Welcome to GRM Platform!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; text-align: center;">Welcome to GRM Platform</h2>
            
            <p style="color: #666; font-size: 14px;">Hi ${userName},</p>
            
            <p style="color: #666; font-size: 14px;">
              Thank you for joining GRM Platform! We're excited to have you on board.
            </p>
            
            <p style="color: #666; font-size: 14px;">
              You can now log in to your account and start exploring all the features we have to offer.
            </p>
            
            <p style="color: #999; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 20px;">
              If you have any questions, feel free to contact our support team.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending welcome email:", error.message);
    throw error;
  }
}

/**
 * Send generic email
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content
 * @returns {Promise<void>}
 */
async function sendEmail(email, subject, htmlContent) {
  try {
    const transporter = getTransporter();

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn("SMTP credentials not configured. Skipping email send.");
      return;
    }

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "GRM Platform"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: email,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw error;
  }
}

module.exports = {
  sendPasswordResetOTP,
  sendWelcomeEmail,
  sendEmail,
  getTransporter,
};
