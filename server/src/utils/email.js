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
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
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
 */
const sendOTP = async (email, otp, name) => {
  try {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background-color: #f3f4f6; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: 800; color: #1e40af; }
        .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .otp-code { font-size: 36px; font-weight: 800; color: #1d4ed8; letter-spacing: 4px; margin: 0; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 40px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🚗 Roadside Assistant</div>
        </div>
        <p>Hi ${name || 'there'},</p>
        <p>Your verification code is ready. Use the OTP below to complete your authentication process.</p>
        <div class="otp-box">
          <p class="otp-code">${otp}</p>
        </div>
        <p>This code will expire in <strong>15 minutes</strong>.</p>
        <div class="footer">
          <p>If you didn't request this code, you can safely ignore this email.</p>
          <p>Generated at: ${timeStr}</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Bypass Render's SMTP Block by using Brevo's HTTP REST API
    if (process.env.SMTP_PASS && (process.env.SMTP_PASS.startsWith('xsmtpsib-') || process.env.SMTP_PASS.startsWith('xkeysib-'))) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.SMTP_PASS,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            name: "Roadside Assistant", 
            email: process.env.SMTP_USER || "noreply@roadassist.com" 
          },
          to: [{ email: email, name: name || 'User' }],
          subject: `Your Verification Code: ${otp}`,
          htmlContent: html
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Brevo API Error: ${response.status} ${errorData}`);
      }
      
      logger.info(`OTP email sent via Brevo HTTP API to ${email}`);
      return { success: true };
    }

    // Fallback for local development or non-Brevo configs
    const transporter = await createTransporter();
    const uniqueId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@roadassist.com>`;
    
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: email,
      subject: `Your Verification Code: ${otp}`,
      html: html,
      messageId: uniqueId,
    });

    logger.info(`OTP email sent via SMTP to ${email}: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Error in sendOTP: ${error.message}`);
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

    const { serviceType, locationArea, distance, description, vehicleInfo, userName, userPhone } = jobDetails;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #FF6B35; padding: 30px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
        .header p { margin: 8px 0 0; font-size: 15px; opacity: 0.9; }
        .content { padding: 32px; }
        .greeting { font-size: 18px; color: #1f2937; margin-bottom: 24px; font-weight: 600; }
        .details-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
        .detail-row { display: flex; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { padding: 16px; background: #f3f4f6; width: 35%; font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { padding: 16px; width: 65%; color: #111827; font-size: 15px; font-weight: 500; }
        .highlight { color: #FF6B35; font-weight: 700; }
        .description-box { padding: 16px; background: #fff; border-top: 1px solid #e5e7eb; }
        .description-label { font-weight: 600; color: #4b5563; font-size: 13px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
        .description-text { color: #374151; font-size: 14px; line-height: 1.6; margin: 0; }
        .action-area { text-align: center; margin-top: 32px; }
        .action-text { font-size: 14px; color: #6b7280; margin-bottom: 16px; }
        .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        @media only screen and (max-width: 600px) {
          .detail-row { flex-direction: column; }
          .detail-label { width: 100%; padding: 12px 16px 4px; border-bottom: none; background: transparent; }
          .detail-value { width: 100%; padding: 4px 16px 12px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div style="font-size:40px; margin-bottom:12px;">🚨</div>
          <h1>New Service Request</h1>
          <p>A customer needs your help immediately</p>
        </div>
        <div class="content">
          <div class="greeting">Hi ${name}, you've received a new booking:</div>

          <div class="details-card">
            <div class="detail-row">
              <div class="detail-label">Service Type</div>
              <div class="detail-value highlight">${serviceType || 'General Repair'}</div>
            </div>
            
            ${userName ? `
            <div class="detail-row">
              <div class="detail-label">Customer Name</div>
              <div class="detail-value">👤 ${userName}</div>
            </div>` : ''}

            ${userPhone ? `
            <div class="detail-row">
              <div class="detail-label">Phone Number</div>
              <div class="detail-value">📞 <a href="tel:${userPhone}" style="color:#3b82f6; text-decoration:none;">${userPhone}</a></div>
            </div>` : ''}

            <div class="detail-row">
              <div class="detail-label">Location</div>
              <div class="detail-value">📍 ${locationArea || 'Nearby Area'}</div>
            </div>

            ${distance ? `
            <div class="detail-row">
              <div class="detail-label">Distance</div>
              <div class="detail-value">🚗 ${distance}</div>
            </div>` : ''}

            ${vehicleInfo ? `
            <div class="detail-row">
              <div class="detail-label">Vehicle</div>
              <div class="detail-value">🚘 ${vehicleInfo}</div>
            </div>` : ''}

            ${description ? `
            <div class="description-box">
              <div class="description-label">Issue Description</div>
              <p class="description-text">${description}</p>
            </div>` : ''}
          </div>

          <div class="action-area">
            <p class="action-text">Please open your Roadside Assistant app to accept this job.</p>
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} <strong>Roadside Assistant Team</strong></p>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: `🚨 New Booking: ${serviceType || 'Service Request'} nearby!`,
      text: `Hi ${name}, there's a new ${serviceType || 'service'} request at ${locationArea || 'your area'}. Open the app to accept.`,
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

const sendRequestRejectedEmail = async (email, name) => {
  try {
    const transporter = await createTransporter();
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family:'Inter','Segoe UI',Tahoma,sans-serif; background-color:#f4f7f6; margin:0; padding:0;">
      <div style="max-width:600px; margin:40px auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg, #e53e3e 0%, #c53030 100%); padding:30px 20px; text-align:center; color:white;">
          <h1 style="font-size:24px; font-weight:bold; margin:0;">Service Request Cancelled</h1>
        </div>
        <div style="padding:30px;">
          <h2 style="font-size:18px; color:#1a202c; margin-bottom:20px;">Hi ${name},</h2>
          
          <p style="color:#4a5568; line-height:1.6; font-size:16px;">
            This service has been cancelled so please try another mechanic because the mechanic has not accepted your request. 
            Please try different mechanic using your location.
          </p>
          
          <div style="text-align:center; margin-top:30px;">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" style="background-color:#FF6B35; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">Book Another Mechanic</a>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject: `Service Cancelled: Mechanic Unavailable`,
      text: `Hi ${name},\n\nThis service has been cancelled so please try another mechanic because the mechanic has not accepted your request. Please try different mechanic using your location.\n\nOpen the app to book another mechanic.`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Rejection email sent to ${email}, messageId: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to send rejection email to ${email}: ${error.message}`);
  }
};

const sendInvoiceEmail = async (email, name, invoice, pdfBuffer) => {
  try {
    const transporter = await createTransporter();
    
    // Front-end payment URL
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const paymentLink = `${clientUrl}/dashboard/invoice/${invoice.request_id}`;

    const isPaid = invoice.status === 'paid';
    const title = isPaid ? 'Payment Receipt - Invoice' : 'Amount Request';
    const subject = isPaid 
      ? `Your Payment Receipt - Invoice #${invoice.id.substring(0,8)}` 
      : `Action Required: Amount Request #${invoice.id.substring(0,8)}`;
    const headerText = isPaid ? 'Payment Successful' : 'Service Bill Generated';
    const introText = isPaid 
      ? `Hi ${name}, thank you for your payment.` 
      : `Hi ${name}, your vehicle service is complete.`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family:'Inter','Segoe UI',Tahoma,sans-serif; background-color:#f4f7f6; margin:0; padding:0;">
      <div style="max-width:600px; margin:40px auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg, #10b981 0%, #059669 100%); padding:30px 20px; text-align:center; color:white;">
          <h1 style="font-size:24px; font-weight:bold; margin:0;">${headerText}</h1>
        </div>
        <div style="padding:30px;">
          <h2 style="font-size:18px; color:#1a202c; margin-bottom:20px;">${introText}</h2>
          
          <p>The total amount ${isPaid ? 'paid was' : 'due is'} <strong>Rs. ${invoice.total_amount}</strong>.</p>
          <p>Please find the detailed ${isPaid ? 'invoice' : 'amount request'} attached to this email.</p>
          
          ${!isPaid ? `
          <div style="text-align:center; margin-top:30px;">
            <a href="${paymentLink}" style="background-color:#10b981; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">Pay Now</a>
          </div>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
    `;

    const mailOptions = {
      from: getFromAddress(),
      to: email,
      subject,
      text: `Hi ${name}, your bill of Rs. ${invoice.total_amount} is ready. Pay here: ${paymentLink}`,
      html,
      attachments: [
        {
          filename: `${isPaid ? 'Invoice' : 'Amount_Request'}_${invoice.id.substring(0,8)}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Invoice email sent to ${email}, messageId: ${info.messageId}`);

    return { success: true };
  } catch (error) {
    logger.error(`Failed to send invoice email to ${email}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sendOTP,
  sendWelcomeEmail,
  sendJobAlert,
  sendInvoiceEmail,
  sendRequestRejectedEmail
};
