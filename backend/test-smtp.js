/**
 * Test SMTP Connection with Gmail
 * 
 * Usage: node test-smtp.js
 * 
 * This script tests if your Gmail SMTP credentials are working correctly.
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n========================================');
console.log('🔍 Testing Gmail SMTP Configuration');
console.log('========================================\n');

// Get SMTP credentials from .env
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true' ? true : false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
};

// Validate credentials exist
if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
  console.error('❌ ERROR: Missing SMTP credentials in .env');
  console.log('\nMake sure your .env file contains:');
  console.log('  SMTP_HOST=smtp.gmail.com');
  console.log('  SMTP_PORT=587');
  console.log('  SMTP_SECURE=false');
  console.log('  SMTP_USER=your-email@gmail.com');
  console.log('  SMTP_PASSWORD=your-app-password');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log(`  Host: ${smtpConfig.host}`);
console.log(`  Port: ${smtpConfig.port}`);
console.log(`  Secure: ${smtpConfig.secure}`);
console.log(`  User: ${smtpConfig.auth.user}`);
console.log(`  Password: ${smtpConfig.auth.pass.substring(0, 4)}****`);
console.log('\n⏳ Testing connection...\n');

// Create transporter
const transporter = nodemailer.createTransport(smtpConfig);

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection Failed!');
    console.error('\nError:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('Invalid login credentials')) {
      console.log('\n💡 Troubleshooting:');
      console.log('  1. Are you using your Gmail password or App Password?');
      console.log('     → Use the 16-character App Password, not your Gmail password');
      console.log('  2. Is 2-Factor Authentication enabled?');
      console.log('     → Enable at: myaccount.google.com → Security → 2-Step Verification');
      console.log('  3. Is the app password generated?');
      console.log('     → Go to: myaccount.google.com → Security → App passwords');
    } else if (error.message.includes('Application-specific password required')) {
      console.log('\n💡 Fix: Enable 2-Factor Authentication first');
      console.log('  https://myaccount.google.com → Security → 2-Step Verification');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Fix: Check your internet connection or firewall settings');
    }
    
    console.log('\n' + '='.repeat(40));
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection Successful!\n');
    console.log('📧 Now testing to send a test email...\n');
    
    // Send test email
    sendTestEmail(transporter);
  }
});

/**
 * Send a test email
 */
function sendTestEmail(transporter) {
  const mailOptions = {
    from: `"${process.env.SMTP_FROM_NAME || 'GRM Platform'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: process.env.SMTP_USER,  // Send to self
    subject: '✅ Test Email from GRM Platform - SMTP Working!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; border-radius: 4px;">
          <h2 style="color: #0369a1; margin: 0 0 10px 0;">✅ SMTP Configuration Working!</h2>
          <p style="color: #0c4a6e; margin: 0;">
            Your Gmail SMTP is correctly configured and can send emails to users.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background-color: #f5f5f5; border-radius: 4px;">
          <h3 style="color: #333; margin-top: 0;">Configuration Details:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
            <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
            <li><strong>From Name:</strong> ${process.env.SMTP_FROM_NAME || 'GRM Platform'}</li>
            <li><strong>From Email:</strong> ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}</li>
            <li><strong>OTP Expiry:</strong> ${process.env.OTP_EXPIRY_MINUTES || 10} minutes</li>
          </ul>
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
          <h3 style="color: #15803d; margin-top: 0;">✅ Next Steps:</h3>
          <ol style="color: #166534; line-height: 2;">
            <li>Test the password reset flow with a real email</li>
            <li>Check if OTP arrives in less than 30 seconds</li>
            <li>Verify emails don't go to spam folder</li>
            <li>Deploy to production when ready</li>
          </ol>
        </div>
        
        <div style="margin-top: 30px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
          <p style="color: #92400e; margin: 0;">
            <strong>⚠️ Security Tip:</strong> This test email is being sent to your SMTP user account. 
            Check your inbox to confirm delivery. If it goes to spam, mark it as "Not Spam" to improve delivery.
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
          <p>Sent from: ${process.env.SMTP_USER}</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `,
    text: `
SMTP Configuration Working!

Your Gmail SMTP is correctly configured and can send emails to users.

Configuration Details:
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}
- From Email: ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}
- OTP Expiry: ${process.env.OTP_EXPIRY_MINUTES || 10} minutes

Next Steps:
1. Test the password reset flow with a real email
2. Check if OTP arrives in less than 30 seconds
3. Verify emails don't go to spam folder
4. Deploy to production when ready

Security Tip: This test email is being sent to your SMTP user account. 
Check your inbox to confirm delivery.
    `
  };
  
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Failed to Send Test Email!');
      console.error('\nError:', error.message);
      console.log('\n' + '='.repeat(40));
      process.exit(1);
    } else {
      console.log('✅ Test Email Sent Successfully!\n');
      console.log('📬 Message Details:');
      console.log(`  Message ID: ${info.messageId}`);
      console.log(`  Response: ${info.response}`);
      console.log('\n💼 Email should arrive at:');
      console.log(`  ${process.env.SMTP_USER}\n`);
      
      console.log('📋 What to Check:');
      console.log('  1. Check your inbox for the test email');
      console.log('  2. If in spam folder, mark as "Not Spam"');
      console.log('  3. Verify sender shows correctly');
      console.log('  4. Configuration is correct!\n');
      
      console.log('🚀 Ready to Deploy:');
      console.log('  Your SMTP configuration is working correctly.');
      console.log('  You can now send OTPs to real users in production.\n');
      
      console.log('='.repeat(40));
      process.exit(0);
    }
  });
}
