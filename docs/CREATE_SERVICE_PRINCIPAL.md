# 🔐 Create Azure Service Principal for GitHub Actions

This is **better than publish profile** for CI/CD deployments.

---

## Step 1: Create Service Principal via Azure Portal

1. **Azure Portal** → Search **"Azure Active Directory"**
2. Click **"App registrations"** (left sidebar)
3. Click **"+ New registration"**
4. Fill in:
   - **Name**: `audit-app-github-actions`
   - **Supported account types**: **Accounts in this organizational directory only**
   - Click **"Register"**
5. **Copy these values** (save them!):
   - **Application (client) ID** - Copy this!
   - **Directory (tenant) ID** - Copy this!

---

## Step 2: Create Client Secret

1. In your app registration, click **"Certificates & secrets"** (left sidebar)
2. Click **"+ New client secret"**
3. Fill in:
   - **Description**: `GitHub Actions Deployment`
   - **Expires**: **24 months** (or your preference)
4. Click **"Add"**
5. **Copy the secret VALUE immediately** (you won't see it again!)
   - It's under "Value" column (not Secret ID)

---

## Step 3: Assign Contributor Role

1. Go to your **App Service**: `audit-app-backend-2221`
2. Click **"Access control (IAM)"** (left sidebar)
3. Click **"+ Add"** → **"Add role assignment"**
4. Fill in:
   - **Role**: **Contributor**
   - **Assign access to**: **Managed identity**
   - **Members**: Click **"+ Select members"**
   - Search for: `audit-app-github-actions`
   - Select it → Click **"Select"**
5. Click **"Review + assign"** → **"Review + assign"**

---

## Step 4: Create JSON for GitHub Secret

Create a JSON with these values:

```json
{
  "clientId": "YOUR_APPLICATION_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET_VALUE",
  "subscriptionId": "d221f54b-9cf2-4308-a1f3-9dfbe7e7fb15",
  "tenantId": "YOUR_TENANT_ID"
}
```

**To get Subscription ID:**
- Azure Portal → Your App Service → Overview → Copy "Subscription ID"

---

## Step 5: Add to GitHub Secrets

1. Go to: https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions
2. Click **"New repository secret"**
3. **Name**: `AZURE_CREDENTIALS`
4. **Secret**: Paste the **entire JSON** from Step 4
5. Click **"Add secret"**

---

## ✅ Done!

Now your GitHub Actions will use Service Principal instead of publish profile.

**This is more secure and better for CI/CD!** 🚀

---

## 📝 Summary of Secrets Needed

| Secret Name | What It Contains |
|-------------|------------------|
| `AZURE_CREDENTIALS` | JSON with clientId, clientSecret, subscriptionId, tenantId |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web Apps deployment token |
| `REACT_APP_API_URL` | `https://audit-app-backend-2221.azurewebsites.net/api` |

**Only 3 secrets needed now!** (instead of publish profile)

