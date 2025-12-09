# Office 365 Email Configuration Guide

Complete step-by-step guide to configure Office 365 email notifications for your Audit Checklist application.

---

## 📋 Prerequisites

1. **Office 365 Account** with email access
2. **Azure App Service** access (for production)
3. **Office 365 Admin Access** (if using organization account)

---

## 🔧 Step 1: Office 365 SMTP Settings

Office 365 uses the following SMTP configuration:

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-office365-password
SMTP_FROM=your-email@yourdomain.com
SMTP_FROM_NAME=Audit Checklist System
APP_URL=https://your-app-url.com
```

**Important Notes:**
- **Port 587** is required (TLS/STARTTLS)
- **SMTP_SECURE=false** (not SSL, uses STARTTLS)
- Use your **full email address** as `SMTP_USER`
- Use your **regular Office 365 password** (unlike Gmail, no app password needed for basic auth)

---

## 🔐 Step 2: Authentication Options

### Option A: Basic Authentication (Simple)

**For Personal/Individual Office 365 Accounts:**
- Use your regular Office 365 email and password
- Works immediately if basic auth is enabled

**Configuration:**
```env
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-regular-password
```

### Option B: App Password (Recommended for Organization Accounts)

**For Organization/Work Accounts:**
If your organization requires MFA (Multi-Factor Authentication), you'll need an App Password:

1. **Go to Microsoft Account Security:**
   - Visit: https://account.microsoft.com/security
   - Or: https://mysignins.microsoft.com/security-info

2. **Create App Password:**
   - Click "Security" → "Advanced security options"
   - Under "App passwords", click "Create a new app password"
   - Name it "Audit Checklist System"
   - Copy the generated password (16 characters)

3. **Use App Password:**
```env
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-16-character-app-password
```

### Option C: OAuth2 (Advanced - For Enterprise)

For enterprise deployments, OAuth2 is recommended. This requires additional setup with Azure AD.

---

## 🚀 Step 3: Configure in Azure App Service

### Method 1: Azure Portal (Recommended)

1. **Navigate to Azure Portal:**
   - Go to: https://portal.azure.com
   - Find your App Service: `audit-app-backend-2221` (or your app name)

2. **Open Configuration:**
   - Click **"Configuration"** in the left sidebar
   - Click **"Application settings"** tab
   - Click **"+ New application setting"** for each variable

3. **Add SMTP Settings:**

   **Setting 1:**
   - **Name:** `SMTP_HOST`
   - **Value:** `smtp.office365.com`
   - Click **"OK"**

   **Setting 2:**
   - **Name:** `SMTP_PORT`
   - **Value:** `587`
   - Click **"OK"**

   **Setting 3:**
   - **Name:** `SMTP_SECURE`
   - **Value:** `false`
   - Click **"OK"**

   **Setting 4:**
   - **Name:** `SMTP_USER`
   - **Value:** `your-email@yourdomain.com` (your Office 365 email)
   - Click **"OK"**

   **Setting 5:**
   - **Name:** `SMTP_PASSWORD`
   - **Value:** `your-office365-password` (or app password)
   - Click **"OK"**

   **Setting 6:**
   - **Name:** `SMTP_FROM`
   - **Value:** `your-email@yourdomain.com` (same as SMTP_USER)
   - Click **"OK"**

   **Setting 7:**
   - **Name:** `SMTP_FROM_NAME`
   - **Value:** `Audit Checklist System`
   - Click **"OK"**

   **Setting 8:**
   - **Name:** `APP_URL`
   - **Value:** `https://audit-app-frontend-xxxxx.azurestaticapps.net` (your frontend URL)
   - Click **"OK"**

4. **Save Configuration:**
   - Click **"Save"** at the top
   - Click **"Continue"** to confirm
   - Wait for the app to restart (usually 30-60 seconds)

### Method 2: Azure CLI

```bash
# Login to Azure
az login

# Set environment variables
az webapp config appsettings set \
  --name audit-app-backend-2221 \
  --resource-group audit-app-rg \
  --settings \
    SMTP_HOST=smtp.office365.com \
    SMTP_PORT=587 \
    SMTP_SECURE=false \
    SMTP_USER=your-email@yourdomain.com \
    SMTP_PASSWORD=your-password \
    SMTP_FROM=your-email@yourdomain.com \
    SMTP_FROM_NAME="Audit Checklist System" \
    APP_URL=https://your-frontend-url.com
```

---

## ✅ Step 4: Verify Configuration

1. **Check Backend Logs:**
   - Azure Portal → App Service → **"Log stream"** or **"Logs"**
   - Look for one of these messages:

   **✅ Success:**
   ```
   Email service is ready to send emails
   ```

   **❌ Not Configured:**
   ```
   Email service not configured. Set SMTP_USER and SMTP_PASSWORD environment variables to enable email notifications.
   ```

   **❌ Configuration Error:**
   ```
   Email service configuration error: [error details]
   Email notifications will be disabled. Please check SMTP settings.
   ```

2. **Restart App Service (if needed):**
   - Azure Portal → App Service → **"Overview"**
   - Click **"Restart"** button
   - Wait for restart to complete

---

## 🧪 Step 5: Test Email Notifications

### Test 1: Check Configuration Status

1. Restart your backend server
2. Check logs for: `Email service is ready to send emails`
3. If error appears, verify all settings are correct

### Test 2: Send Test Email

1. **In the Application:**
   - Log in to your app
   - Go to **Settings** → **Email Notifications**
   - Enable **"Enable Email Notifications"**
   - Enable specific notification types
   - Click **"Save Settings"**

2. **Trigger a Notification:**
   - Assign an action item to yourself
   - Or complete an audit
   - Check your Office 365 email inbox

3. **Check Email:**
   - Look in **Inbox** (may take 1-2 minutes)
   - Check **Junk/Spam** folder if not in inbox
   - Verify email format and links work

---

## 🔍 Troubleshooting

### Problem: "Email service configuration error"

**Possible Causes & Solutions:**

1. **Invalid Credentials:**
   - ✅ Verify `SMTP_USER` is your full email address
   - ✅ Verify `SMTP_PASSWORD` is correct
   - ✅ For MFA accounts, use App Password instead

2. **Port/Connection Issues:**
   - ✅ Verify `SMTP_PORT=587` (not 465)
   - ✅ Verify `SMTP_SECURE=false`
   - ✅ Check Azure firewall allows outbound SMTP

3. **Authentication Failed:**
   - ✅ Ensure basic auth is enabled (for personal accounts)
   - ✅ For org accounts, may need App Password or OAuth2
   - ✅ Check if account is locked or requires password reset

### Problem: "Connection timeout"

**Solutions:**
- ✅ Verify `SMTP_HOST=smtp.office365.com` (exact spelling)
- ✅ Check Azure App Service outbound network restrictions
- ✅ Verify Office 365 account is active and not suspended

### Problem: Emails not received

**Checklist:**
1. ✅ Backend logs show "Email service is ready"
2. ✅ User email address is correct in profile
3. ✅ "Enable Email Notifications" is ON in Settings
4. ✅ Specific notification type is enabled
5. ✅ Check spam/junk folder
6. ✅ Verify Office 365 mailbox is not full
7. ✅ Check backend logs for email sending errors

### Problem: "535 Authentication failed"

**Solutions:**
- ✅ Use App Password if MFA is enabled
- ✅ Verify password doesn't have special characters that need escaping
- ✅ Try resetting Office 365 password
- ✅ Check if account requires admin approval for SMTP

---

## 📝 Office 365 Specific Notes

### For Personal Accounts (@outlook.com, @hotmail.com, @live.com)

- ✅ Basic authentication usually works immediately
- ✅ Use regular password (no app password needed)
- ✅ Port 587 with STARTTLS

### For Organization Accounts (@yourdomain.com)

- ⚠️ May require App Password if MFA is enabled
- ⚠️ May require admin approval for SMTP access
- ⚠️ Check with IT admin if authentication fails
- ✅ Consider OAuth2 for enterprise deployments

### Security Best Practices

1. **Use App Passwords** for accounts with MFA
2. **Rotate Passwords** regularly
3. **Monitor Email Sending** in Office 365 admin center
4. **Set Up Alerts** for failed authentication attempts
5. **Use Dedicated Service Account** for production (recommended)

---

## 🔄 Quick Reference

### Complete Office 365 Configuration

```env
# Office 365 SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-password-or-app-password
SMTP_FROM=your-email@yourdomain.com
SMTP_FROM_NAME=Audit Checklist System
APP_URL=https://your-app-url.com
```

### Azure Portal Path

```
Azure Portal → App Services → audit-app-backend-2221 → Configuration → Application settings
```

### Verification Command

Check if email service is ready:
- Azure Portal → App Service → Log stream
- Look for: `Email service is ready to send emails`

---

## ✅ Configuration Checklist

- [ ] Office 365 account ready (email and password)
- [ ] App Password created (if MFA enabled)
- [ ] All 8 SMTP environment variables added to Azure App Service
- [ ] Configuration saved and app restarted
- [ ] Backend logs show "Email service is ready"
- [ ] User email preferences enabled in Settings
- [ ] Test email sent and received successfully

---

## 🆘 Still Having Issues?

1. **Check Backend Logs:**
   - Azure Portal → App Service → Log stream
   - Look for specific error messages

2. **Test SMTP Connection:**
   - Use an SMTP testing tool
   - Verify credentials work outside the app

3. **Contact Support:**
   - Office 365 admin (for org accounts)
   - Azure support (for infrastructure issues)

4. **Alternative:**
   - Consider SendGrid or AWS SES for better deliverability
   - See `EMAIL_SETUP_GUIDE.md` for other providers

---

## 📚 Related Documentation

- `docs/EMAIL_SETUP_GUIDE.md` - General email setup guide
- `docs/features/EMAIL_NOTIFICATIONS.md` - Email notification features
- `backend/utils/emailService.js` - Email service implementation

---

**Need Help?** Check the troubleshooting section above or review the backend logs for specific error messages.
