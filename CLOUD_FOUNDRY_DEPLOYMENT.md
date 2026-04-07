# Cloud Foundry Deployment Guide

This guide provides step-by-step instructions for deploying the Restaurant Audit & Checklist application to Cloud Foundry.

## Prerequisites

1. **Cloud Foundry CLI**: Install the Cloud Foundry CLI
   ```bash
   # macOS
   brew install cloudfoundry/tap/cf-cli
   
   # Windows (using chocolatey)
   choco install cloudfoundry-cli
   
   # Linux
   wget -q -O - https://packages.cloudfoundry.org/debian/cli.cloudfoundry.org.key | sudo apt-key add -
   echo "deb https://packages.cloudfoundry.org/debian stable main" | sudo tee /etc/apt/sources.list.d/cloudfoundry-cli.list
   sudo apt-get update
   sudo apt-get install cf8-cli
   ```

2. **Cloud Foundry Account**: Sign up for a Cloud Foundry provider:
   - [Pivotal Web Services (PWS)](https://run.pivotal.io)
   - [IBM Cloud Foundry](https://www.ibm.com/cloud/cloud-foundry)
   - [SAP Cloud Platform](https://www.sap.com/products/cloud-platform.html)
   - Or use your organization's private Cloud Foundry instance

3. **PostgreSQL Service**: Your Cloud Foundry instance should have a PostgreSQL service available

## Architecture

The application consists of three components:
1. **Backend API** (Node.js/Express) - deployed to Cloud Foundry
2. **Web Frontend** (React) - deployed to Cloud Foundry with staticfile buildpack
3. **Mobile App** (React Native) - distributed via Expo/EAS (not affected by CF deployment)

## Deployment Steps

### Step 1: Login to Cloud Foundry

```bash
# Login to your Cloud Foundry instance
cf login -a <API_ENDPOINT>

# Example for PWS:
cf login -a api.run.pivotal.io

# You'll be prompted for:
# - Email
# - Password
# - Organization (if you have multiple)
# - Space (if you have multiple)
```

### Step 2: Create PostgreSQL Service

```bash
# List available PostgreSQL services
cf marketplace

# Create a PostgreSQL service instance
# Replace 'elephantsql' and 'turtle' with your provider's service name and plan
cf create-service elephantsql turtle audit-checklist-db

# Wait for service to be created
cf service audit-checklist-db
```

### Step 3: Prepare Backend for Deployment

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Update environment variables** - Create a `vars.yml` file for sensitive data:
   ```bash
   cat > vars.yml << 'EOF'
   jwt-secret: YOUR_STRONG_JWT_SECRET_HERE
   allowed-origins: https://audit-checklist-web.cfapps.io,https://app.litebitefoods.com
   node-env: production
   EOF
   ```

3. **Review manifest.yml**:
   The `backend/manifest.yml` file is already configured with:
   - Memory: 512MB
   - Instances: 1 (can scale later)
   - Buildpack: nodejs_buildpack
   - Health check: HTTP endpoint at `/api/health`
   - Database service binding

### Step 4: Deploy Backend

```bash
# From the backend directory
cf push

# Or with variables file:
cf push --vars-file vars.yml

# Monitor deployment
cf logs audit-checklist-backend --recent
```

**Verify backend deployment**:
```bash
# Check app status
cf app audit-checklist-backend

# Get the backend URL
cf apps

# Test health endpoint
curl https://audit-checklist-backend.cfapps.io/api/health
```

### Step 5: Prepare Web Frontend for Deployment

1. **Update API URL** in web configuration:
   ```bash
   cd ../web
   
   # Create production environment file
   cat > .env.production << 'EOF'
   REACT_APP_API_URL=https://audit-checklist-backend.cfapps.io/api
   EOF
   ```

2. **Build the web application**:
   ```bash
   npm install
   npm run build
   ```

3. **Create Staticfile for the staticfile buildpack**:
   ```bash
   cat > build/Staticfile << 'EOF'
   root: .
   location_include: includes/*.conf
   
   pushstate: enabled
   
   http_strict_transport_security: true
   http_strict_transport_security_include_subdomains: true
   force_https: true
   EOF
   ```

4. **Create nginx configuration for React Router**:
   ```bash
   mkdir -p build/includes
   cat > build/includes/routes.conf << 'EOF'
   # Handle React Router - send all requests to index.html
   try_files $uri $uri/ /index.html =404;
   EOF
   ```

### Step 6: Deploy Web Frontend

```bash
# From the web directory (after building)
cf push

# Monitor deployment
cf logs audit-checklist-web --recent
```

**Verify web deployment**:
```bash
# Check app status
cf app audit-checklist-web

# Get the web URL
cf apps

# Open in browser
open https://audit-checklist-web.cfapps.io
```

### Step 7: Configure Custom Domains (Optional)

If you want to use custom domains like `app.litebitefoods.com`:

```bash
# Add custom domain to your space
cf create-domain <YOUR_ORG> litebitefoods.com

# Map custom domain to web app
cf map-route audit-checklist-web litebitefoods.com --hostname app

# Map custom domain to backend API (optional)
cf map-route audit-checklist-backend litebitefoods.com --hostname api

# Update DNS records:
# CNAME: app.litebitefoods.com -> audit-checklist-web.cfapps.io
# CNAME: api.litebitefoods.com -> audit-checklist-backend.cfapps.io
```

### Step 8: Set Environment Variables

Set additional environment variables for the backend:

```bash
# Set environment variables
cf set-env audit-checklist-backend JWT_SECRET "your-super-secret-jwt-key"
cf set-env audit-checklist-backend ALLOWED_ORIGINS "https://audit-checklist-web.cfapps.io,https://app.litebitefoods.com"
cf set-env audit-checklist-backend NODE_ENV "production"

# Restage the app to apply environment variables
cf restage audit-checklist-backend
```

### Step 9: Scale Applications (Optional)

```bash
# Scale backend to 2 instances
cf scale audit-checklist-backend -i 2

# Scale web to 2 instances
cf scale audit-checklist-web -i 2

# Adjust memory if needed
cf scale audit-checklist-backend -m 1G
```

## Post-Deployment Tasks

### 1. Database Migration

If you need to migrate data from SQLite to PostgreSQL:

```bash
# SSH into the backend container
cf ssh audit-checklist-backend

# Or run a one-off task
cf run-task audit-checklist-backend "node scripts/migrate-to-postgres.js"
```

### 2. Seed Initial Data

```bash
# Run seed script
cf run-task audit-checklist-backend "node seeds/seed-data.js"
```

### 3. Enable Auto-scaling (Optional)

```bash
# Install autoscaler plugin
cf install-plugin -r CF-Community app-autoscaler-plugin

# Create autoscaling policy
cf create-autoscaling-rule audit-checklist-backend cpu 60 80 1 4
```

### 4. Configure Logging

```bash
# Stream logs to terminal
cf logs audit-checklist-backend

# Stream logs to external service (e.g., Papertrail)
cf cups papertrail -l syslog-tls://logs.papertrailapp.com:12345
cf bind-service audit-checklist-backend papertrail
cf restage audit-checklist-backend
```

## Monitoring and Maintenance

### Check Application Status

```bash
# View all apps
cf apps

# View specific app details
cf app audit-checklist-backend

# View app events
cf events audit-checklist-backend
```

### View Logs

```bash
# Recent logs
cf logs audit-checklist-backend --recent

# Stream live logs
cf logs audit-checklist-backend
```

### Restart Applications

```bash
# Restart with zero downtime
cf restart audit-checklist-backend

# Restage (rebuild) application
cf restage audit-checklist-backend

# Stop and start (causes downtime)
cf stop audit-checklist-backend
cf start audit-checklist-backend
```

### Update Application

When you have new code to deploy:

```bash
# Backend update
cd backend
cf push

# Web frontend update
cd web
npm run build
cf push
```

## Troubleshooting

### Application Won't Start

1. **Check logs**:
   ```bash
   cf logs audit-checklist-backend --recent
   ```

2. **Check environment variables**:
   ```bash
   cf env audit-checklist-backend
   ```

3. **Check service bindings**:
   ```bash
   cf services
   cf service audit-checklist-db
   ```

4. **SSH into container**:
   ```bash
   cf ssh audit-checklist-backend
   ```

### Database Connection Issues

1. **Verify service is bound**:
   ```bash
   cf services
   ```

2. **Check VCAP_SERVICES**:
   ```bash
   cf env audit-checklist-backend
   # Look for VCAP_SERVICES section
   ```

3. **Update database connection code** to use Cloud Foundry environment variables:
   ```javascript
   // In backend/config/database.js
   const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');
   const dbService = vcapServices['elephantsql'] || vcapServices['postgresql'];
   const dbCredentials = dbService ? dbService[0].credentials : null;
   
   const config = {
     host: dbCredentials?.host || process.env.DB_HOST,
     port: dbCredentials?.port || process.env.DB_PORT,
     database: dbCredentials?.database || process.env.DB_NAME,
     username: dbCredentials?.username || process.env.DB_USER,
     password: dbCredentials?.password || process.env.DB_PASSWORD
   };
   ```

### CORS Issues

If you encounter CORS errors:

1. **Update ALLOWED_ORIGINS**:
   ```bash
   cf set-env audit-checklist-backend ALLOWED_ORIGINS "https://audit-checklist-web.cfapps.io,https://app.litebitefoods.com"
   cf restage audit-checklist-backend
   ```

2. **Verify web app is using correct API URL**:
   - Check `web/.env.production`
   - Rebuild and redeploy web app

### Performance Issues

1. **Increase memory**:
   ```bash
   cf scale audit-checklist-backend -m 1G
   ```

2. **Add more instances**:
   ```bash
   cf scale audit-checklist-backend -i 3
   ```

3. **Enable compression** (already enabled in backend)

## Rolling Back

If you need to roll back to a previous version:

```bash
# View previous deployments
cf app audit-checklist-backend --guid
cf revisions audit-checklist-backend

# Roll back to previous revision
cf rollback audit-checklist-backend

# Or push a specific version from git
git checkout <previous-commit>
cf push
```

## Security Best Practices

1. **Use environment variables for secrets** - Never commit secrets to git
2. **Enable HTTPS** - Cloud Foundry provides HTTPS by default
3. **Set strong JWT secret**:
   ```bash
   # Generate a strong secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Set it
   cf set-env audit-checklist-backend JWT_SECRET "<generated-secret>"
   ```
4. **Restrict CORS origins** - Only allow your production domains
5. **Keep dependencies updated**:
   ```bash
   npm audit
   npm update
   ```

## Cost Optimization

1. **Use free tiers** when available (e.g., PWS free trial)
2. **Scale down non-production environments**:
   ```bash
   cf scale audit-checklist-backend -i 1
   cf scale audit-checklist-backend -m 256M
   ```
3. **Stop development instances** when not in use:
   ```bash
   cf stop audit-checklist-backend-dev
   ```
4. **Monitor usage**:
   ```bash
   cf app audit-checklist-backend
   ```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy-to-cf.yml`:

```yaml
name: Deploy to Cloud Foundry

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Install CF CLI
      run: |
        wget -q -O - https://packages.cloudfoundry.org/debian/cli.cloudfoundry.org.key | sudo apt-key add -
        echo "deb https://packages.cloudfoundry.org/debian stable main" | sudo tee /etc/apt/sources.list.d/cloudfoundry-cli.list
        sudo apt-get update
        sudo apt-get install cf8-cli
    
    - name: Login to CF
      run: |
        cf login -a ${{ secrets.CF_API }} -u ${{ secrets.CF_USERNAME }} -p ${{ secrets.CF_PASSWORD }} -o ${{ secrets.CF_ORG }} -s ${{ secrets.CF_SPACE }}
    
    - name: Deploy Backend
      run: |
        cd backend
        cf push --vars-file ../vars.yml
    
    - name: Build and Deploy Web
      run: |
        cd web
        npm ci
        npm run build
        cf push
```

## Additional Resources

- [Cloud Foundry Documentation](https://docs.cloudfoundry.org/)
- [Cloud Foundry CLI Reference](https://cli.cloudfoundry.org/en-US/v8/)
- [Cloud Foundry Buildpacks](https://docs.cloudfoundry.org/buildpacks/)
- [Node.js Buildpack](https://docs.cloudfoundry.org/buildpacks/node/index.html)
- [Staticfile Buildpack](https://docs.cloudfoundry.org/buildpacks/staticfile/index.html)

## Support

For deployment issues:
- Check Cloud Foundry logs: `cf logs <app-name> --recent`
- Review application events: `cf events <app-name>`
- Check service status: `cf services`
- Contact your Cloud Foundry administrator
- Review project documentation in `docs/`

---

**Last Updated**: February 2026
**Version**: 1.0.0
