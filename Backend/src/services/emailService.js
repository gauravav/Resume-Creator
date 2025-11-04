const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { getFrontendUrl } = require('../utils/urlUtils');

class EmailService {
  constructor() {
    // Get email service type from environment
    this.emailService = process.env.EMAIL_SERVICE || 'sendgrid';

    // Validate required environment variables
    if (!process.env.ADMIN_EMAIL) {
      throw new Error('Email configuration incomplete. Please set ADMIN_EMAIL environment variable.');
    }

    if (this.emailService === 'gmail') {
      // Validate Gmail configuration
      if (!process.env.GMAIL_USER) {
        throw new Error('Email configuration incomplete. Please set GMAIL_USER environment variable.');
      }

      if (!process.env.GMAIL_APP_PASSWORD) {
        throw new Error('Email configuration incomplete. Please set GMAIL_APP_PASSWORD environment variable.');
      }

      // Initialize Gmail SMTP transporter
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      // Log configuration (without sensitive data)
      logger.info('Initializing Gmail SMTP email service', {
        fromEmail: process.env.GMAIL_USER,
        fromName: process.env.GMAIL_FROM_NAME || 'Resume Builder',
        adminEmail: process.env.ADMIN_EMAIL
      });
    } else {
      // Validate SendGrid configuration
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error('Email configuration incomplete. Please set SENDGRID_API_KEY environment variable.');
      }

      if (!process.env.SENDGRID_FROM_EMAIL) {
        throw new Error('Email configuration incomplete. Please set SENDGRID_FROM_EMAIL environment variable.');
      }

      // Initialize SendGrid
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      // Log configuration (without sensitive data)
      logger.info('Initializing SendGrid email service', {
        fromEmail: process.env.SENDGRID_FROM_EMAIL,
        fromName: process.env.SENDGRID_FROM_NAME || 'Resume Builder',
        adminEmail: process.env.ADMIN_EMAIL
      });
    }
  }

  async testConnection() {
    try {
      if (this.emailService === 'gmail') {
        logger.info('Testing Gmail SMTP connection...');
        // Verify the connection
        await this.transporter.verify();
        logger.info('Gmail SMTP connection successful');
        return { success: true, connected: true };
      } else {
        logger.info('Testing SendGrid API connection...');
        // SendGrid doesn't have a specific test connection method like nodemailer
        // We'll just validate that we have the API key
        if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
          throw new Error('Invalid SendGrid API key format');
        }
        logger.info('SendGrid API key validation successful');
        return { success: true, connected: true };
      }
    } catch (error) {
      logger.error('Email service test failed', {
        service: this.emailService,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        suggestion: this.emailService === 'gmail'
          ? 'Check GMAIL_USER and GMAIL_APP_PASSWORD configuration.'
          : 'Check SENDGRID_API_KEY configuration.'
      };
    }
  }

  async sendEmail(mailOptions) {
    if (this.emailService === 'gmail') {
      // Send via Gmail SMTP using nodemailer
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } else {
      // Send via SendGrid
      const info = await sgMail.send(mailOptions);
      return { success: true, messageId: info[0].headers['x-message-id'] };
    }
  }

  getFromEmail() {
    if (this.emailService === 'gmail') {
      return {
        email: process.env.GMAIL_USER,
        name: process.env.GMAIL_FROM_NAME || 'Resume Builder'
      };
    } else {
      return {
        email: process.env.SENDGRID_FROM_EMAIL,
        name: process.env.SENDGRID_FROM_NAME || 'Resume Builder'
      };
    }
  }

  async sendVerificationEmail(email, verificationToken, firstName, req = null) {
    const frontendUrl = getFrontendUrl(req);
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    const fromEmail = this.getFromEmail();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Resume Builder!</h1>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${firstName},</h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Thank you for signing up! Please verify your email address to complete your registration and access our resume building platform.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}"
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      text-decoration: none;
                      padding: 15px 30px;
                      border-radius: 25px;
                      font-weight: bold;
                      font-size: 16px;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              Verify Email Address
            </a>
          </div>

          <p style="color: #888; font-size: 14px; margin-top: 25px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #667eea; word-break: break-all;">${verificationUrl}</a>
          </p>

          <p style="color: #888; font-size: 14px; margin-top: 25px;">
            This verification link will expire in 24 hours for security reasons.
          </p>

          <hr style="border: none; height: 1px; background: #ddd; margin: 25px 0;">

          <p style="color: #888; font-size: 12px; text-align: center;">
            If you didn't create an account, please ignore this email.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      to: email,
      from: this.emailService === 'gmail' ? `"${fromEmail.name}" <${fromEmail.email}>` : fromEmail,
      subject: 'Verify Your Email - Resume Builder',
      html: htmlContent
    };

    try {
      const result = await this.sendEmail(mailOptions);
      logger.info('Verification email sent', {
        service: this.emailService,
        to: email,
        messageId: result.messageId
      });
      return result;
    } catch (error) {
      logger.error('Failed to send verification email', {
        service: this.emailService,
        to: email,
        error: error.message,
        code: error.code,
        response: error.response?.body
      });

      // Provide more specific error messages
      if (error.code === 401) {
        throw new Error(`${this.emailService === 'gmail' ? 'Gmail' : 'SendGrid'} authentication failed. Please check your credentials.`);
      } else if (error.code === 403) {
        throw new Error(`${this.emailService === 'gmail' ? 'Gmail' : 'SendGrid'} access forbidden. Check your permissions.`);
      } else if (error.code === 413) {
        throw new Error('Email content too large.');
      } else {
        throw new Error(`Failed to send verification email: ${error.message}`);
      }
    }
  }

  async sendAdminNotification(userEmail, firstName, lastName, userId, req = null) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const frontendUrl = getFrontendUrl(req);
    const fromEmail = this.getFromEmail();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #28a745; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New User Verification Complete</h1>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">User Details</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Name:</td>
              <td style="padding: 10px 0; color: #333;">${firstName} ${lastName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Email:</td>
              <td style="padding: 10px 0; color: #333;">${userEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; font-weight: bold; color: #555;">User ID:</td>
              <td style="padding: 10px 0; color: #333;">${userId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Status:</td>
              <td style="padding: 10px 0; color: #e67e22;">Pending Approval</td>
            </tr>
          </table>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/admin/dashboard"
               style="background: #28a745;
                      color: white;
                      text-decoration: none;
                      padding: 12px 25px;
                      border-radius: 5px;
                      font-weight: bold;
                      display: inline-block;">
              Go to Admin Dashboard
            </a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            This user has successfully verified their email address and is now awaiting admin approval to access the resume building platform.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      to: adminEmail,
      from: this.emailService === 'gmail' ? `"${fromEmail.name}" <${fromEmail.email}>` : fromEmail,
      subject: 'New User Email Verified - Pending Approval',
      html: htmlContent
    };

    try {
      const result = await this.sendEmail(mailOptions);
      logger.info('Admin notification sent', {
        service: this.emailService,
        to: adminEmail,
        userId: userId,
        userEmail: userEmail,
        messageId: result.messageId
      });
      return result;
    } catch (error) {
      logger.error('Failed to send admin notification', {
        service: this.emailService,
        to: adminEmail,
        userId: userId,
        error: error.message
      });
      throw new Error('Failed to send admin notification');
    }
  }

  async sendApprovalEmail(email, firstName, req = null) {
    const frontendUrl = getFrontendUrl(req);
    const loginUrl = `${frontendUrl}/login`;
    const fromEmail = this.getFromEmail();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Account Approved! 🎉</h1>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${firstName},</h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Great news! Your account has been approved and you now have full access to our resume building platform.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}"
               style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                      color: white;
                      text-decoration: none;
                      padding: 15px 30px;
                      border-radius: 25px;
                      font-weight: bold;
                      font-size: 16px;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);">
              Start Building Your Resume
            </a>
          </div>

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            You can now log in to your account and start creating professional resumes tailored to your job applications.
          </p>

          <hr style="border: none; height: 1px; background: #ddd; margin: 25px 0;">

          <p style="color: #888; font-size: 12px; text-align: center;">
            Thank you for choosing Resume Builder!
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      to: email,
      from: this.emailService === 'gmail' ? `"${fromEmail.name}" <${fromEmail.email}>` : fromEmail,
      subject: 'Account Approved - Welcome to Resume Builder!',
      html: htmlContent
    };

    try {
      const result = await this.sendEmail(mailOptions);
      logger.info('Approval email sent', {
        service: this.emailService,
        to: email,
        messageId: result.messageId
      });
      return result;
    } catch (error) {
      logger.error('Failed to send approval email', {
        service: this.emailService,
        to: email,
        error: error.message
      });
      throw new Error('Failed to send approval email');
    }
  }

  async sendRejectionEmail(email, firstName, reason) {
    const fromEmail = this.getFromEmail();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc3545; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Account Application Update</h1>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${firstName},</h2>

          <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Thank you for your interest in Resume Builder. Unfortunately, we are unable to approve your account at this time.
          </p>

          ${reason ? `
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>Reason:</strong> ${reason}
            </p>
          </div>
          ` : ''}

          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            If you have any questions or would like to discuss this further, please don't hesitate to contact us.
          </p>

          <hr style="border: none; height: 1px; background: #ddd; margin: 25px 0;">

          <p style="color: #888; font-size: 12px; text-align: center;">
            Thank you for your understanding.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      to: email,
      from: this.emailService === 'gmail' ? `"${fromEmail.name}" <${fromEmail.email}>` : fromEmail,
      subject: 'Account Application Update',
      html: htmlContent
    };

    try {
      const result = await this.sendEmail(mailOptions);
      logger.info('Rejection email sent', {
        service: this.emailService,
        to: email,
        messageId: result.messageId
      });
      return result;
    } catch (error) {
      logger.error('Failed to send rejection email', {
        service: this.emailService,
        to: email,
        error: error.message
      });
      throw new Error('Failed to send rejection email');
    }
  }

  async sendServerStartupNotification(port, environment) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const timestamp = new Date().toLocaleString();
    const fromEmail = this.getFromEmail();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚀 Server Started Successfully</h1>
        </div>

        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Resume Builder API Server</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Status:</td>
              <td style="padding: 10px 0; color: #28a745; font-weight: bold;">✅ Online</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Port:</td>
              <td style="padding: 10px 0; color: #333;">${port}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Environment:</td>
              <td style="padding: 10px 0; color: #333;">${environment || 'development'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Email Service:</td>
              <td style="padding: 10px 0; color: #333;">${this.emailService === 'gmail' ? 'Gmail SMTP' : 'SendGrid'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Started At:</td>
              <td style="padding: 10px 0; color: #333;">${timestamp}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold; color: #555;">Health Check:</td>
              <td style="padding: 10px 0;">
                <a href="http://localhost:${port}/health" style="color: #667eea; text-decoration: none;">
                  http://localhost:${port}/health
                </a>
              </td>
            </tr>
          </table>

          <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
            <p style="color: #1976d2; margin: 0; font-size: 14px;">
              <strong>Available Services:</strong><br>
              • Email Verification System ✓<br>
              • Admin Dashboard API ✓<br>
              • User Management ✓<br>
              • Token Usage Tracking ✓<br>
              • Resume Processing ✓
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/admin"
               style="background: #667eea;
                      color: white;
                      text-decoration: none;
                      padding: 12px 25px;
                      border-radius: 5px;
                      font-weight: bold;
                      display: inline-block;">
              Access Admin Dashboard
            </a>
          </div>

          <hr style="border: none; height: 1px; background: #ddd; margin: 25px 0;">

          <p style="color: #888; font-size: 12px; text-align: center;">
            This is an automated notification from your Resume Builder server.
          </p>
        </div>
      </div>
    `;

    const mailOptions = {
      to: adminEmail,
      from: this.emailService === 'gmail' ? `"${fromEmail.name}" <${fromEmail.email}>` : fromEmail,
      subject: `🚀 Resume Builder Server Started - Port ${port}`,
      html: htmlContent
    };

    // Add sandbox mode for SendGrid in development
    if (this.emailService === 'sendgrid' && process.env.NODE_ENV === 'development') {
      mailOptions.mail_settings = {
        sandbox_mode: {
          enable: true
        }
      };
    }

    try {
      const result = await this.sendEmail(mailOptions);
      logger.info('Server startup notification sent', {
        service: this.emailService,
        to: adminEmail,
        port: port,
        environment: environment,
        messageId: result.messageId,
        sandboxMode: this.emailService === 'sendgrid' && process.env.NODE_ENV === 'development'
      });
      return result;
    } catch (error) {
      logger.error('Failed to send server startup notification', {
        service: this.emailService,
        to: adminEmail,
        port: port,
        error: error.message,
        code: error.code,
        response: error.response?.body,
        suggestions: this.getErrorSuggestions(error.code)
      });
      // Don't throw error here as server startup shouldn't fail due to email issues
      return { success: false, error: error.message, code: error.code };
    }
  }

  getErrorSuggestions(errorCode) {
    if (this.emailService === 'gmail') {
      const gmailSuggestions = {
        401: 'Invalid Gmail credentials. Check GMAIL_USER and GMAIL_APP_PASSWORD in .env file.',
        535: 'Gmail authentication failed. Verify your app password is correct.',
        454: 'Gmail temporary authentication failure. Try again later.',
        550: 'Gmail rejected the recipient email address.',
        552: 'Message size exceeds Gmail limits.',
        553: 'Sender address rejected by Gmail.'
      };
      return gmailSuggestions[errorCode] || 'Unknown Gmail error. Check your Gmail settings.';
    } else {
      const sendgridSuggestions = {
        401: 'Invalid SendGrid API key. Check SENDGRID_API_KEY in .env file.',
        403: [
          'Sender email not verified. Verify sender email in SendGrid dashboard.',
          'API key lacks permissions. Check API key permissions in SendGrid.',
          'Domain authentication required. Set up domain authentication in SendGrid.'
        ],
        413: 'Email content too large. Reduce email content size.',
        429: 'Rate limit exceeded. Wait before sending more emails.',
        500: 'SendGrid server error. Try again later.'
      };
      return sendgridSuggestions[errorCode] || 'Unknown error. Check SendGrid dashboard for details.';
    }
  }
}

module.exports = new EmailService();