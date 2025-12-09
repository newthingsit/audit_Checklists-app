# Office 365 Email Troubleshooting Guide

## Quick Diagnosis Steps

### Step 1: Check Email Service Status

1. **Check Azure App Service Logs:**
   - Go to Azure Portal → Your App Service (`audit-app-backend-2221`)
   - Click **"Log stream"** or **"Logs"** in the left sidebar
   - Look for one of these messages:

   **✅ Success:**
   ```
   ✅ Email service is ready to send emails
      Host: smtp.office365.com:587
      User: your-email@yourdomain.com
   ```

   **❌ Configuration Error:**
   ```
   ❌ Email service configuration error: [error details]
   Error code: EAUTH
   ⚠️  Authentication failed. Check SMTP_USER and SMTP_PASSWORD.
   ```

2. **Test Email Configuration (Admin Only):**
   - Log in as admin to your web app
   - Navigate to: `https://your-backend-url/api/auth/test-email?email=your-email@domain.com`
   - Or use this curl command:
   ```bash
   curl -X GET "https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api/auth/test-email?email=your-email@domain.com" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

---

## Common Issues and Solutions

### Issue 1: Authentication Failed (EAUTH Error)

**Symptoms:**
- Log shows: `Error code: EAUTH`
- Error message: "Authentication failed"

**Solutions:**

1. **For Office 365 with MFA (Multi-Factor Authentication):**
   - You **MUST** use an **App Password**, not your regular password
   - Steps to create App Password:
     1. Go to: https://account.microsoft.com/security
     2. Click **"Security"** → **"Advanced security options"**
     3. Under **"App passwords"**, click **"Create a new app password"**
     4. Name it: "Audit Checklist System"
     5. Copy the 16-character password
     6. Use this password in `SMTP_PASSWORD` (not your regular password)

2. **For Office 365 without MFA:**
   - Use your regular Office 365 password
   - Make sure account is not locked

3. **Verify Credentials:**
   - Double-check `SMTP_USER` matches your Office 365 email exactly
   - Double-check `SMTP_PASSWORD` has no extra spaces or quotes
   - Try logging into Outlook.com with the same credentials to verify they work

---

### Issue 2: Connection Timeout (ETIMEDOUT/ECONNREFUSED)

**Symptoms:**
- Log shows: `Error code: ETIMEDOUT` or `ECONNREFUSED`
- Error message: "Connection failed"

**Solutions:**

1. **Verify SMTP Settings:**
   ```
   SMTP_HOST=smtp.office365.com  (NOT smtp-mail.outlook.com)
   SMTP_PORT=587                  (NOT 465 or 25)
   SMTP_SECURE=false              (MUST be false for port 587)
   ```

2. **Check Azure App Service Network:**
   - Azure App Service should allow outbound SMTP connections by default
   - If using VNet integration, ensure SMTP ports are not blocked

3. **Test Connection:**
   - Try telnet from Azure Cloud Shell:
   ```bash
   telnet smtp.office365.com 587
   ```
   - Should connect successfully

---

### Issue 3: Emails Not Received

**Symptoms:**
- Email service shows success
- But emails don't arrive

**Solutions:**

1. **Check Spam/Junk Folder:**
   - Office 365 emails often go to spam initially
   - Mark as "Not Spam" to improve deliverability

2. **Verify APP_URL:**
   - Make sure `APP_URL` is set correctly
   - Should be your frontend URL (e.g., `https://app.litebitefoods.com`)
   - Used in password reset links

3. **Check Email Address:**
   - Verify recipient email is correct
   - Try sending to a different email address

---

### Issue 4: "Email service not configured" Message

**Symptoms:**
- Log shows: `Email service not configured`

**Solutions:**

1. **Verify Environment Variables in Azure:**
   - Go to Azure Portal → App Service → **Configuration** → **Application settings**
   - Check these are set:
     - `SMTP_HOST`
     - `SMTP_PORT`
     - `SMTP_USER`
     - `SMTP_PASSWORD`
     - `SMTP_FROM` (optional, defaults to SMTP_USER)
     - `SMTP_FROM_NAME` (optional)
     - `APP_URL` (required for password reset links)

2. **Restart App Service:**
   - After adding/updating environment variables
   - Go to **Overview** → Click **"Restart"**
   - Wait 30-60 seconds for restart

---

## Complete Office 365 Configuration Checklist

### ✅ Required Settings in Azure App Service:

| Setting Name | Value | Example |
|-------------|-------|---------|
| `SMTP_HOST` | `smtp.office365.com` | `smtp.office365.com` |
| `SMTP_PORT` | `587` | `587` |
| `SMTP_SECURE` | `false` | `false` |
| `SMTP_USER` | Your Office 365 email | `admin@yourdomain.com` |
| `SMTP_PASSWORD` | App Password (if MFA) or regular password | `abcd-efgh-ijkl-mnop` |
| `SMTP_FROM` | Your Office 365 email | `admin@yourdomain.com` |
| `SMTP_FROM_NAME` | Display name | `Audit Checklist System` |
| `APP_URL` | Your frontend URL | `https://app.litebitefoods.com` |

### ✅ Verification Steps:

1. **Check Logs After Restart:**
   ```
   ✅ Email service is ready to send emails
      Host: smtp.office365.com:587
      User: admin@yourdomain.com
   ```

2. **Test Email Endpoint:**
   - Call: `GET /api/auth/test-email?email=your-email@domain.com`
   - Should return: `{ "success": true, "message": "Test email sent successfully" }`

3. **Check Email Inbox:**
   - Look in Inbox (may take 1-2 minutes)
   - Check Spam/Junk folder
   - Verify email format and links work

---

## Advanced Troubleshooting

### Enable Detailed Logging

The email service now logs detailed error information. Check Azure App Service logs for:

- **Authentication errors:** Check SMTP_USER and SMTP_PASSWORD
- **Connection errors:** Check SMTP_HOST and SMTP_PORT
- **SMTP responses:** Shows Office 365 server responses

### Test SMTP Connection Manually

You can test Office 365 SMTP from Azure Cloud Shell:

```bash
# Install telnet
apt-get update && apt-get install -y telnet

# Test connection
telnet smtp.office365.com 587
```

Should see:
```
220 BYAPR01CA0001.outlook.office365.com Microsoft ESMTP MAIL Service
```

### Common Office 365 SMTP Errors

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `EAUTH` | Authentication failed | Use App Password if MFA enabled |
| `ETIMEDOUT` | Connection timeout | Check SMTP_HOST and network |
| `ECONNREFUSED` | Connection refused | Check SMTP_PORT (should be 587) |
| `535 5.7.3` | Authentication unsuccessful | Wrong password or need App Password |
| `550 5.7.1` | Relay denied | Check SMTP_USER matches sender |

---

## Still Not Working?

1. **Check Azure App Service Logs:**
   - Look for detailed error messages
   - Copy full error including error code

2. **Verify Office 365 Account:**
   - Try logging into Outlook.com with same credentials
   - Check if account is locked or requires verification

3. **Test with Different Email Provider:**
   - Temporarily try Gmail to verify email service works
   - If Gmail works, issue is Office 365 specific

4. **Contact Support:**
   - Provide:
     - Error messages from logs
     - SMTP configuration (hide password)
     - Test email endpoint response

---

## Quick Reference: Office 365 SMTP Settings

```env
# Office 365 SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-app-password-or-regular-password
SMTP_FROM=your-email@yourdomain.com
SMTP_FROM_NAME=Audit Checklist System
APP_URL=https://your-frontend-url.com
```

**Important Notes:**
- Port **587** uses STARTTLS (not SSL)
- `SMTP_SECURE=false` is correct for port 587
- Use **App Password** if MFA is enabled
- `SMTP_USER` must be full email address
- `APP_URL` is required for password reset links

---

## Test Email Endpoint

**Endpoint:** `GET /api/auth/test-email?email=your-email@domain.com`

**Authentication:** Requires admin token

**Response (Success):**
```json
{
  "success": true,
  "message": "Test email sent successfully to your-email@domain.com",
  "note": "Please check your inbox (and spam folder) for the test email."
}
```

**Response (Error):**
```json
{
  "error": "Failed to send test email",
  "details": "Check server logs for detailed error information.",
  "troubleshooting": [
    "1. Verify SMTP_USER and SMTP_PASSWORD are correct",
    "2. For Office 365 with MFA, use App Password instead of regular password",
    "3. Check SMTP_HOST (should be smtp.office365.com)",
    "4. Check SMTP_PORT (should be 587 for Office 365)",
    "5. Verify firewall allows outbound SMTP connections",
    "6. Check Azure App Service logs for detailed error messages"
  ]
}
```

---

## Next Steps After Fixing

1. **Restart App Service** after updating configuration
2. **Check logs** for success message
3. **Test email** using test endpoint
4. **Try forgot password** feature
5. **Check spam folder** for test emails
