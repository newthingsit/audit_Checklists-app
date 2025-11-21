# Deployment Checklist

## Pre-Deployment Preparation

### 1. Environment Setup
- [ ] Create production database (PostgreSQL/MySQL/SQL Server)
- [ ] Set up database backups
- [ ] Configure environment variables in hosting platform
- [ ] Generate strong JWT secret
- [ ] Set up file storage (S3/Cloudinary/DigitalOcean Spaces)
- [ ] Configure email service (if using notifications)

### 2. Code Preparation
- [ ] Update API URLs in frontend (`.env.production`)
- [ ] Update API URLs in mobile app (`mobile/src/config/api.js`)
- [ ] Test all features in staging environment
- [ ] Run security audit
- [ ] Update dependencies (`npm audit fix`)
- [ ] Remove console.logs from production code (optional)

### 3. Database Migration
- [ ] Backup existing database (if migrating)
- [ ] Run database initialization script
- [ ] Verify all tables are created
- [ ] Test database connections
- [ ] Set up database connection pooling

## Backend Deployment

### Railway / Heroku / DigitalOcean
- [ ] Connect GitHub repository
- [ ] Set root directory to `backend`
- [ ] Configure build command: `npm install`
- [ ] Set start command: `node server.js`
- [ ] Add all environment variables
- [ ] Configure persistent storage for `/uploads` (if not using cloud storage)
- [ ] Set up process manager (PM2) if needed
- [ ] Configure health check endpoint
- [ ] Test API endpoints after deployment

### AWS / VPS
- [ ] Set up EC2 instance or VPS
- [ ] Install Node.js 18+
- [ ] Clone repository
- [ ] Install dependencies: `npm install --production`
- [ ] Set up PM2 or systemd service
- [ ] Configure Nginx reverse proxy (if needed)
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure firewall rules
- [ ] Test API endpoints

## Frontend Deployment

### Vercel / Netlify
- [ ] Connect GitHub repository
- [ ] Set root directory to `web`
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `build`
- [ ] Add environment variables:
  - `REACT_APP_API_URL=https://your-backend-api.com/api`
- [ ] Configure custom domain (optional)
- [ ] Test frontend after deployment

### AWS S3 + CloudFront
- [ ] Build frontend: `cd web && npm run build`
- [ ] Create S3 bucket
- [ ] Upload `build` folder contents to S3
- [ ] Configure S3 bucket for static website hosting
- [ ] Set up CloudFront distribution
- [ ] Configure custom domain and SSL
- [ ] Test frontend

## Mobile App Deployment

### Expo EAS Build
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to Expo: `eas login`
- [ ] Configure EAS: `eas build:configure`
- [ ] Update API URL in `mobile/src/config/api.js`:
  ```javascript
  return 'https://your-backend-api.com/api';
  ```
- [ ] Build Android: `eas build --platform android`
- [ ] Build iOS: `eas build --platform ios`
- [ ] Test builds on devices
- [ ] Submit to stores: `eas submit`

### App Store Submission
- [ ] Create Apple Developer account ($99/year)
- [ ] Prepare app metadata
- [ ] Create app icons and screenshots
- [ ] Submit iOS build
- [ ] Wait for review (1-7 days)

### Google Play Submission
- [ ] Create Google Play Developer account ($25 one-time)
- [ ] Prepare app metadata
- [ ] Create app icons and screenshots
- [ ] Submit Android build
- [ ] Wait for review (1-3 days)

## Post-Deployment

### Testing
- [ ] Test user registration/login
- [ ] Test checklist creation
- [ ] Test audit creation and completion
- [ ] Test file uploads (photos)
- [ ] Test PDF/CSV exports
- [ ] Test mobile app connection
- [ ] Test scheduled audits (cron jobs)
- [ ] Test notifications (if enabled)
- [ ] Test admin features
- [ ] Test on different devices/browsers

### Monitoring Setup
- [ ] Set up error tracking (Sentry/LogRocket)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Configure log aggregation
- [ ] Set up performance monitoring
- [ ] Configure alerts for critical errors

### Security
- [ ] Verify HTTPS is enabled
- [ ] Test CORS configuration
- [ ] Verify JWT tokens are working
- [ ] Test rate limiting (if implemented)
- [ ] Verify file upload validation
- [ ] Check for exposed API keys/secrets
- [ ] Run security scan

### Backup & Recovery
- [ ] Set up automated database backups
- [ ] Set up file storage backups
- [ ] Test backup restoration process
- [ ] Document recovery procedures

### Documentation
- [ ] Update API documentation
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document environment variables
- [ ] Create user guide

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Check database performance

### Weekly
- [ ] Review error reports
- [ ] Check storage usage
- [ ] Review user feedback

### Monthly
- [ ] Update dependencies
- [ ] Review security patches
- [ ] Check backup integrity
- [ ] Review costs
- [ ] Performance optimization

## Rollback Plan

If deployment fails:
1. [ ] Revert to previous version
2. [ ] Restore database backup if needed
3. [ ] Check error logs
4. [ ] Fix issues in staging
5. [ ] Re-deploy after fixes

## Emergency Contacts

- **Backend Issues**: [Your contact]
- **Database Issues**: [DBA contact]
- **Hosting Issues**: [Hosting provider support]
- **Mobile App Issues**: [Mobile developer contact]

---

**Last Updated**: Version 0.1

