# Cloud Foundry Deployment - Getting Started

Welcome! This guide will help you deploy your Restaurant Audit & Checklist application to Cloud Foundry in minutes.

## 🎯 What You Get

This deployment package includes everything you need:
- ✅ Pre-configured manifest files for backend and frontend
- ✅ Automated deployment script
- ✅ Comprehensive documentation
- ✅ CI/CD pipeline with GitHub Actions
- ✅ Security best practices
- ✅ Database configuration for PostgreSQL
- ✅ Health checks and monitoring setup

## 🚀 Quick Start (5 Minutes)

### Prerequisites

1. **Install Cloud Foundry CLI**:
   ```bash
   # macOS
   brew install cloudfoundry/tap/cf-cli
   
   # Windows
   choco install cloudfoundry-cli
   
   # Linux
   wget -q -O - https://packages.cloudfoundry.org/debian/cli.cloudfoundry.org.key | sudo apt-key add -
   echo "deb https://packages.cloudfoundry.org/debian stable main" | sudo tee /etc/apt/sources.list.d/cloudfoundry-cli.list
   sudo apt-get update && sudo apt-get install cf8-cli
   ```

2. **Sign up for Cloud Foundry**:
   - [Pivotal Web Services](https://run.pivotal.io) (Recommended for getting started)
   - [IBM Cloud Foundry](https://www.ibm.com/cloud/cloud-foundry)
   - Or use your organization's Cloud Foundry instance

### Deploy in 3 Steps

#### Step 1: Login to Cloud Foundry

```bash
cf login -a api.run.pivotal.io
# Enter your email and password
```

#### Step 2: Create PostgreSQL Service

```bash
# List available services
cf marketplace | grep postgres

# Create database (example using ElephantSQL)
cf create-service elephantsql turtle audit-checklist-db

# Wait for it to be ready (check status)
cf service audit-checklist-db
```

#### Step 3: Deploy with the Automated Script

```bash
# Make script executable (if not already)
chmod +x deploy-to-cf.sh

# Run deployment script
./deploy-to-cf.sh
```

The script will:
1. ✅ Check prerequisites
2. ✅ Verify you're logged in
3. ✅ Generate secure JWT secret
4. ✅ Deploy backend API
5. ✅ Build and deploy web frontend
6. ✅ Verify both deployments

**That's it!** Your app is now live on Cloud Foundry! 🎉

### Get Your URLs

```bash
# View all your applications
cf apps

# You'll see URLs like:
# Backend:  https://audit-checklist-backend.cfapps.io
# Frontend: https://audit-checklist-web.cfapps.io
```

## 📚 Documentation Structure

Choose your path based on your needs:

### For Quick Deployment
1. **[Getting Started](#-quick-start-5-minutes)** ← You are here
2. **[Pre-Deployment Checklist](CLOUD_FOUNDRY_CHECKLIST.md)** - Verify you're ready
3. **[Quick Reference](CLOUD_FOUNDRY_QUICK_REFERENCE.md)** - Common commands

### For Detailed Setup
1. **[Complete Deployment Guide](CLOUD_FOUNDRY_DEPLOYMENT.md)** - Step-by-step walkthrough
2. **[Architecture & Planning](docs/deployment/HOSTING_PLAN.md)** - Understand the big picture
3. **[GitHub Actions CI/CD](.github/workflows/deploy-cloud-foundry.yml)** - Automated deployments

## 🎓 What's Next?

### After Deployment

1. **Test Your App**:
   ```bash
   # Test backend health
   curl https://audit-checklist-backend.cfapps.io/api/health
   
   # Open web app in browser
   open https://audit-checklist-web.cfapps.io
   ```

2. **Set Up Custom Domain** (Optional):
   ```bash
   # Map your domain
   cf map-route audit-checklist-web yourdomain.com --hostname app
   
   # Update DNS:
   # CNAME: app.yourdomain.com → audit-checklist-web.cfapps.io
   ```

3. **Configure Monitoring**:
   - Set up log aggregation: `cf logs audit-checklist-backend`
   - Enable uptime monitoring
   - Configure alerts

### Scaling Your App

```bash
# Scale to multiple instances
cf scale audit-checklist-backend -i 3

# Increase memory
cf scale audit-checklist-backend -m 1G

# Auto-scaling (if supported)
cf enable-autoscaling audit-checklist-backend
```

### Updating Your App

```bash
# After making code changes:
cd backend
cf push --vars-file vars.yml

# For web:
cd web
npm run build
cf push
```

## 🔒 Security Checklist

Before going to production:

- [ ] Strong JWT secret generated (not default)
- [ ] ALLOWED_ORIGINS configured for your domains only
- [ ] Database credentials secured via VCAP_SERVICES
- [ ] HTTPS enabled (automatic in Cloud Foundry)
- [ ] Rate limiting configured (already in backend)
- [ ] vars.yml added to .gitignore (already done)
- [ ] Security headers configured (already in code)

## 🛠 Troubleshooting

### Application Won't Start?

```bash
# Check logs for errors
cf logs audit-checklist-backend --recent

# Check application status
cf app audit-checklist-backend

# Check if database service is bound
cf services
```

### Can't Connect to Database?

```bash
# Verify service is created
cf service audit-checklist-db

# Check if bound to application
cf services

# Bind if needed
cf bind-service audit-checklist-backend audit-checklist-db
cf restage audit-checklist-backend
```

### CORS Errors?

```bash
# Update allowed origins
cf set-env audit-checklist-backend ALLOWED_ORIGINS "https://your-domain.com,https://audit-checklist-web.cfapps.io"
cf restart audit-checklist-backend
```

### Still Having Issues?

1. Check the [Complete Troubleshooting Guide](CLOUD_FOUNDRY_DEPLOYMENT.md#troubleshooting)
2. Review [Cloud Foundry Documentation](https://docs.cloudfoundry.org/)
3. Check application logs: `cf logs <app-name> --recent`
4. SSH into container: `cf ssh <app-name>`

## 📋 File Overview

Here's what each file does:

| File | Purpose |
|------|---------|
| `backend/manifest.yml` | Backend deployment configuration |
| `web/manifest.yml` | Frontend deployment configuration |
| `backend/.cfignore` | Files to exclude from backend deployment |
| `web/.cfignore` | Files to exclude from web deployment |
| `backend/vars.yml.template` | Template for environment variables |
| `deploy-to-cf.sh` | Automated deployment script |
| `CLOUD_FOUNDRY_DEPLOYMENT.md` | Complete deployment guide |
| `CLOUD_FOUNDRY_CHECKLIST.md` | Pre-deployment checklist |
| `CLOUD_FOUNDRY_QUICK_REFERENCE.md` | Common commands reference |
| `.github/workflows/deploy-cloud-foundry.yml` | CI/CD pipeline |

## 💡 Pro Tips

1. **Use the Automated Script**: The `deploy-to-cf.sh` script handles most complexities
2. **Start Small**: Deploy to free tier first, scale as needed
3. **Test Staging First**: Create a staging space before production
4. **Monitor Logs**: Set up log streaming to catch issues early
5. **Keep Secrets Secret**: Never commit `vars.yml` to git
6. **Use CI/CD**: Set up GitHub Actions for automated deployments

## 🆘 Getting Help

### Quick Help

```bash
# CF CLI help
cf help
cf help <command>

# View application logs
cf logs audit-checklist-backend --recent

# Check application status
cf app audit-checklist-backend
```

### Documentation

- **Quick Start**: This file
- **Detailed Guide**: [CLOUD_FOUNDRY_DEPLOYMENT.md](CLOUD_FOUNDRY_DEPLOYMENT.md)
- **Commands**: [CLOUD_FOUNDRY_QUICK_REFERENCE.md](CLOUD_FOUNDRY_QUICK_REFERENCE.md)
- **Checklist**: [CLOUD_FOUNDRY_CHECKLIST.md](CLOUD_FOUNDRY_CHECKLIST.md)

### External Resources

- [Cloud Foundry Docs](https://docs.cloudfoundry.org/)
- [CF CLI Reference](https://cli.cloudfoundry.org/)
- [Node.js Buildpack](https://docs.cloudfoundry.org/buildpacks/node/)

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ `cf apps` shows both apps running
- ✅ Backend health endpoint responds: `curl https://<backend-url>/api/health`
- ✅ Web app loads in browser
- ✅ You can log in to the application
- ✅ Core features work (create audit, view reports, etc.)

## 💰 Cost Estimation

| Tier | Monthly Cost | Best For |
|------|--------------|----------|
| **Free Tier** | $0 | Testing, demos |
| **Starter** | $10-30 | Small teams, MVP |
| **Production** | $50-150 | Growing business |
| **Enterprise** | $200-500+ | Large scale |

See [CLOUD_FOUNDRY_DEPLOYMENT.md](CLOUD_FOUNDRY_DEPLOYMENT.md#cost-summary) for detailed breakdown.

## 🚀 Ready to Deploy?

```bash
# Quick deployment (recommended)
./deploy-to-cf.sh

# Or manual deployment:
# 1. Login
cf login -a api.run.pivotal.io

# 2. Create database
cf create-service elephantsql turtle audit-checklist-db

# 3. Deploy backend
cd backend
cf push --vars-file vars.yml

# 4. Deploy web
cd ../web
npm run build
cf push

# 5. Celebrate! 🎉
```

---

**Need more details?** Check the [Complete Deployment Guide](CLOUD_FOUNDRY_DEPLOYMENT.md)

**Have questions?** Review the [Troubleshooting Section](CLOUD_FOUNDRY_DEPLOYMENT.md#troubleshooting)

**Ready for CI/CD?** Set up [GitHub Actions](.github/workflows/deploy-cloud-foundry.yml)

---

*Last Updated: February 2026*
