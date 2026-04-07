# Cloud Foundry Quick Reference

A quick reference guide for common Cloud Foundry commands used with this application.

## Login & Targeting

```bash
# Login to Cloud Foundry
cf login -a <API_ENDPOINT>

# Example: Login to Pivotal Web Services
cf login -a api.run.pivotal.io

# Check current target
cf target

# Switch organization
cf target -o <ORG_NAME>

# Switch space
cf target -s <SPACE_NAME>

# Logout
cf logout
```

## Application Management

### Deployment

```bash
# Deploy application (from manifest.yml)
cf push

# Deploy with variables file
cf push --vars-file vars.yml

# Deploy specific app from manifest
cf push <APP_NAME>

# Deploy without starting
cf push --no-start
```

### Application Status

```bash
# List all applications
cf apps

# View application details
cf app <APP_NAME>

# View application events
cf events <APP_NAME>

# View application environment
cf env <APP_NAME>
```

### Start, Stop, Restart

```bash
# Start application
cf start <APP_NAME>

# Stop application
cf stop <APP_NAME>

# Restart application (zero downtime)
cf restart <APP_NAME>

# Restage application (rebuild)
cf restage <APP_NAME>
```

### Scaling

```bash
# Scale instances
cf scale <APP_NAME> -i <NUM_INSTANCES>

# Scale memory
cf scale <APP_NAME> -m <MEMORY>

# Scale disk
cf scale <APP_NAME> -k <DISK_SIZE>

# Example: Scale to 3 instances with 1GB RAM
cf scale audit-checklist-backend -i 3 -m 1G
```

## Service Management

### PostgreSQL Database

```bash
# List available services in marketplace
cf marketplace

# Search for PostgreSQL services
cf marketplace | grep postgres

# Create service instance
cf create-service <SERVICE> <PLAN> <INSTANCE_NAME>

# Example: Create ElephantSQL database
cf create-service elephantsql turtle audit-checklist-db

# List service instances
cf services

# View service details
cf service <SERVICE_NAME>

# Bind service to application
cf bind-service <APP_NAME> <SERVICE_NAME>

# Unbind service
cf unbind-service <APP_NAME> <SERVICE_NAME>

# Delete service
cf delete-service <SERVICE_NAME>
```

## Environment Variables

```bash
# View all environment variables
cf env <APP_NAME>

# Set environment variable
cf set-env <APP_NAME> <VAR_NAME> <VALUE>

# Unset environment variable
cf unset-env <APP_NAME> <VAR_NAME>

# Examples for this application:
cf set-env audit-checklist-backend JWT_SECRET "your-secret-key"
cf set-env audit-checklist-backend ALLOWED_ORIGINS "https://app.yourdomain.com"
cf set-env audit-checklist-backend NODE_ENV "production"

# Restart to apply environment changes
cf restart <APP_NAME>
```

## Logging & Debugging

### View Logs

```bash
# Recent logs
cf logs <APP_NAME> --recent

# Stream live logs
cf logs <APP_NAME>

# Filter logs by type
cf logs <APP_NAME> | grep "ERR"
cf logs <APP_NAME> | grep "API"
```

### SSH Access

```bash
# SSH into application container
cf ssh <APP_NAME>

# Run command in container
cf ssh <APP_NAME> -c "<COMMAND>"

# Example: Check Node.js version
cf ssh audit-checklist-backend -c "node --version"

# Example: View files
cf ssh audit-checklist-backend -c "ls -la"

# Example: Check environment
cf ssh audit-checklist-backend -c "env | grep NODE"
```

### Tasks

```bash
# Run one-off task
cf run-task <APP_NAME> "<COMMAND>" --name <TASK_NAME>

# Example: Run database migration
cf run-task audit-checklist-backend "node scripts/migrate-db.js" --name migrate

# List tasks
cf tasks <APP_NAME>

# View task logs
cf logs <APP_NAME> --recent | grep <TASK_NAME>
```

## Routes & Domains

### Manage Routes

```bash
# List routes
cf routes

# Map route to application
cf map-route <APP_NAME> <DOMAIN> --hostname <HOSTNAME>

# Example: Map custom domain
cf map-route audit-checklist-web litebitefoods.com --hostname app

# Unmap route
cf unmap-route <APP_NAME> <DOMAIN> --hostname <HOSTNAME>

# Delete route
cf delete-route <DOMAIN> --hostname <HOSTNAME>
```

### Custom Domains

```bash
# List domains
cf domains

# Create private domain (requires admin)
cf create-domain <ORG> <DOMAIN>

# Example: Create custom domain
cf create-domain my-org litebitefoods.com

# Share private domain
cf share-private-domain <ORG> <DOMAIN>
```

## Health Checks

```bash
# Update health check type
cf set-health-check <APP_NAME> <TYPE>

# Types: http, port, process
cf set-health-check audit-checklist-backend http --endpoint /api/health

# Disable health check
cf set-health-check <APP_NAME> none
```

## Application-Specific Commands

### Backend (audit-checklist-backend)

```bash
# Deploy backend
cd backend
cf push --vars-file vars.yml

# View backend logs
cf logs audit-checklist-backend --recent

# Check backend health
curl https://audit-checklist-backend.cfapps.io/api/health

# Scale backend
cf scale audit-checklist-backend -i 2 -m 1G

# Set JWT secret
cf set-env audit-checklist-backend JWT_SECRET "$(openssl rand -hex 32)"
cf restart audit-checklist-backend

# SSH into backend
cf ssh audit-checklist-backend
```

### Web Frontend (audit-checklist-web)

```bash
# Build and deploy web
cd web
npm run build
cf push

# View web logs
cf logs audit-checklist-web --recent

# Scale web
cf scale audit-checklist-web -i 2 -m 256M

# View web app
open https://audit-checklist-web.cfapps.io
```

## Monitoring

### App Statistics

```bash
# View application statistics
cf app <APP_NAME>

# View in real-time (use watch)
watch -n 5 cf app <APP_NAME>
```

### Health Check

```bash
# Check application health
cf app <APP_NAME> | grep state

# Test health endpoint
curl https://<APP_ROUTE>/api/health
```

## Troubleshooting

### Application Won't Start

```bash
# 1. Check recent logs
cf logs <APP_NAME> --recent

# 2. Check application events
cf events <APP_NAME>

# 3. Check if service is bound
cf services

# 4. Check environment variables
cf env <APP_NAME>

# 5. SSH and investigate
cf ssh <APP_NAME>
```

### Database Connection Issues

```bash
# 1. Check if service exists
cf service audit-checklist-db

# 2. Check service binding
cf services

# 3. Bind service if not bound
cf bind-service audit-checklist-backend audit-checklist-db
cf restage audit-checklist-backend

# 4. Check VCAP_SERVICES
cf env audit-checklist-backend | grep VCAP_SERVICES
```

### CORS Errors

```bash
# 1. Check allowed origins
cf env audit-checklist-backend | grep ALLOWED_ORIGINS

# 2. Update allowed origins
cf set-env audit-checklist-backend ALLOWED_ORIGINS "https://your-domain.com,https://audit-checklist-web.cfapps.io"

# 3. Restart backend
cf restart audit-checklist-backend
```

### Performance Issues

```bash
# 1. Check application stats
cf app <APP_NAME>

# 2. View recent logs for errors
cf logs <APP_NAME> --recent | grep ERR

# 3. Increase resources
cf scale <APP_NAME> -m 1G -k 2G

# 4. Add more instances
cf scale <APP_NAME> -i 3
```

## Cleanup

```bash
# Delete application
cf delete <APP_NAME>

# Delete service
cf delete-service <SERVICE_NAME>

# Delete route
cf delete-route <DOMAIN> --hostname <HOSTNAME>

# Delete orphaned routes
cf delete-orphaned-routes
```

## Useful Combinations

### Complete Deployment Workflow

```bash
# 1. Login
cf login -a api.run.pivotal.io

# 2. Create database (first time only)
cf create-service elephantsql turtle audit-checklist-db

# 3. Deploy backend
cd backend
cf push --vars-file vars.yml

# 4. Check backend health
curl https://$(cf app audit-checklist-backend | grep routes | awk '{print $2}')/api/health

# 5. Build and deploy web
cd ../web
npm run build
cf push

# 6. Verify deployment
cf apps
```

### Quick Status Check

```bash
# Check all applications
cf apps

# Check all services
cf services

# Check recent logs
cf logs audit-checklist-backend --recent | tail -50
```

### Emergency Restart

```bash
# Restart backend
cf restart audit-checklist-backend

# Restart web
cf restart audit-checklist-web

# Or restart both
cf apps | grep audit-checklist | awk '{print $1}' | xargs -I {} cf restart {}
```

## Getting Help

```bash
# General help
cf help

# Help for specific command
cf help push
cf help scale
cf help logs

# Version information
cf version
```

## Resources

- [Cloud Foundry CLI Reference](https://cli.cloudfoundry.org/en-US/v8/)
- [Cloud Foundry Documentation](https://docs.cloudfoundry.org/)
- [Full Deployment Guide](./CLOUD_FOUNDRY_DEPLOYMENT.md)
- [Pre-Deployment Checklist](./CLOUD_FOUNDRY_CHECKLIST.md)

---

**Tip**: Create aliases for frequently used commands:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias cfpush='cf push --vars-file vars.yml'
alias cflogs='cf logs --recent'
alias cfapps='cf apps'
alias cfback='cd backend && cf push --vars-file vars.yml'
alias cfweb='cd web && npm run build && cf push'
```
