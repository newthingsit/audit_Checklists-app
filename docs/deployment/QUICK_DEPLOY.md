# Quick Deployment Guide

## Fastest Path to Production (30 minutes)

### Prerequisites
- GitHub account
- Email for service signups

### Step 1: Backend (Railway - 10 min)
1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Add PostgreSQL service (click "+ New" → "Database" → "PostgreSQL")
5. Go to backend service → Settings → Variables
6. Add:
   ```
   JWT_SECRET=your-strong-random-secret-here
   NODE_ENV=production
   ```
7. Railway auto-detects Node.js and deploys
8. Copy your backend URL (e.g., `https://your-app.railway.app`)

### Step 2: Database Migration (5 min)
1. Export SQLite data:
   ```bash
   sqlite3 backend/data/audit.db .dump > backup.sql
   ```
2. Connect to Railway PostgreSQL (use Railway dashboard)
3. Import data (or use migration script)

### Step 3: Web Frontend (Vercel - 5 min)
1. Go to [vercel.com](https://vercel.com) and sign up with GitHub
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory:** `web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`
   - **Environment Variable:** `REACT_APP_API_URL=https://your-backend.railway.app/api`
5. Click "Deploy"
6. Your web app is live!

### Step 4: File Storage (AWS S3 - 10 min)
1. Sign up for [AWS](https://aws.amazon.com) (free tier available)
2. Go to S3 → Create bucket
3. Set bucket policy for public read (if needed)
4. Create IAM user with S3 access
5. Get access keys
6. Update backend with S3 credentials
7. Update upload route to use S3

### Step 5: Test Everything
- [ ] Backend API responds
- [ ] Web app loads
- [ ] Login works
- [ ] File uploads work
- [ ] Database queries work

## Environment Variables Checklist

### Backend (.env)
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-strong-secret-here
DATABASE_URL=postgresql://user:pass@host:5432/dbname
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

### Web Frontend
```env
REACT_APP_API_URL=https://your-backend.railway.app/api
```

### Mobile
Update `mobile/src/config/api.js`:
```javascript
const API_URL = 'https://your-backend.railway.app/api';
```

## Common Issues

### Backend won't start
- Check environment variables
- Verify database connection
- Check logs in Railway dashboard

### Web app can't connect to API
- Verify `REACT_APP_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is running

### File uploads fail
- Verify S3 credentials
- Check bucket permissions
- Verify bucket region

## Next Steps After Deployment

1. **Set up custom domain**
   - Add domain in Railway/Vercel
   - Update DNS records
   - SSL is automatic

2. **Set up monitoring**
   - Add Sentry for error tracking
   - Set up UptimeRobot for uptime monitoring

3. **Mobile app builds**
   - Set up EAS Build account
   - Build and test apps
   - Submit to app stores

4. **Backup strategy**
   - Enable automatic PostgreSQL backups
   - Set up S3 versioning
   - Document restore procedures

## Cost Estimate (First Month)

- Railway (Backend + Database): $5-20
- Vercel (Web): Free
- AWS S3: $1-5
- **Total: ~$6-25/month**

## Support

For detailed information, see:
- [Full Hosting Plan](./HOSTING_PLAN.md)
- [Technical Documentation](../technical/)
- [Setup Guides](../setup/)

