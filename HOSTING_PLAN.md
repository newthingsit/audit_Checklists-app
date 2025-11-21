# Hosting Plan for Audit Checklists App

## Overview
This application consists of three main components:
1. **Backend API** - Node.js/Express server (Port 5000)
2. **Web Frontend** - React application (Port 3000)
3. **Mobile App** - React Native/Expo application

## Recommended Hosting Architecture

### Option 1: Cloud Platform (Recommended for Production)

#### **Backend API Hosting**

**Recommended Platforms:**
1. **Heroku** (Easy deployment, good for MVP)
   - Pros: Simple deployment, automatic SSL, easy scaling
   - Cons: Can be expensive at scale, limited customization
   - Cost: Free tier available, then ~$7-25/month

2. **Railway** (Modern alternative to Heroku)
   - Pros: Simple, good pricing, great DX
   - Cost: ~$5-20/month

3. **DigitalOcean App Platform**
   - Pros: Good balance of simplicity and control
   - Cost: ~$12-25/month

4. **AWS Elastic Beanstalk / EC2**
   - Pros: Highly scalable, full control
   - Cons: More complex setup
   - Cost: ~$15-50/month (varies)

5. **Vercel / Netlify Functions** (Serverless)
   - Pros: Auto-scaling, pay-per-use
   - Cons: May need refactoring for long-running processes
   - Cost: Free tier, then pay-per-use

**Deployment Requirements:**
- Node.js 18+ runtime
- Environment variables (see `.env.example` below)
- Persistent storage for `/uploads` directory
- Background jobs (cron) support

#### **Web Frontend Hosting**

**Recommended Platforms:**
1. **Vercel** (Recommended)
   - Pros: Excellent for React apps, automatic deployments, CDN, free SSL
   - Cost: Free tier, then $20/month for Pro

2. **Netlify**
   - Pros: Similar to Vercel, great CI/CD
   - Cost: Free tier, then $19/month

3. **AWS S3 + CloudFront**
   - Pros: Highly scalable, low cost
   - Cons: More setup required
   - Cost: ~$1-5/month

4. **GitHub Pages**
   - Pros: Free, simple
   - Cons: Limited features, no server-side features
   - Cost: Free

#### **Database Hosting**

**Current Support:**
- SQL Server (MSSQL)
- PostgreSQL
- MySQL
- SQLite (development only)

**Recommended Options:**

1. **PostgreSQL** (Recommended)
   - **Supabase** - Free tier, easy setup
     - Cost: Free up to 500MB, then $25/month
   - **Neon** - Serverless PostgreSQL
     - Cost: Free tier, then $19/month
   - **AWS RDS PostgreSQL**
     - Cost: ~$15-50/month
   - **DigitalOcean Managed PostgreSQL**
     - Cost: ~$15/month

2. **SQL Server** (If you need MSSQL)
   - **Azure SQL Database**
     - Cost: ~$5-15/month (Basic tier)
   - **AWS RDS SQL Server**
     - Cost: ~$15-100/month

3. **MySQL**
   - **PlanetScale** - Serverless MySQL
     - Cost: Free tier, then $29/month
   - **AWS RDS MySQL**
     - Cost: ~$15-50/month

#### **File Storage (Uploads)**

**Options:**
1. **Cloudinary** (Recommended for images)
   - Pros: Image optimization, CDN, free tier
   - Cost: Free up to 25GB, then $99/month

2. **AWS S3**
   - Pros: Highly scalable, low cost
   - Cost: ~$0.023/GB/month

3. **DigitalOcean Spaces**
   - Pros: S3-compatible, simple
   - Cost: ~$5/month for 250GB

4. **Azure Blob Storage**
   - Cost: ~$0.018/GB/month

5. **Keep on server** (if using VPS)
   - Store in `/uploads` directory
   - Need backup strategy

#### **Mobile App Distribution**

**Expo Application:**
1. **Expo Application Services (EAS)**
   - Build and submit to app stores
   - Cost: Free for basic, $29/month for Pro

2. **App Store (iOS)**
   - Apple Developer Account: $99/year

3. **Google Play Store (Android)**
   - One-time fee: $25

## Recommended Complete Setup (Cost-Effective)

### **Budget Option (~$20-30/month)**
- **Backend**: Railway or DigitalOcean Droplet ($5-12/month)
- **Frontend**: Vercel (Free tier)
- **Database**: Supabase PostgreSQL (Free tier)
- **File Storage**: Cloudinary (Free tier) or DigitalOcean Spaces ($5/month)
- **Mobile**: Expo EAS (Free tier)

### **Production Option (~$50-100/month)**
- **Backend**: AWS Elastic Beanstalk or DigitalOcean App Platform ($25/month)
- **Frontend**: Vercel Pro ($20/month)
- **Database**: Neon PostgreSQL or AWS RDS ($19-25/month)
- **File Storage**: AWS S3 + CloudFront ($5-10/month)
- **Mobile**: Expo EAS Pro ($29/month)

### **Enterprise Option (~$200+/month)**
- **Backend**: AWS EC2 or ECS ($50-100/month)
- **Frontend**: AWS S3 + CloudFront ($10/month)
- **Database**: AWS RDS with Multi-AZ ($100+/month)
- **File Storage**: AWS S3 ($10-20/month)
- **CDN**: CloudFront ($10-50/month)
- **Monitoring**: AWS CloudWatch or Datadog ($20-50/month)

## Environment Variables Setup

Create `.env` file in backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration (choose one)
# For PostgreSQL
DB_TYPE=postgresql
DATABASE_URL=postgresql://user:password@host:5432/dbname

# For SQL Server
DB_TYPE=mssql
MSSQL_SERVER=your-server.database.windows.net
MSSQL_DATABASE=audit_checklists
MSSQL_USER=your-username
MSSQL_PASSWORD=your-password
MSSQL_OPTIONS_ENCRYPT=true
MSSQL_OPTIONS_TRUST_SERVER_CERTIFICATE=false

# For MySQL
DB_TYPE=mysql
DB_HOST=your-mysql-host
DB_USER=your-username
DB_PASSWORD=your-password
DB_NAME=audit_checklists

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourapp.com

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# Mobile App API URL
API_BASE_URL=https://your-backend-api.com/api
```

## Deployment Steps

### Backend Deployment (Example: Railway)

1. **Prepare for deployment:**
   ```bash
   cd backend
   npm install --production
   ```

2. **Create `Procfile` in backend directory:**
   ```
   web: node server.js
   ```

3. **Deploy to Railway:**
   - Connect GitHub repository
   - Set root directory to `backend`
   - Add environment variables
   - Deploy

### Frontend Deployment (Example: Vercel)

1. **Build the app:**
   ```bash
   cd web
   npm run build
   ```

2. **Update API URL:**
   - Create `.env.production` file:
     ```
     REACT_APP_API_URL=https://your-backend-api.com/api
     ```

3. **Deploy to Vercel:**
   - Connect GitHub repository
   - Set root directory to `web`
   - Add build command: `npm run build`
   - Add output directory: `build`
   - Deploy

### Mobile App Deployment (Expo)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS:**
   ```bash
   cd mobile
   eas login
   eas build:configure
   ```

3. **Update API URL in mobile app:**
   - Update `mobile/src/config/api.js`:
     ```javascript
     const getApiBaseUrl = () => {
       if (__DEV__) {
         return 'http://192.168.1.156:5000/api'; // Development
       }
       return 'https://your-backend-api.com/api'; // Production
     };
     ```

4. **Build and submit:**
   ```bash
   eas build --platform android
   eas build --platform ios
   eas submit --platform android
   eas submit --platform ios
   ```

## Security Considerations

1. **SSL/TLS**: Use HTTPS for all production endpoints
2. **CORS**: Configure CORS to only allow your frontend domain
3. **Environment Variables**: Never commit `.env` files
4. **JWT Secret**: Use a strong, random secret
5. **Database**: Use connection pooling and parameterized queries (already implemented)
6. **File Uploads**: Validate file types and sizes
7. **Rate Limiting**: Consider adding rate limiting for API endpoints

## Monitoring & Maintenance

1. **Logging**: Use services like LogRocket, Sentry, or Winston
2. **Error Tracking**: Set up Sentry for error monitoring
3. **Uptime Monitoring**: Use UptimeRobot or Pingdom
4. **Backups**: 
   - Database: Automated daily backups
   - Files: Regular backups of `/uploads` directory
5. **Updates**: Keep dependencies updated regularly

## Migration Checklist

### Pre-Deployment
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Set up file storage (S3/Cloudinary)
- [ ] Configure CORS for production domains
- [ ] Update API URLs in frontend and mobile
- [ ] Test all API endpoints
- [ ] Set up SSL certificates
- [ ] Configure email service (if using notifications)

### Post-Deployment
- [ ] Test login/authentication
- [ ] Test file uploads
- [ ] Test mobile app connection
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set up domain names
- [ ] Test scheduled jobs (cron)
- [ ] Performance testing

## Cost Estimation Summary

| Component | Budget | Production | Enterprise |
|-----------|--------|-----------|------------|
| Backend | $5-12 | $25 | $50-100 |
| Frontend | Free | $20 | $10 |
| Database | Free | $19-25 | $100+ |
| File Storage | Free | $5-10 | $10-20 |
| Mobile | Free | $29 | $29 |
| **Total** | **$5-12** | **$98-114** | **$199-179** |

## Next Steps

1. Choose your hosting providers based on budget and requirements
2. Set up production database
3. Configure environment variables
4. Deploy backend API
5. Deploy frontend web app
6. Build and distribute mobile app
7. Set up monitoring and backups
8. Configure domain names and SSL

## Support & Resources

- **Backend Issues**: Check server logs and error tracking
- **Database Issues**: Check connection strings and credentials
- **Frontend Issues**: Check browser console and network tab
- **Mobile Issues**: Check Expo logs and device logs

---

**Last Updated**: Version 0.1
**Maintained By**: Development Team

