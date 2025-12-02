# GitHub Secrets for CI/CD Deployment

⚠️ **IMPORTANT: DELETE THIS FILE AFTER ADDING SECRETS TO GITHUB**

## Go to GitHub Repository → Settings → Secrets and variables → Actions

Add these 3 secrets:

---

## Secret 1: AZURE_CREDENTIALS

**Name:** `AZURE_CREDENTIALS`

**Value:** (Copy the entire JSON below)
```json
{
  "clientId": "fed1f507-5e37-4be5-a1cd-b85fba2639ee",
  "clientSecret": "qYA8Q~Q1OcMqDa~I2ozq5.dhCHOTX-8fEFLOcaaO",
  "subscriptionId": "d221f54b-9cf2-4308-a1f3-9dfbe7e7fb15",
  "tenantId": "cd5965ee-d9c8-4121-ba7e-ebad95187321",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

---

## Secret 2: AZURE_STATIC_WEB_APPS_API_TOKEN

**Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN`

**Value:**
```
d887c4b45646290f002f1c1b7fdd5c51ad50cb6e4a3914f230ab635df7d6125303-961aa669-7aab-4812-8c92-36e28e3ee07d0000807035a63400
```

---

## Secret 3: REACT_APP_API_URL

**Name:** `REACT_APP_API_URL`

**Value:**
```
https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net/api
```

---

## Steps to Add Secrets:

1. Go to: https://github.com/[YOUR-USERNAME]/audit_Checklists-app/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret name and value
4. Click "Add secret"

## After Adding All Secrets:

⚠️ **DELETE THIS FILE** - It contains sensitive credentials!

Run: `git rm GITHUB_SECRETS.md && git commit -m "Remove secrets file" && git push`

