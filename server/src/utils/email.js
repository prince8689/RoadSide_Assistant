const nodemailer = require('nodemailer');
const { logger } = require('./logger');

const sendEmail = async (options) => {
  try {
    // Check if SMTP is configured, if not, use ethereal email for testing
    let transporter;
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      logger.warn('No SMTP credentials found in .env, using ethereal test account');
      // Generate test SMTP service account from ethereal.email
      let testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const mailOptions = {
      from: `"RoadAssist Team" <${process.env.SMTP_USER || 'noreply@roadassist.com'}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Message sent: ${info.messageId}`);
    
    if (!process.env.SMTP_USER) {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return true;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    return false;
  }
};

const getOtpEmailTemplate = (otp, name) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
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
        background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
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
        background-color: #f8fafc;
        border: 2px dashed #cbd5e1;
        border-radius: 12px;
        padding: 20px;
        margin: 30px 0;
      }
      .otp-code {
        font-size: 42px;
        font-weight: 800;
        letter-spacing: 8px;
        color: #FF6B6B;
        margin: 0;
      }
      .expiry {
        font-size: 14px;
        color: #718096;
        margin-top: 10px;
      }
      .footer {
        background-color: #f8fafc;
        padding: 20px;
        text-align: center;
        font-size: 14px;
        color: #a0aec0;
        border-top: 1px solid #e2e8f0;
      }
      .contact {
        color: #FF6B6B;
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">🚗</div>
        <h1 class="title">RoadAssist</h1>
      </div>
      <div class="content">
        <div class="greeting">Hi ${name},</div>
        <div class="message">
          Welcome to RoadAssist! We're excited to have you on board. 
          To complete your registration and secure your account, please use the following verification code.
        </div>
        
        <div class="otp-container">
          <p class="otp-code">${otp}</p>
        </div>
        
        <p class="expiry">This code is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
        
        <p style="margin-top: 40px; font-size: 15px; color: #718096;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} RoadAssist Platform. All rights reserved.</p>
        <p>Need help? Contact us at <a href="mailto:support@roadassist.com" class="contact">support@roadassist.com</a></p>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = {
  sendEmail,
  getOtpEmailTemplate
};
