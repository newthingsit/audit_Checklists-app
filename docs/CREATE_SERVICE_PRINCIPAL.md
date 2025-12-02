# 🔐 Create Azure Service Principal (Manual Method)

Since Azure CLI commands are having issues, here are **3 ways** to create the Service Principal:

---

## ✅ Method 1: Run PowerShell Script (Easiest)

1. **Open PowerShell** (as Administrator)
2. **Navigate to project**:
   ```powershell
   cd D:\audit_Checklists-app
   ```
3. **Run the script**:
   ```powershell
   .\create-service-principal.ps1
   ```
4. **Copy the JSON output**
5. **Add to GitHub Secrets** (see below)

---

## ✅ Method 2: Azure Portal (No CLI Needed)

### Step 1: Create Service Principal
1. Go to: **https://portal.azure.com**
2. Search: **"Azure Active Directory"** (or **"Microsoft Entra ID"**)
3. Click **"App registrations"** (left sidebar)
4. Click **"+ New registration"** (top)
5. **Name**: `audit-app-github-actions`
6. Click **"Register"**
7. **Copy these values** (you'll need them):
   - **Application (client) ID** (e.g., `abc123...`)
   - **Directory (tenant) ID** (e.g., `xyz789...`)

### Step 2: Create Client Secret
1. In the same app registration page:
2. Click **"Certificates & secrets"** (left sidebar)
3. Click **"+ New client secret"**
4. **Description**: `GitHub Actions`
5. **Expires**: `24 months` (or your preference)
6. Click **"Add"**
7. **⚠️ IMPORTANT**: Copy the **Value** immediately (you can't see it again!)
   - It looks like: `~abc123def456...`

### Step 3: Assign Role
1. Go to: **https://portal.azure.com**
2. Search: **"Resource groups"**
3. Click on **`audit-app-rg`**
4. Click **"Access control (IAM)"** (left sidebar)
5. Click **"+ Add"** → **"Add role assignment"**
6. **Role**: Select **"Contributor"**
7. **Assign access to**: **"User, group, or service principal"**
8. **Select**: Search for `audit-app-github-actions` and select it
9. Click **"Review + assign"** → **"Review + assign"**

### Step 4: Create JSON for GitHub
Create a JSON file with this format:

```json
{
  "clientId": "YOUR_APPLICATION_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET_VALUE",
  "subscriptionId": "d221f54b-9cf2-4308-a1f3-9dfbe7e7fb15",
  "tenantId": "YOUR_TENANT_ID",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**Replace:**
- `YOUR_APPLICATION_CLIENT_ID` → Application (client) ID from Step 1
- `YOUR_CLIENT_SECRET_VALUE` → Secret value from Step 2
- `YOUR_TENANT_ID` → Directory (tenant) ID from Step 1

---

## ✅ Method 3: Azure CLI (If Working)

```powershell
az ad sp create-for-rbac `
  --name "audit-app-github-actions" `
  --role contributor `
  --scopes /subscriptions/d221f54b-9cf2-4308-a1f3-9dfbe7e7fb15/resourceGroups/audit-app-rg `
  --sdk-auth
```

Copy the entire JSON output.

---

## 📋 Add to GitHub Secrets

1. Go to: **https://github.com/newthingsit/audit_Checklists-app/settings/secrets/actions**
2. Click **"New repository secret"**
3. **Name**: `AZURE_CREDENTIALS` (exact name, case-sensitive)
4. **Secret**: Paste the **entire JSON** (from any method above)
5. Click **"Add secret"**

✅ **Done!**

---

## 🎯 Next Steps

After adding `AZURE_CREDENTIALS`:

1. ✅ Add `AZURE_STATIC_WEB_APPS_API_TOKEN` (see `STEP_BY_STEP_SECRETS.md`)
2. ✅ Add `REACT_APP_API_URL` (see `STEP_BY_STEP_SECRETS.md`)
3. ✅ Update CORS settings
4. ✅ Push code to trigger deployment

---

## ❓ Troubleshooting

**"Service principal already exists"**:
- Use a different name: `audit-app-github-actions-v2`
- Or delete the old one first in Azure Portal

**"Insufficient permissions"**:
- You need **Owner** or **User Access Administrator** role on the subscription
- Ask your Azure admin to assign the role

**"Resource group not found"**:
- Check the resource group name in Azure Portal
- Update the script/command with the correct name
