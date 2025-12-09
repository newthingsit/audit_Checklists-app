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
let emailServiceReady = false;

if (emailConfig.auth.user && emailConfig.auth.pass) {
  // Office 365 specific configuration
  const isOffice365 = emailConfig.host && emailConfig.host.includes('office365.com');
  
  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure, // false for 587, true for 465
    auth: emailConfig.auth,
    tls: {
      // Office 365 requires proper TLS configuration
      ciphers: isOffice365 ? 'SSLv3' : undefined,
      rejectUnauthorized: false // Allow self-signed certificates (needed for some Office 365 setups)
    },
    // Office 365 requires STARTTLS on port 587
    requireTLS: isOffice365 && emailConfig.port === 587,
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  // Verify connection with better error handling
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email service configuration error:', error.message);
      console.error('Error code:', error.code);
      console.error('Error command:', error.command);
      if (error.response) {
        console.error('SMTP Response:', error.response);
      }
      console.error('Email notifications will be disabled. Please check SMTP settings.');
      emailServiceReady = false;
      
      // Provide helpful error messages for common issues
      if (error.code === 'EAUTH') {
        console.error('⚠️  Authentication failed. Check:');
        console.error('   1. SMTP_USER and SMTP_PASSWORD are correct');
        console.error('   2. For Office 365 with MFA, use App Password instead of regular password');
        console.error('   3. Account may be locked or require security verification');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.error('⚠️  Connection failed. Check:');
        console.error('   1. SMTP_HOST is correct (smtp.office365.com)');
        console.error('   2. SMTP_PORT is correct (587 for Office 365)');
        console.error('   3. Firewall/network allows outbound SMTP connections');
      }
    } else {
      console.log('✅ Email service is ready to send emails');
      console.log(`   Host: ${emailConfig.host}:${emailConfig.port}`);
      console.log(`   User: ${emailConfig.auth.user}`);
      emailServiceReady = true;
    }
  });
} else {
  console.log('⚠️  Email service not configured. Set SMTP_USER and SMTP_PASSWORD environment variables to enable email notifications.');
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

  // Check if email service is ready
  if (!emailServiceReady) {
    console.error(`[Email Service] Email service not ready. Skipping email to ${to}`);
    console.error(`[Email Service] Please check email configuration and restart the server.`);
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

    console.log(`[Email Service] Attempting to send email to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Service] Email sent successfully to ${to}`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response || 'No response'}`);
    return true;
  } catch (error) {
    console.error(`❌ [Email Service] Error sending email to ${to}:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    if (error.response) {
      console.error(`   SMTP Response: ${error.response}`);
    }
    if (error.responseCode) {
      console.error(`   Response Code: ${error.responseCode}`);
    }
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      console.error(`   ⚠️  Authentication failed. Check SMTP_USER and SMTP_PASSWORD.`);
      console.error(`   For Office 365 with MFA, use App Password.`);
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error(`   ⚠️  Connection failed. Check SMTP_HOST and SMTP_PORT.`);
    }
    
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
   * Audit Report Email - Detailed audit results for store managers
   */
  auditReport: (storeName, auditTitle, score, auditorName, completedDate, itemsSummary, categoryScores) => {
    const subject = `Audit Report: ${storeName} - ${auditTitle} (${score}%)`;
    const scoreColor = score >= 80 ? '#4caf50' : score >= 60 ? '#ff9800' : '#f44336';
    const scoreLabel = score >= 80 ? 'Excellent' : score >= 60 ? 'Satisfactory' : 'Needs Improvement';
    
    // Generate category scores HTML
    const categoryRows = (categoryScores || []).map(cat => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${cat.category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${cat.completed}/${cat.total}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; color: ${cat.score >= 80 ? '#4caf50' : cat.score >= 60 ? '#ff9800' : '#f44336'}; font-weight: bold;">${cat.score}%</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 650px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1a237e 0%, #283593 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0; opacity: 0.9; }
          .score-box { background: white; padding: 25px; margin: -20px 20px 0; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; position: relative; z-index: 1; }
          .score { font-size: 48px; font-weight: bold; color: ${scoreColor}; }
          .score-label { font-size: 14px; color: #666; text-transform: uppercase; }
          .content { background: #f5f5f5; padding: 25px 20px; }
          .info-grid { display: table; width: 100%; margin-bottom: 20px; }
          .info-item { display: table-cell; padding: 15px; background: white; text-align: center; border-radius: 5px; margin: 5px; }
          .info-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .info-value { font-size: 16px; font-weight: bold; color: #333; margin-top: 5px; }
          .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; }
          .section h3 { margin: 0 0 15px; color: #1a237e; border-bottom: 2px solid #1a237e; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a237e; color: white; padding: 10px; text-align: left; }
          .summary-stats { display: flex; justify-content: space-around; text-align: center; margin-top: 15px; }
          .stat { flex: 1; }
          .stat-value { font-size: 24px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #666; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #1a237e; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Audit Report</h1>
            <p>${storeName}</p>
          </div>
          
          <div class="score-box">
            <div class="score-label">Overall Score</div>
            <div class="score">${score}%</div>
            <div style="color: ${scoreColor}; font-weight: bold;">${scoreLabel}</div>
          </div>
          
          <div class="content">
            <table style="width: 100%; background: white; border-radius: 5px; margin-bottom: 20px;">
              <tr>
                <td style="padding: 15px; text-align: center; border-right: 1px solid #eee;">
                  <div style="font-size: 12px; color: #666;">AUDIT TYPE</div>
                  <div style="font-weight: bold; margin-top: 5px;">${auditTitle}</div>
                </td>
                <td style="padding: 15px; text-align: center; border-right: 1px solid #eee;">
                  <div style="font-size: 12px; color: #666;">AUDITOR</div>
                  <div style="font-weight: bold; margin-top: 5px;">${auditorName}</div>
                </td>
                <td style="padding: 15px; text-align: center;">
                  <div style="font-size: 12px; color: #666;">DATE</div>
                  <div style="font-weight: bold; margin-top: 5px;">${new Date(completedDate).toLocaleDateString()}</div>
                </td>
              </tr>
            </table>
            
            <div class="section">
              <h3>📊 Items Summary</h3>
              <div style="display: flex; justify-content: space-around; text-align: center;">
                <div>
                  <div style="font-size: 28px; font-weight: bold; color: #4caf50;">${itemsSummary?.passed || 0}</div>
                  <div style="font-size: 12px; color: #666;">Passed</div>
                </div>
                <div>
                  <div style="font-size: 28px; font-weight: bold; color: #f44336;">${itemsSummary?.failed || 0}</div>
                  <div style="font-size: 12px; color: #666;">Failed</div>
                </div>
                <div>
                  <div style="font-size: 28px; font-weight: bold; color: #9e9e9e;">${itemsSummary?.na || 0}</div>
                  <div style="font-size: 12px; color: #666;">N/A</div>
                </div>
                <div>
                  <div style="font-size: 28px; font-weight: bold; color: #1a237e;">${itemsSummary?.total || 0}</div>
                  <div style="font-size: 12px; color: #666;">Total</div>
                </div>
              </div>
            </div>
            
            ${categoryScores && categoryScores.length > 0 ? `
            <div class="section">
              <h3>📈 Category Breakdown</h3>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style="text-align: center;">Items</th>
                    <th style="text-align: center;">Score</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoryRows}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/audits" class="button">View Full Report</a>
            </div>
          </div>
          
          <div class="footer">
            <p>This report was automatically generated by the Audit Checklist System.</p>
            <p>© ${new Date().getFullYear()} Audit Pro. All rights reserved.</p>
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

