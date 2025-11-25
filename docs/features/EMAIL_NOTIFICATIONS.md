# Email Notifications Feature

## Overview

The application now supports email notifications for important events. Email notifications complement the in-app notification system and help ensure users stay informed about critical updates even when they're not actively using the application.

## Features

### Email Notification Types

1. **Scheduled Audit Reminders**
   - Sent when a scheduled audit is due
   - Includes audit title, location, and scheduled date

2. **Audit Completion Notifications**
   - Sent when an audit is completed
   - Includes audit title, location, and score

3. **Action Item Assignments**
   - Sent when a new action item is assigned to a user
   - Includes action title, due date, and priority

4. **Task Reminders**
   - Sent for task reminders and due date notifications
   - Includes task title and due date

5. **Overdue Item Notifications**
   - Sent for overdue tasks and action items
   - Includes item type, title, and original due date

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Audit Checklist System

# Application URL (for email links)
APP_URL=http://localhost:3000
```

### Gmail Setup

If using Gmail:

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as `SMTP_PASSWORD`

### Other Email Providers

#### Outlook/Office 365
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
```

## How It Works

1. **Automatic Integration**: Email notifications are automatically sent when in-app notifications are created
2. **Non-Blocking**: Email failures don't prevent in-app notifications from being created
3. **Graceful Degradation**: If email is not configured, the system continues to work with in-app notifications only

## Email Templates

All email notifications use professional HTML templates with:
- Branded headers with gradient colors
- Clear, readable content
- Action buttons linking back to the application
- Responsive design for mobile devices

## Testing

### Check Email Service Status

When the server starts, check the console for:
- `Email service is ready to send emails` - Email is configured correctly
- `Email service not configured` - Email is disabled (normal if not configured)

### Test Email Notifications

1. Create a scheduled audit assigned to a user
2. Wait for the scheduled date or trigger the job manually
3. Check the user's email inbox

## Troubleshooting

### Emails Not Sending

1. **Check Configuration**
   - Verify all SMTP environment variables are set
   - Ensure SMTP credentials are correct

2. **Check Logs**
   - Look for email service errors in console
   - Check for "Email service configuration error" messages

3. **Test SMTP Connection**
   - Use an email testing tool to verify SMTP settings
   - Check firewall/network restrictions

4. **Gmail Specific Issues**
   - Ensure App Password is used (not regular password)
   - Check if "Less secure app access" is enabled (if not using App Password)

### Common Errors

- **"Invalid login"**: Check SMTP_USER and SMTP_PASSWORD
- **"Connection timeout"**: Check SMTP_HOST and SMTP_PORT
- **"Self-signed certificate"**: Already handled in code, but verify SMTP settings

## Disabling Email Notifications

To disable email notifications, simply don't set the SMTP environment variables. The system will continue to work with in-app notifications only.

## Future Enhancements

- User preferences for email notification types
- Email digest (daily/weekly summary)
- Custom email templates
- Email notification history
- Bounce handling and email validation

