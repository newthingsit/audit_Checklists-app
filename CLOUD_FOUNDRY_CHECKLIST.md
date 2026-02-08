# Cloud Foundry Pre-Deployment Checklist

Use this checklist to ensure you're ready to deploy to Cloud Foundry.

## Prerequisites
- [ ] Cloud Foundry CLI installed (`cf --version`)
- [ ] Cloud Foundry account created
- [ ] Logged in to Cloud Foundry (`cf login`)
- [ ] Selected correct organization and space (`cf target`)

## Backend API Preparation

### Configuration
- [ ] JWT_SECRET generated (use: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] ALLOWED_ORIGINS configured for production domains
- [ ] Environment variables documented in `backend/vars.yml`
- [ ] PostgreSQL service available in Cloud Foundry marketplace

### Code Review
- [ ] All sensitive data removed from code
- [ ] Database connection uses Cloud Foundry VCAP_SERVICES
- [ ] Health check endpoint available at `/api/health`
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Error logging configured

### Testing
- [ ] Backend tests passing (`cd backend && npm test`)
- [ ] Backend starts locally without errors (`cd backend && npm start`)
- [ ] Health endpoint responds (`curl http://localhost:5000/api/health`)
- [ ] Authentication works
- [ ] API endpoints accessible

## Web Frontend Preparation

### Configuration
- [ ] API URL configured in `.env.production`
- [ ] Production build tested locally
- [ ] Staticfile created with React Router support
- [ ] nginx routes configured for SPA

### Build
- [ ] Dependencies installed (`cd web && npm install`)
- [ ] Production build successful (`npm run build`)
- [ ] Build directory created
- [ ] Static files in build directory

### Testing
- [ ] Web app starts locally (`npm start`)
- [ ] All pages load correctly
- [ ] API calls work with development backend
- [ ] No console errors
- [ ] Responsive design works

## Database

### Migration
- [ ] PostgreSQL service created in Cloud Foundry
- [ ] Database schema ready
- [ ] Migration scripts tested
- [ ] Seed data prepared (optional)
- [ ] Backup plan documented

### Configuration
- [ ] Database credentials managed via VCAP_SERVICES
- [ ] Connection pooling configured
- [ ] SSL enabled for database connections
- [ ] Timeout settings appropriate

## Security

### Secrets Management
- [ ] JWT_SECRET is strong and unique
- [ ] Database credentials secured via CF services
- [ ] No hardcoded secrets in code
- [ ] Environment variables documented
- [ ] Sensitive files in .cfignore

### Network Security
- [ ] HTTPS enabled (automatic in Cloud Foundry)
- [ ] CORS restricted to production domains
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented

### Access Control
- [ ] Authentication required for protected routes
- [ ] Role-based access control implemented
- [ ] Session management secure
- [ ] Password hashing enabled

## Monitoring & Logging

### Application Monitoring
- [ ] Health check endpoint functional
- [ ] Logging configured
- [ ] Error tracking setup planned
- [ ] Performance monitoring considered

### Alerting
- [ ] Uptime monitoring plan
- [ ] Error alerting plan
- [ ] Resource usage alerts plan

## Deployment Files

### Backend
- [ ] `backend/manifest.yml` exists and configured
- [ ] `backend/.cfignore` exists
- [ ] `backend/package.json` has correct start script
- [ ] `backend/vars.yml` created (keep it secret!)

### Web Frontend
- [ ] `web/manifest.yml` exists and configured
- [ ] `web/.cfignore` exists
- [ ] `web/Staticfile` exists
- [ ] `web/includes/routes.conf` exists

## Pre-Deployment Testing

### Local Testing
- [ ] Backend runs locally
- [ ] Web runs locally
- [ ] Mobile app connects to local backend (optional)
- [ ] End-to-end user flows tested

### Integration Testing
- [ ] Login/logout works
- [ ] CRUD operations work
- [ ] File uploads work
- [ ] Reports generate correctly
- [ ] Mobile API compatibility verified

## Deployment Strategy

### Initial Deployment
- [ ] Deploy to staging/test space first
- [ ] Verify staging deployment
- [ ] Test all features in staging
- [ ] Document any issues

### Production Deployment
- [ ] Backup existing data (if applicable)
- [ ] Deploy backend first
- [ ] Verify backend health
- [ ] Deploy frontend
- [ ] Verify frontend functionality
- [ ] Test end-to-end

### Rollback Plan
- [ ] Previous version tagged in git
- [ ] Rollback procedure documented
- [ ] Database rollback plan (if schema changes)

## Post-Deployment

### Verification
- [ ] Backend health check responds
- [ ] Web app loads correctly
- [ ] User can log in
- [ ] Core features work
- [ ] No error logs

### Configuration
- [ ] Custom domains mapped (optional)
- [ ] DNS records updated (if using custom domains)
- [ ] SSL certificates verified
- [ ] Environment variables verified

### Monitoring
- [ ] Application logs reviewed
- [ ] Performance metrics checked
- [ ] Error rate acceptable
- [ ] Response times acceptable

### Documentation
- [ ] Deployment documented
- [ ] URLs documented
- [ ] Access credentials secured
- [ ] Team notified

## Scaling & Performance

### Capacity Planning
- [ ] Expected load estimated
- [ ] Instance count planned
- [ ] Memory allocation appropriate
- [ ] Auto-scaling considered

### Performance
- [ ] Response times measured
- [ ] Database query performance checked
- [ ] Caching strategy implemented (if needed)
- [ ] CDN considered for static assets

## Maintenance

### Backup & Recovery
- [ ] Database backup enabled
- [ ] Backup frequency configured
- [ ] Recovery procedure documented
- [ ] Backup restoration tested

### Updates
- [ ] Update procedure documented
- [ ] Zero-downtime deployment strategy
- [ ] Dependency update process
- [ ] Security patch process

## Cost Management

### Resource Usage
- [ ] Instance sizes appropriate
- [ ] Number of instances optimal
- [ ] Database tier appropriate
- [ ] Unused services removed

### Monitoring
- [ ] Cost tracking enabled
- [ ] Usage alerts configured
- [ ] Optimization opportunities identified

## Compliance & Legal

### Data Protection
- [ ] Data retention policy documented
- [ ] Privacy policy updated
- [ ] GDPR compliance (if applicable)
- [ ] Data encryption enabled

### Licensing
- [ ] All dependencies licensed appropriately
- [ ] License compliance verified
- [ ] Attribution provided where required

## Team Communication

### Stakeholders
- [ ] Deployment schedule communicated
- [ ] Maintenance windows announced
- [ ] Contact information shared
- [ ] Support process documented

### Documentation
- [ ] Deployment guide available
- [ ] Architecture diagram updated
- [ ] API documentation current
- [ ] User documentation updated

## Emergency Contacts

### Support
- [ ] Cloud Foundry support contact
- [ ] Database support contact
- [ ] Internal team contacts
- [ ] Escalation procedure

## Final Checks

- [ ] All items above completed
- [ ] Deployment scheduled
- [ ] Team ready
- [ ] Monitoring in place
- [ ] Rollback plan ready

---

## Quick Deployment Commands

Once all checks are complete:

```bash
# Deploy both backend and frontend
./deploy-to-cf.sh

# Or deploy manually:

# Backend
cd backend
cf push --vars-file vars.yml

# Web
cd web
npm run build
cf push
```

## Getting Help

If you encounter issues:
1. Review `CLOUD_FOUNDRY_DEPLOYMENT.md`
2. Check logs: `cf logs <app-name> --recent`
3. Check app status: `cf app <app-name>`
4. Review Cloud Foundry documentation
5. Contact your Cloud Foundry administrator

---

**Last Updated**: February 2026
