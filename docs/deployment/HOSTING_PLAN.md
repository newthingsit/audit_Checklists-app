# Hosting & Deployment Plan

## Overview

This document outlines the comprehensive hosting and deployment strategy for the Restaurant Audit & Checklist application, covering backend API, web frontend, mobile apps, database, and supporting infrastructure.

## Architecture Overview

```
┌─────────────────┐
│   Mobile Apps   │  (iOS & Android via Expo/EAS)
│  (React Native) │
└────────┬────────┘
         │
         │ HTTPS
         │
┌────────▼─────────────────────────────────────┐
│         Web Application (React)              │
│         (Vercel/Netlify/AWS S3+CloudFront)   │
└────────┬─────────────────────────────────────┘
         │
         │ HTTPS
         │
┌────────▼─────────────────────────────────────┐
│         Backend API (Node.js/Express)       │
│         (Railway/Render/AWS EC2/Heroku)     │
└────────┬─────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│Database│ │File Storage│
│PostgreSQL│ │AWS S3/Cloudinary│
└────────┘ └───────────┘
```

## Component Hosting Strategy

### 1. Backend API (Node.js/Express)

#### Option A: Railway (Recommended for Start)
**Pros:**
- Easy setup, great for startups
- Automatic HTTPS
- PostgreSQL included
- $5-20/month
- Auto-deploy from GitHub

**Steps:**
1. Sign up at [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add PostgreSQL service
4. Set environment variables:
   - `PORT` (auto-set)
   - `JWT_SECRET` (generate strong secret)
   - `DATABASE_URL` (auto-provided)
   - `NODE_ENV=production`
5. Deploy backend folder

**Cost:** $5-20/month

#### Option B: Render
**Pros:**
- Free tier available
- Easy PostgreSQL integration
- Auto-deploy from GitHub

**Steps:**
1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Add PostgreSQL database
5. Configure environment variables
6. Set build command: `cd backend && npm install`
7. Set start command: `cd backend && npm start`

**Cost:** Free tier available, $7/month for production

#### Option C: AWS EC2/Elastic Beanstalk
**Pros:**
- Full control
- Scalable
- Industry standard

**Steps:**
1. Launch EC2 instance (t2.micro for testing)
2. Install Node.js, PM2
3. Clone repository
4. Set up environment variables
5. Configure nginx reverse proxy
6. Set up SSL with Let's Encrypt

**Cost:** $10-50/month depending on instance

#### Option D: Heroku
**Pros:**
- Simple deployment
- Add-ons ecosystem
- Good documentation

**Steps:**
1. Install Heroku CLI
2. `heroku create your-app-name`
3. Add PostgreSQL addon
4. Set environment variables
5. `git push heroku main`

**Cost:** $7-25/month (no free tier anymore)

### 2. Web Frontend (React)

#### Option A: Vercel (Recommended)
**Pros:**
- Optimized for React
- Free tier
- Automatic HTTPS
- Global CDN
- Easy deployment

**Steps:**
1. Sign up at [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Set root directory: `web`
4. Set build command: `npm run build`
5. Set output directory: `build`
6. Add environment variable: `REACT_APP_API_URL=https://your-api.com/api`
7. Deploy

**Cost:** Free for personal projects, $20/month for team

#### Option B: Netlify
**Pros:**
- Free tier
- Easy setup
- Good for static sites

**Steps:**
1. Sign up at [netlify.com](https://netlify.com)
2. Connect GitHub
3. Set build command: `cd web && npm run build`
4. Set publish directory: `web/build`
5. Add environment variable: `REACT_APP_API_URL`

**Cost:** Free tier available

#### Option C: AWS S3 + CloudFront
**Pros:**
- Scalable
- Low cost
- Full control

**Steps:**
1. Create S3 bucket
2. Enable static website hosting
3. Upload build files
4. Create CloudFront distribution
5. Configure custom domain

**Cost:** $1-5/month

### 3. Database (PostgreSQL Migration)

#### Current: SQLite
- ✅ Works for development
- ❌ Not suitable for production
- ❌ No concurrent writes
- ❌ No backup/restore

#### Production: PostgreSQL

**Hosting Options:**

1. **Railway PostgreSQL** (if using Railway backend)
   - Included with Railway
   - Automatic backups
   - Easy connection

2. **Supabase** (Recommended)
   - Free tier: 500MB database
   - Automatic backups
   - Great dashboard
   - PostgreSQL + Auth + Storage
   - **Cost:** Free tier, $25/month for production

3. **AWS RDS**
   - Managed PostgreSQL
   - Automatic backups
   - Multi-AZ for high availability
   - **Cost:** $15-50/month

4. **Render PostgreSQL**
   - Included with Render
   - Automatic backups
   - **Cost:** $7/month

**Migration Steps:**
1. Export SQLite data
2. Create PostgreSQL database
3. Run migration script
4. Update backend connection string
5. Test thoroughly

### 4. File Storage (Uploads)

#### Current: Local filesystem
- ❌ Not scalable
- ❌ Lost on server restart
- ❌ No CDN

#### Production Options:

1. **AWS S3** (Recommended)
   - Scalable
   - CDN integration
   - **Cost:** $0.023/GB storage + transfer
   - **Steps:**
     - Create S3 bucket
     - Set up IAM user with S3 access
     - Install `aws-sdk` or `@aws-sdk/client-s3`
     - Update upload route

2. **Cloudinary**
   - Image optimization
   - CDN included
   - Free tier: 25GB storage
   - **Cost:** Free tier, $99/month for production

3. **Supabase Storage**
   - If using Supabase
   - Integrated solution
   - **Cost:** Included with Supabase

### 5. Mobile App Distribution

#### iOS App Store
**Requirements:**
- Apple Developer Account ($99/year)
- EAS Build (Expo Application Services)
- App Store Connect setup

**Steps:**
1. Set up EAS Build: `npm install -g eas-cli`
2. Configure `app.json` with app details
3. Build: `eas build --platform ios`
4. Submit: `eas submit --platform ios`

#### Google Play Store
**Requirements:**
- Google Play Developer Account ($25 one-time)
- EAS Build
- Play Console setup

**Steps:**
1. Configure `app.json`
2. Build: `eas build --platform android`
3. Submit: `eas submit --platform android`

**Cost:**
- EAS Build: Free tier (limited), $29/month for unlimited
- Apple Developer: $99/year
- Google Play: $25 one-time

### 6. Domain & SSL

#### Domain Registration
- **Namecheap**: $10-15/year
- **Google Domains**: $12/year
- **AWS Route 53**: $12/year

#### SSL Certificates
- **Let's Encrypt**: Free (automatic with most hosts)
- **Cloudflare**: Free SSL included
- **AWS Certificate Manager**: Free with AWS services

### 7. CI/CD Pipeline

#### GitHub Actions (Recommended)
**Workflow:**
1. Push to `main` branch
2. Run tests
3. Build application
4. Deploy to staging/production

**Example workflow files:**
- `.github/workflows/backend-deploy.yml`
- `.github/workflows/web-deploy.yml`

### 8. Monitoring & Logging

#### Application Monitoring
1. **Sentry** (Error Tracking)
   - Free tier: 5,000 events/month
   - **Cost:** Free tier, $26/month for production

2. **LogRocket** (Session Replay)
   - Free tier available
   - **Cost:** $99/month for production

3. **Uptime Monitoring**
   - **UptimeRobot**: Free (50 monitors)
   - **Pingdom**: $10/month

#### Logging
- **Logtail**: Free tier (1GB/month)
- **Papertrail**: Free tier (16GB/month)
- **AWS CloudWatch**: Pay-as-you-go

## Recommended Hosting Stack (Budget-Friendly)

### Phase 1: MVP Launch ($0-30/month)
- **Backend**: Render (Free tier) or Railway ($5/month)
- **Web**: Vercel (Free)
- **Database**: Supabase (Free tier)
- **Storage**: AWS S3 ($1-5/month)
- **Mobile**: EAS Build (Free tier)
- **Domain**: Namecheap ($12/year)
- **Total**: ~$12-30/month

### Phase 2: Production Scale ($50-150/month)
- **Backend**: Railway ($20/month) or AWS EC2 ($15/month)
- **Web**: Vercel Pro ($20/month)
- **Database**: Supabase ($25/month) or AWS RDS ($30/month)
- **Storage**: AWS S3 ($5/month)
- **CDN**: CloudFront ($5/month)
- **Monitoring**: Sentry ($26/month)
- **Mobile**: EAS Build ($29/month)
- **Total**: ~$100-150/month

### Phase 3: Enterprise Scale ($200-500/month)
- **Backend**: AWS ECS/Fargate ($50-100/month)
- **Web**: AWS S3 + CloudFront ($20/month)
- **Database**: AWS RDS Multi-AZ ($100/month)
- **Storage**: AWS S3 ($20/month)
- **CDN**: CloudFront ($30/month)
- **Monitoring**: Full stack ($100/month)
- **Backup**: Automated backups ($20/month)
- **Total**: ~$300-500/month

## Pre-Deployment Checklist

### Backend
- [ ] Update `JWT_SECRET` to strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Configure CORS for production domains
- [ ] Set up environment variables
- [ ] Migrate from SQLite to PostgreSQL
- [ ] Update file upload to use S3/Cloudinary
- [ ] Add rate limiting
- [ ] Set up error logging (Sentry)
- [ ] Configure PM2 or process manager
- [ ] Set up health check endpoint
- [ ] Enable HTTPS

### Web Frontend
- [ ] Update API URL to production endpoint
- [ ] Build production bundle: `npm run build`
- [ ] Test production build locally
- [ ] Configure environment variables
- [ ] Set up error boundary
- [ ] Add analytics (optional)
- [ ] Test on multiple browsers
- [ ] Optimize images and assets

### Mobile
- [ ] Update API URL in `mobile/src/config/api.js`
- [ ] Configure `app.json` with production settings
- [ ] Set up EAS Build account
- [ ] Test builds on physical devices
- [ ] Prepare app store assets (icons, screenshots)
- [ ] Set up app store accounts
- [ ] Configure push notifications (if needed)

### Database
- [ ] Export SQLite data
- [ ] Create PostgreSQL database
- [ ] Run migration scripts
- [ ] Verify data integrity
- [ ] Set up automated backups
- [ ] Test restore procedure

### Security
- [ ] Change all default passwords
- [ ] Enable HTTPS everywhere
- [ ] Set up firewall rules
- [ ] Configure CORS properly
- [ ] Add rate limiting
- [ ] Enable SQL injection protection
- [ ] Set up security headers
- [ ] Regular security audits

## Deployment Steps

### Step 1: Database Migration
1. Create PostgreSQL database
2. Export SQLite data
3. Import to PostgreSQL
4. Update backend connection

### Step 2: Backend Deployment
1. Set up hosting (Railway/Render/AWS)
2. Configure environment variables
3. Deploy backend code
4. Test API endpoints
5. Set up monitoring

### Step 3: Web Frontend Deployment
1. Update API URL
2. Build production bundle
3. Deploy to Vercel/Netlify
4. Configure custom domain
5. Test all features

### Step 4: Mobile App Distribution
1. Configure app.json
2. Build with EAS
3. Test on devices
4. Submit to app stores
5. Wait for approval

### Step 5: File Storage Migration
1. Set up S3/Cloudinary
2. Update upload routes
3. Migrate existing files
4. Test upload functionality

## Post-Deployment

### Monitoring
- Set up uptime monitoring
- Configure error tracking
- Set up log aggregation
- Create alerts for critical issues

### Maintenance
- Regular backups
- Security updates
- Performance monitoring
- User feedback collection

### Scaling
- Monitor resource usage
- Plan for traffic spikes
- Optimize database queries
- Add caching (Redis) if needed

## Cost Summary

| Component | Free Tier | Production | Enterprise |
|-----------|-----------|------------|------------|
| Backend | $0-5 | $20-50 | $100-200 |
| Web | $0 | $20 | $50 |
| Database | $0 | $25-50 | $100-200 |
| Storage | $0-1 | $5-10 | $20-50 |
| Mobile Builds | Limited | $29 | $29 |
| Domain | - | $12/year | $12/year |
| SSL | Free | Free | Free |
| Monitoring | Free | $26-50 | $100+ |
| **Total/Month** | **$0-10** | **$100-200** | **$400-600** |

## Next Steps

1. **Choose hosting providers** based on budget and needs
2. **Set up development/staging environment** first
3. **Migrate database** from SQLite to PostgreSQL
4. **Deploy backend** to chosen platform
5. **Deploy web frontend** to Vercel/Netlify
6. **Set up file storage** (S3/Cloudinary)
7. **Build and submit mobile apps**
8. **Set up monitoring and alerts**
9. **Configure custom domain and SSL**
10. **Test everything thoroughly**

## Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [AWS Getting Started](https://aws.amazon.com/getting-started/)

## Support

For deployment issues, refer to:
- Platform-specific documentation
- Project technical documentation in `docs/technical/`
- Setup guides in `docs/setup/`

