# Email Notifications Setup Guide

This guide will help you configure email notifications for your Audit Checklist application. There are **two parts** to the setup:

1. **Backend SMTP Configuration** - Configure the email server to send emails
2. **User Preferences** - Enable/disable specific notification types in the Settings page

---

## Part 1: Backend SMTP Configuration

### Step 1: Choose Your Email Provider

The application supports any SMTP-compatible email service. Here are the most common options:

#### Option A: Gmail (Recommended for Testing)

**Advantages:**
- Free and easy to set up
- Reliable delivery
- Good for development and small teams

**Setup Steps:**

1. **Enable 2-Factor Authentication** on your Google account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification" if not already enabled

2. **Generate an App Password**:
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" as the app
   - Select "Other (Custom name)" as the device
   - Enter "Audit Checklist System" as the name
   - Click "Generate"
   - **Copy the 16-character password** (you'll need this for `SMTP_PASSWORD`)

3. **Configure Environment Variables**:
   Add these to your backend `.env` file or Azure App Service Configuration:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-character-app-password
   SMTP_FROM=your-email@gmail.com
   SMTP_FROM_NAME=Audit Checklist System
   APP_URL=https://your-app-url.com
   ```

#### Option B: Outlook/Office 365

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
SMTP_FROM=your-email@outlook.com
SMTP_FROM_NAME=Audit Checklist System
APP_URL=https://your-app-url.com
```

#### Option C: SendGrid (Recommended for Production)

**Advantages:**
- Professional email delivery service
- Better deliverability
- Analytics and tracking
- Free tier: 100 emails/day

**Setup Steps:**

1. Sign up at [SendGrid](https://sendgrid.com)
2. Create an API Key:
   - Go to Settings → API Keys
   - Create a new API key with "Mail Send" permissions
   - Copy the API key

3. Configure Environment Variables:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=your-verified-sender-email@domain.com
SMTP_FROM_NAME=Audit Checklist System
APP_URL=https://your-app-url.com
```

#### Option D: AWS SES (For High Volume)

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-ses-smtp-username
SMTP_PASSWORD=your-aws-ses-smtp-password
SMTP_FROM=your-verified-email@domain.com
SMTP_FROM_NAME=Audit Checklist System
APP_URL=https://your-app-url.com
```

---

### Step 2: Configure Environment Variables

#### For Local Development:

1. Open `backend/.env` file (create it if it doesn't exist)
2. Add the SMTP configuration variables from your chosen provider above
3. Save the file
4. Restart your backend server

#### For Azure App Service (Production):

1. Go to Azure Portal → Your App Service → Configuration
2. Click "Application settings" or "Environment variables"
3. Add each SMTP variable as a new setting:
   - Click "+ New application setting"
   - Enter the name (e.g., `SMTP_HOST`)
   - Enter the value (e.g., `smtp.gmail.com`)
   - Click "OK"
4. Repeat for all SMTP variables
5. Click "Save" at the top
6. The app will automatically restart

**Required Variables:**
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP port (usually 587)
- `SMTP_SECURE` - `false` for port 587, `true` for port 465
- `SMTP_USER` - Your email address or API username
- `SMTP_PASSWORD` - Your email password or API key
- `SMTP_FROM` - Email address to send from
- `SMTP_FROM_NAME` - Display name for emails
- `APP_URL` - Your application URL (for email links)

---

### Step 3: Verify Email Configuration

1. **Start/Restart your backend server**
2. **Check the console logs** for one of these messages:

   ✅ **Success:**
   ```
   Email service is ready to send emails
   ```

   ❌ **Not Configured:**
   ```
   Email service not configured. Set SMTP_USER and SMTP_PASSWORD environment variables to enable email notifications.
   ```

   ❌ **Configuration Error:**
   ```
   Email service configuration error: [error message]
   Email notifications will be disabled. Please check SMTP settings.
   ```

3. **If you see an error**, check:
   - All environment variables are set correctly
   - Email credentials are correct
   - For Gmail: You're using an App Password (not your regular password)
   - Network/firewall allows SMTP connections

---

## Part 2: User Preferences Configuration

Once the backend is configured, users can enable/disable specific notification types in the Settings page.

### Step 1: Access Settings

1. Log in to the application
2. Navigate to **Settings** (usually in the user menu or sidebar)
3. Scroll to the **"Email Notifications"** section

### Step 2: Enable Email Notifications

1. **Turn ON the master toggle**: "Enable Email Notifications"
   - This is the main switch that controls all email notifications
   - When OFF, no emails will be sent regardless of individual settings

2. **Enable specific notification types** (these appear after enabling the master toggle):
   - ✅ **Audit Completion Notifications** - Get notified when audits are completed
   - ✅ **Action Item Assignment Notifications** - Get notified when action items are assigned to you
   - ✅ **Task Reminder Notifications** - Get reminders about upcoming tasks
   - ✅ **Overdue Item Notifications** - Get notified about overdue items
   - ✅ **Scheduled Audit Reminders** - Get reminders about scheduled audits

3. **Click "Save Settings"** to save your preferences

### Step 3: Verify Your Email Address

**Important:** Make sure your email address is correct in your profile:

1. Go to your **Profile** or **Account Settings**
2. Verify your email address is correct and up-to-date
3. Update it if necessary
4. Email notifications will be sent to this address

---

## Testing Email Notifications

### Test 1: Check Backend Configuration

1. Restart your backend server
2. Look for: `Email service is ready to send emails` in the console
3. If you see an error, fix the SMTP configuration

### Test 2: Test Individual Notifications

1. **Audit Completion:**
   - Complete an audit
   - Check your email inbox

2. **Action Item Assignment:**
   - Assign an action item to yourself
   - Check your email inbox

3. **Scheduled Audit Reminder:**
   - Create a scheduled audit for today
   - Wait for the scheduled time or check logs
   - Check your email inbox

### Test 3: Check Email Preferences

1. Enable/disable specific notification types in Settings
2. Trigger the corresponding event
3. Verify emails are sent/not sent according to your preferences

---

## Troubleshooting

### Problem: "Email service not configured"

**Solution:**
- Check that `SMTP_USER` and `SMTP_PASSWORD` are set in your environment variables
- Restart the backend server after adding environment variables

### Problem: "Email service configuration error"

**Solution:**
- Verify all SMTP variables are correct
- For Gmail: Make sure you're using an App Password, not your regular password
- Check that your email provider allows SMTP access
- Verify network/firewall settings

### Problem: Emails not being received

**Solution:**
1. Check spam/junk folder
2. Verify email address in user profile is correct
3. Check that "Enable Email Notifications" is ON in Settings
4. Check that the specific notification type is enabled
5. Check backend logs for email sending errors
6. Verify SMTP configuration is correct

### Problem: Gmail "Less secure app access" error

**Solution:**
- Use App Passwords instead (recommended)
- Or enable "Less secure app access" in Google Account settings (not recommended)

---

## Quick Reference

### Minimum Required Configuration

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### User Settings Checklist

- [ ] Backend SMTP configured and verified
- [ ] User email address is correct in profile
- [ ] "Enable Email Notifications" is ON in Settings
- [ ] Specific notification types are enabled as desired
- [ ] Settings are saved

---

## Next Steps

After configuration:

1. ✅ Test with a simple notification (e.g., assign an action item to yourself)
2. ✅ Check that emails are being delivered
3. ✅ Adjust notification preferences in Settings as needed
4. ✅ Monitor backend logs for any email errors

---

## Support

If you continue to have issues:

1. Check the backend console logs for specific error messages
2. Verify all environment variables are set correctly
3. Test SMTP connection using an email testing tool
4. Review the [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md) documentation for more details
