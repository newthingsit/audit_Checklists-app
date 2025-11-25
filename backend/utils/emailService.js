const nodemailer = require('nodemailer');

// Email configuration from environment variables
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || ''
  }
};

// Create transporter (only if email is configured)
let transporter = null;

if (emailConfig.auth.user && emailConfig.auth.pass) {
  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.auth,
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.log('Email service configuration error:', error.message);
      console.log('Email notifications will be disabled. Please check SMTP settings.');
    } else {
      console.log('Email service is ready to send emails');
    }
  });
} else {
  console.log('Email service not configured. Set SMTP_USER and SMTP_PASSWORD environment variables to enable email notifications.');
}

/**
 * Send email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML email body
 * @param {string} textBody - Plain text email body (optional)
 * @returns {Promise<boolean>} - Returns true if email was sent successfully
 */
const sendEmail = async (to, subject, htmlBody, textBody = null) => {
  // If email is not configured, skip silently
  if (!transporter || !emailConfig.auth.user || !emailConfig.auth.pass) {
    console.log(`[Email Service] Skipping email to ${to} - Email service not configured`);
    return false;
  }

  // Validate email address
  if (!to || !to.includes('@')) {
    console.error(`[Email Service] Invalid email address: ${to}`);
    return false;
  }

  try {
    const fromEmail = process.env.SMTP_FROM || emailConfig.auth.user;
    const fromName = process.env.SMTP_FROM_NAME || 'Audit Checklist System';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: subject,
      html: htmlBody,
      text: textBody || htmlBody.replace(/<[^>]*>/g, '') // Strip HTML tags for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Email sent successfully to ${to}:`, info.messageId);
    return true;
  } catch (error) {
    console.error(`[Email Service] Error sending email to ${to}:`, error.message);
    return false;
  }
};

/**
 * Send notification email for various events
 */
const emailTemplates = {
  /**
   * Scheduled audit reminder
   */
  scheduledAuditReminder: (userName, auditTitle, scheduledDate, location) => {
    const subject = `Reminder: Scheduled Audit - ${auditTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Audit Reminder</h2>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>This is a reminder that you have a scheduled audit:</p>
            <ul>
              <li><strong>Audit:</strong> ${auditTitle}</li>
              <li><strong>Location:</strong> ${location || 'Not specified'}</li>
              <li><strong>Scheduled Date:</strong> ${new Date(scheduledDate).toLocaleDateString()}</li>
            </ul>
            <p>Please complete the audit on or before the scheduled date.</p>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/scheduled" class="button">View Scheduled Audits</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Audit Checklist System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  },

  /**
   * Audit completion notification
   */
  auditCompleted: (userName, auditTitle, score, location) => {
    const subject = `Audit Completed: ${auditTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .score { font-size: 32px; font-weight: bold; color: #4caf50; text-align: center; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #4caf50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Audit Completed</h2>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>Great news! An audit has been completed:</p>
            <ul>
              <li><strong>Audit:</strong> ${auditTitle}</li>
              <li><strong>Location:</strong> ${location || 'Not specified'}</li>
            </ul>
            ${score !== null ? `<div class="score">Score: ${score}%</div>` : ''}
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/audits" class="button">View Audit Details</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Audit Checklist System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  },

  /**
   * Action item assigned
   */
  actionItemAssigned: (userName, actionTitle, dueDate, priority) => {
    const subject = `New Action Item Assigned: ${actionTitle}`;
    const priorityColors = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50'
    };
    const priorityColor = priorityColors[priority?.toLowerCase()] || '#666';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .priority { display: inline-block; padding: 5px 10px; background: ${priorityColor}; color: white; border-radius: 3px; font-size: 12px; }
          .button { display: inline-block; padding: 12px 24px; background: #ff9800; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Action Item</h2>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>A new action item has been assigned to you:</p>
            <ul>
              <li><strong>Action Item:</strong> ${actionTitle}</li>
              <li><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleDateString() : 'Not specified'}</li>
              <li><strong>Priority:</strong> <span class="priority">${priority || 'Medium'}</span></li>
            </ul>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/actions" class="button">View Action Items</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Audit Checklist System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  },

  /**
   * Task reminder
   */
  taskReminder: (userName, taskTitle, dueDate) => {
    const subject = `Task Reminder: ${taskTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 24px; background: #2196f3; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Task Reminder</h2>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>This is a reminder about your task:</p>
            <ul>
              <li><strong>Task:</strong> ${taskTitle}</li>
              <li><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleDateString() : 'Not specified'}</li>
            </ul>
            <p>Please complete this task before the due date.</p>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/tasks" class="button">View Tasks</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Audit Checklist System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  },

  /**
   * Overdue item notification
   */
  overdueItem: (userName, itemType, itemTitle, dueDate) => {
    const subject = `Overdue ${itemType}: ${itemTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .warning { background: #fff3cd; border-left: 4px solid #f44336; padding: 10px; margin: 15px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Overdue Item</h2>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <div class="warning">
              <strong>⚠️ Attention Required</strong>
            </div>
            <p>The following ${itemType.toLowerCase()} is overdue:</p>
            <ul>
              <li><strong>${itemType}:</strong> ${itemTitle}</li>
              <li><strong>Due Date:</strong> ${dueDate ? new Date(dueDate).toLocaleDateString() : 'Not specified'}</li>
            </ul>
            <p>Please complete this item as soon as possible.</p>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/${itemType.toLowerCase()}s" class="button">View ${itemType}</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from the Audit Checklist System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    return { subject, html };
  }
};

/**
 * Send email notification using template
 */
const sendNotificationEmail = async (userEmail, userName, templateName, templateData) => {
  if (!userEmail || !userName) {
    console.error('[Email Service] Missing user email or name');
    return false;
  }

  const template = emailTemplates[templateName];
  if (!template) {
    console.error(`[Email Service] Template not found: ${templateName}`);
    return false;
  }

  const { subject, html } = template(userName, ...templateData);
  return await sendEmail(userEmail, subject, html);
};

module.exports = {
  sendEmail,
  sendNotificationEmail,
  emailTemplates,
  isConfigured: () => transporter !== null && emailConfig.auth.user && emailConfig.auth.pass
};

