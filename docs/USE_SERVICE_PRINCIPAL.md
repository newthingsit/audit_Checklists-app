# 🔐 Use Service Principal Instead of Publish Profile

Since basic authentication is disabled, we'll use Azure Service Principal (better for CI/CD).

---

## Step 1: Create Service Principal via Azure Portal

1. **Azure Portal** → Search **"Azure Active Directory"**
2. Click **"App registrations"** (left sidebar)
3. Click **"+ New registration"**
4. Fill in:
   - **Name**: `audit-app-github-actions`
   - **Supported account types**: Single tenant
   - Click **"Register"**
5. **Copy these values** (you'll need them):
   - **Application (client) ID**
   - **Directory (tenant) ID**

---

## Step 2: Create Client Secret

1. In your app registration, click **"Certificates & secrets"** (left sidebar)
2. Click **"+ New client secret"**
3. Description: `GitHub Actions`
4. Expires: 24 months
5. Click **"Add"**
6. **Copy the secret value immediately** (you won't see it again!)

---

## Step 3: Assign Role to App Service

1. Go to your **App Service**: `audit-app-backend-2221`
2. Click **"Access control (IAM)"** (left sidebar)
3. Click **"+ Add"** → **"Add role assignment"**
4. **Role**: Select **"Contributor"**
5. **Assign access to**: User, group, or service principal
6. **Select**: Search for `audit-app-github-actions` → Select it
7. Click **"Review + assign"**

---

## Step 4: Update GitHub Secrets

Instead of `AZURE_WEBAPP_PUBLISH_PROFILE`, add these secrets:

| Secret Name | Value |
|-------------|-------|
| `AZURE_CLIENT_ID` | Application (client) ID from Step 1 |
| `AZURE_TENANT_ID` | Directory (tenant) ID from Step 1 |
| `AZURE_CLIENT_SECRET` | Secret value from Step 2 |
| `AZURE_SUBSCRIPTION_ID` | Your subscription ID (from Azure Portal) |
| `AZURE_RESOURCE_GROUP` | `audit-app-rg` |
| `AZURE_WEBAPP_NAME` | `audit-app-backend-2221` |

---

## Step 5: Update GitHub Actions Workflow

We'll need to update the workflow to use Service Principal instead of publish profile.

---

**This is more secure and better for CI/CD!**

