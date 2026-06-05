// ============================================
// EMAIL SERVICE — Nodemailer + Brevo SMTP
// ============================================
// Provides email sending functionality for the entire application.
//
// Functions:
//   1. sendOTP(email, otp, name)       — Send OTP verification code
//   2. sendWelcomeEmail(email, name, role) — Welcome email after registration
//   3. sendJobAlert(email, name, jobDetails) — Alert mechanic about new job
//
// SMTP: Brevo (smtp-relay.brevo.com:587)
// Fallback: Ethereal test account (for development without SMTP creds)

const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// ============================================
// TRANSPORTER SETUP
// ============================================

/**
 * Create and return the Nodemailer transporter.
 * Uses Brevo SMTP if credentials are present, otherwise falls back to Ethereal.
 *
 * @returns {Promise<import('nodemailer').Transporter>} Nodemailer transporter instance
 */
const createTransporter = async () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: Ethereal test account for development
  logger.warn('No SMTP credentials found in .env, using Ethereal test account');
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

/**
 * Get the "from" address for outgoing emails.
 *
 * @returns {string} The from address string
 */
const getFromAddress = () => {
  return process.env.SMTP_FROM || `"Roadside Assistant" <${process.env.SMTP_USER || 'noreply@roadassist.com'}>`;
};

// ============================================
// FUNCTION 1: SEND OTP
// ============================================

/**
 * Send an OTP verification code via email.
 *
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - Recipient's name for personalization
 * @returns {Promise<{success: boolean}>} Success status
 * @throws {Error} If email sending fails
 */
const sendOTP = async (email, otp, name) => {
  try {
    const transporter = await createTransporter();

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f4f7f6;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }
        .header {
          background: linear-gradient(135deg, #FF8C00 0%, #FFA500 50%, #FFD700 100%);
          padding: 40px 20px;
          text-align: center;
          color: white;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          margin: 0;
          letter-spacing: 1px;
        }
        .content {
          padding: 40px 30px;
          text-align: center;
          color: #333333;
        }
        .greeting {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #1a202c;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          color: #4a5568;
          margin-bottom: 30px;
        }
        .otp-container {
          background: linear-gradient(135deg, #FFF8F0 0%, #FFF3E0 100%);
          border: 2px dashed #FF8C00;
          border-radius: 16px;
          padding: 24px;
          margin: 30px 0;
        }
        .otp-code {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: 12px;
          color: #FF6B35;
          margin: 0;
          font-family: 'Courier New', monospace;
        }
        .expiry {
          font-size: 14px;
          color: #e53e3e;
          margin-top: 16px;
          font-weight: 600;
        }
        .warning {
          margin-top: 30px;
          font-size: 13px;
          color: #718096;
          background-color: #f7fafc;
          border-radius: 8px;
          padding: 12px 16px;
          border-left: 4px solid #e2e8f0;
        }
        .footer {
          background-color: #f8fafc;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: #a0aec0;
          border-top: 1px solid #e2e8f0;
        }
        .footer .team {
          font-weight: 600;
          color: #FF6B35;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚗</div>
          <h1 class="title">Roadside Assistant</h1>
        </div>
        <div class="content">
          <div class="greeting">Hi ${name || 'there'},</div>
          <div class="message">
            Use the following verification code to complete your action.
            Please do not share this code with anyone.
          </div>

          <div class="otp-container">
            <p class="otp-code">${otp}</p>
          </div>

          <p class="expiry">⏰ This OTP expires in <strong>15 minutes</strong></p>

          <div class="warning">
            If you didn't request this code, you can safely ignore this email.
            Someone might have entered your email address by mistake.
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} <span class="team">Roadside Assistant Team</span>. All rights reserved.</p>
          <p>Need help? Contact us at support@roadassist.com</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: 'Your Roadside Assistant Verification Code',
      text: `Hi ${name || 'there'}, your verification code is: ${otp}. It expires in 15 minutes. Do not share this code.`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}, messageId: ${info.messageId}`);

    // Log Ethereal preview URL in development
    if (!process.env.SMTP_USER) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Ethereal preview URL: ${previewUrl}`);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error(`Failed to send OTP email to ${email}: ${error.message}`);
    throw error;
  }
};

// ============================================
// FUNCTION 2: SEND WELCOME EMAIL
// ============================================

/**
 * Send a welcome email after successful registration.
 *
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient's full name
 * @param {string} role - User role: 'user' or 'mechanic'
 * @returns {Promise<{success: boolean}>} Success status
 * @throws {Error} If email sending fails
 */
const sendWelcomeEmail = async (email, name, role) => {
  try {
    const transporter = await createTransporter();

    const isUser = role === 'user';
    const roleMessage = isUser
      ? `
        <p style="font-size:16px; color:#4a5568; line-height:1.6;">
          You can now <strong>request roadside assistance</strong> anytime, anywhere.
          Whether it's a flat tire, dead battery, or engine trouble — help is just a tap away!
        </p>
        <div style="background:#f0fff4; border-radius:12px; padding:16px; margin:20px 0; border-left:4px solid #48bb78;">
          <p style="margin:0; color:#2d3748; font-size:14px;">
            <strong>🚀 Quick Start:</strong><br/>
            1. Add your vehicle details<br/>
            2. Set your location when you need help<br/>
            3. Choose the service you need<br/>
            4. A nearby mechanic will be on their way!
          </p>
        </div>
      `
      : `
        <p style="font-size:16px; color:#4a5568; line-height:1.6;">
          Welcome to the <strong>Roadside Assistant Mechanic Network!</strong>
          You're one step closer to earning by helping people in need.
        </p>
        <div style="background:#fffff0; border-radius:12px; padding:16px; margin:20px 0; border-left:4px solid #ecc94b;">
          <p style="margin:0; color:#2d3748; font-size:14px;">
            <strong>⚙️ Verification Process:</strong><br/>
            1. Complete your mechanic profile<br/>
            2. Upload required documents (Aadhar, license)<br/>
            3. Our team will verify your credentials<br/>
            4. Once verified, you'll start receiving job requests!
          </p>
        </div>
        <p style="font-size:14px; color:#718096; margin-top:16px;">
          <strong>Note:</strong> You will be able to accept job requests only after your profile is verified by our team.
          This usually takes 24-48 hours.
        </p>
      `;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family:'Inter','Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f4f7f6; margin:0; padding:0;">
      <div style="max-width:600px; margin:40px auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg, #FF8C00 0%, #FFA500 50%, #FFD700 100%); padding:40px 20px; text-align:center; color:white;">
          <div style="font-size:48px; margin-bottom:10px;">🚗</div>
          <h1 style="font-size:28px; font-weight:bold; margin:0; letter-spacing:1px;">Welcome to Roadside Assistant!</h1>
        </div>
        <div style="padding:40px 30px; color:#333333;">
          <h2 style="font-size:22px; font-weight:700; color:#1a202c; margin-bottom:8px;">
            Hey ${name}! 🎉
          </h2>
          <p style="font-size:16px; color:#4a5568; margin-bottom:24px;">
            Your account has been created successfully as a <strong style="color:#FF6B35; text-transform:capitalize;">${role}</strong>.
          </p>
          ${roleMessage}
        </div>
        <div style="background-color:#f8fafc; padding:24px; text-align:center; font-size:13px; color:#a0aec0; border-top:1px solid #e2e8f0;">
          <p>&copy; ${new Date().getFullYear()} <span style="font-weight:600; color:#FF6B35;">Roadside Assistant Team</span>. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: 'Welcome to Roadside Assistant!',
      text: `Hi ${name}, welcome to Roadside Assistant! Your account as a ${role} has been created successfully.`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email} (${role}), messageId: ${info.messageId}`);

    if (!process.env.SMTP_USER) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Ethereal preview URL: ${previewUrl}`);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error(`Failed to send welcome email to ${email}: ${error.message}`);
    throw error;
  }
};

// ============================================
// FUNCTION 3: SEND JOB ALERT
// ============================================

/**
 * Send a job alert email to a mechanic about a new nearby service request.
 *
 * @param {string} email - Mechanic's email address
 * @param {string} name - Mechanic's name
 * @param {Object} jobDetails - Job information
 * @param {string} jobDetails.serviceType - Type of service requested
 * @param {string} jobDetails.locationArea - Approximate location/area
 * @param {string} jobDetails.distance - Distance from mechanic (e.g. "2.5 km")
 * @param {string} [jobDetails.description] - User's description of the issue
 * @param {string} [jobDetails.vehicleInfo] - Vehicle details (make, model)
 * @returns {Promise<{success: boolean}>} Success status
 * @throws {Error} If email sending fails
 */
const sendJobAlert = async (email, name, jobDetails) => {
  try {
    const transporter = await createTransporter();

    const { serviceType, locationArea, distance, description, vehicleInfo } = jobDetails;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family:'Inter','Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f4f7f6; margin:0; padding:0;">
      <div style="max-width:600px; margin:40px auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg, #e53e3e 0%, #FF6B35 100%); padding:30px 20px; text-align:center; color:white;">
          <div style="font-size:40px; margin-bottom:8px;">🔔</div>
          <h1 style="font-size:24px; font-weight:bold; margin:0;">New Job Alert!</h1>
          <p style="margin:8px 0 0; font-size:14px; opacity:0.9;">A customer nearby needs your help</p>
        </div>
        <div style="padding:30px;">
          <h2 style="font-size:18px; color:#1a202c; margin-bottom:20px;">Hi ${name}, you have a new service request:</h2>

          <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
            <tr>
              <td style="padding:12px 16px; background:#f7fafc; border-radius:8px 8px 0 0; font-weight:600; color:#718096; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Service Type</td>
              <td style="padding:12px 16px; background:#f7fafc; border-radius:8px 8px 0 0; font-weight:700; color:#FF6B35; font-size:15px;">${serviceType || 'General Repair'}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px; font-weight:600; color:#718096; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Location Area</td>
              <td style="padding:12px 16px; color:#2d3748; font-size:15px;">📍 ${locationArea || 'Nearby'}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px; background:#f7fafc; font-weight:600; color:#718096; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Distance</td>
              <td style="padding:12px 16px; background:#f7fafc; color:#2d3748; font-size:15px;">🚗 ${distance || 'N/A'}</td>
            </tr>
            ${vehicleInfo ? `
            <tr>
              <td style="padding:12px 16px; font-weight:600; color:#718096; font-size:13px; text-transform:uppercase; letter-spacing:0.5px;">Vehicle</td>
              <td style="padding:12px 16px; color:#2d3748; font-size:15px;">🚘 ${vehicleInfo}</td>
            </tr>
            ` : ''}
            ${description ? `
            <tr>
              <td colspan="2" style="padding:12px 16px; background:#f7fafc; border-radius:0 0 8px 8px;">
                <p style="font-weight:600; color:#718096; font-size:13px; text-transform:uppercase; letter-spacing:0.5px; margin:0 0 8px;">Issue Description</p>
                <p style="color:#2d3748; font-size:14px; margin:0; line-height:1.5;">${description}</p>
              </td>
            </tr>
            ` : ''}
          </table>

          <div style="text-align:center; margin-top:24px;">
            <p style="font-size:14px; color:#718096;">Open the Roadside Assistant app to accept this job.</p>
          </div>
        </div>
        <div style="background-color:#f8fafc; padding:20px; text-align:center; font-size:13px; color:#a0aec0; border-top:1px solid #e2e8f0;">
          <p>&copy; ${new Date().getFullYear()} <span style="font-weight:600; color:#FF6B35;">Roadside Assistant Team</span></p>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: `🔔 New Job Alert: ${serviceType || 'Service Request'} nearby!`,
      text: `Hi ${name}, there's a new ${serviceType || 'service'} request ${distance || 'nearby'} at ${locationArea || 'your area'}. Open the app to accept.`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Job alert email sent to ${email}, messageId: ${info.messageId}`);

    if (!process.env.SMTP_USER) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`📧 Ethereal preview URL: ${previewUrl}`);
      }
    }

    return { success: true };
  } catch (error) {
    logger.error(`Failed to send job alert to ${email}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendOTP,
  sendWelcomeEmail,
  sendJobAlert,
};
