# 🚀 Azure Deployment Guide

This guide will help you deploy the Audit Pro application to Microsoft Azure.

## 📋 Prerequisites

1. **Azure Account** - [Create free account](https://azure.microsoft.com/free/) ($200 credit)
2. **Azure CLI** - [Install Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
3. **GitHub Account** - For CI/CD automation
4. **Node.js 18+** - For local builds

---

## 🏗️ Azure Resources to Create

### Step 1: Create Resource Group
```bash
az login
az group create --name audit-app-rg --location eastus
```

### Step 2: Create Azure SQL Database
```bash
# Create SQL Server
az sql server create \
  --name audit-sql-server \
  --resource-group audit-app-rg \
  --location eastus \
  --admin-user sqladmin \
  --admin-password "YourSecurePassword123!"

# Create Database
az sql db create \
  --resource-group audit-app-rg \
  --server audit-sql-server \
  --name audit_checklists \
  --service-objective Basic

# Allow Azure services to access
az sql server firewall-rule create \
  --resource-group audit-app-rg \
  --server audit-sql-server \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### Step 3: Create App Service (Backend)
```bash
# Create App Service Plan
az appservice plan create \
  --name audit-app-plan \
  --resource-group audit-app-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name audit-app-backend \
  --resource-group audit-app-rg \
  --plan audit-app-plan \
  --runtime "NODE:18-lts"

# Configure Environment Variables
az webapp config appsettings set \
  --name audit-app-backend \
  --resource-group audit-app-rg \
  --settings \
    NODE_ENV=production \
    DB_TYPE=mssql \
    DB_HOST=audit-sql-server.database.windows.net \
    DB_NAME=audit_checklists \
    DB_USER=sqladmin \
    DB_PASSWORD="YourSecurePassword123!" \
    JWT_SECRET="your-64-char-secret-here" \
    CORS_ORIGINS="https://your-static-app.azurestaticapps.net"
```

### Step 4: Create Static Web App (Frontend)
```bash
az staticwebapp create \
  --name audit-app-frontend \
  --resource-group audit-app-rg \
  --source https://github.com/YOUR_USERNAME/audit-app \
  --location eastus2 \
  --branch main \
  --app-location "web" \
  --output-location "build" \
  --login-with-github
```

### Step 5: Create Blob Storage (Photos)
```bash
# Create Storage Account
az storage account create \
  --name auditappstorage \
  --resource-group audit-app-rg \
  --location eastus \
  --sku Standard_LRS

# Create Container
az storage container create \
  --name audit-photos \
  --account-name auditappstorage \
  --public-access blob
```

---

## ⚙️ Environment Variables

### Backend (.env for Azure App Service)

```env
# Server
NODE_ENV=production
PORT=8080

# Azure SQL Database
DB_TYPE=mssql
DB_HOST=audit-sql-server.database.windows.net
DB_NAME=audit_checklists
DB_USER=sqladmin
DB_PASSWORD=YourSecurePassword123!

# Security
JWT_SECRET=generate-64-char-secret-using-crypto
CORS_ORIGINS=https://your-static-app.azurestaticapps.net

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=auditappstorage
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
AZURE_STORAGE_CONTAINER_NAME=audit-photos
```

### Frontend (.env for build)

```env
REACT_APP_API_URL=https://audit-app-backend.azurewebsites.net/api
REACT_APP_NAME=Audit Pro
REACT_APP_VERSION=1.12.0
```

---

## 🔄 GitHub Actions Setup

### Secrets Required

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web Apps deployment token | Azure Portal → Static Web App → Manage deployment token |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | App Service publish profile | Azure Portal → App Service → Get publish profile |
| `REACT_APP_API_URL` | Backend API URL | `https://your-backend.azurewebsites.net/api` |

---

## 📦 Manual Deployment

### Deploy Backend
```bash
cd backend
npm ci --only=production
zip -r backend.zip . -x "node_modules/*" -x ".git/*"

az webapp deployment source config-zip \
  --resource-group audit-app-rg \
  --name audit-app-backend \
  --src backend.zip
```

### Deploy Frontend
```bash
cd web
npm ci
REACT_APP_API_URL=https://audit-app-backend.azurewebsites.net/api npm run build

# Upload build folder to Static Web App via Azure Portal or CLI
```

---

## 🔒 Security Checklist

- [ ] Use strong passwords for SQL Server
- [ ] Generate cryptographically secure JWT_SECRET
- [ ] Enable HTTPS only on App Service
- [ ] Configure SQL firewall rules
- [ ] Enable Azure AD authentication (optional)
- [ ] Set up Azure Key Vault for secrets (recommended)
- [ ] Configure backup for SQL Database
- [ ] Enable monitoring and alerts

---

## 💰 Cost Estimate

| Resource | SKU | Monthly Cost |
|----------|-----|--------------|
| App Service | B1 Basic | ~$13 |
| Static Web Apps | Free | $0 |
| Azure SQL | Basic (2GB) | ~$5 |
| Blob Storage | Standard LRS | ~$1-2 |
| **Total** | | **~$19-21** |

---

## 🔗 Useful Links

- [Azure App Service Docs](https://docs.microsoft.com/azure/app-service/)
- [Azure Static Web Apps Docs](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure SQL Database Docs](https://docs.microsoft.com/azure/azure-sql/)
- [Azure Blob Storage Docs](https://docs.microsoft.com/azure/storage/blobs/)

---

## 📞 Support

If you encounter issues:
1. Check Azure Portal → Your Resource → Logs
2. Enable Application Insights for detailed monitoring
3. Review GitHub Actions logs for deployment errors

