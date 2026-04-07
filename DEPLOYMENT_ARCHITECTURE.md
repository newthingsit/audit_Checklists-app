# Cloud Foundry Deployment Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Restaurant Audit & Checklist App            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Mobile Apps    │       │   Web Browser    │       │   Administrators │
│  (iOS/Android)   │       │    (React SPA)   │       │                  │
└────────┬─────────┘       └────────┬─────────┘       └────────┬─────────┘
         │                          │                           │
         │                          │                           │
         └──────────────────────────┼───────────────────────────┘
                                    │
                                    │ HTTPS
                                    │
         ┌──────────────────────────▼───────────────────────────┐
         │         Cloud Foundry Platform (PaaS)                │
         └──────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴───────────────────────────┐
         │                                                       │
         │                                                       │
┌────────▼────────────┐                            ┌────────────▼─────────┐
│   Web Frontend      │                            │   Backend API        │
│   (audit-checklist- │                            │   (audit-checklist-  │
│        web)         │                            │      backend)        │
├─────────────────────┤                            ├──────────────────────┤
│ • React App         │                            │ • Node.js/Express    │
│ • Staticfile        │                            │ • JWT Auth           │
│ • nginx             │                            │ • REST API           │
│ • Buildpack         │                            │ • Buildpack          │
│ • 256MB RAM         │                            │ • 512MB RAM          │
│ • 1-2 Instances     │                            │ • 1-3 Instances      │
└─────────────────────┘                            └──────────┬───────────┘
                                                              │
                                                              │
                                                    ┌─────────▼──────────┐
                                                    │  PostgreSQL DB     │
                                                    │  (audit-checklist- │
                                                    │       db)          │
                                                    ├────────────────────┤
                                                    │ • Managed Service  │
                                                    │ • Auto Backups     │
                                                    │ • SSL Connection   │
                                                    │ • VCAP_SERVICES    │
                                                    └────────────────────┘
```

## Component Details

### 1. Web Frontend (Static Site)

**Cloud Foundry App**: `audit-checklist-web`
**Buildpack**: `staticfile_buildpack`
**Memory**: 256MB
**Instances**: 1-2

**Features**:
- React single-page application
- Served by nginx
- Supports React Router (pushstate)
- HTTPS enforced
- Security headers enabled
- Static asset caching

**Files**:
- `web/manifest.yml` - Deployment configuration
- `web/.cfignore` - Excludes source files
- `web/Staticfile` - nginx configuration
- `web/includes/routes.conf` - Routing rules

### 2. Backend API (Node.js Application)

**Cloud Foundry App**: `audit-checklist-backend`
**Buildpack**: `nodejs_buildpack`
**Memory**: 512MB
**Instances**: 1-3 (scalable)

**Features**:
- RESTful API
- JWT authentication
- CORS configured
- Rate limiting
- Health check endpoint
- Database connection via VCAP_SERVICES

**Files**:
- `backend/manifest.yml` - Deployment configuration
- `backend/.cfignore` - Excludes dev files
- `backend/vars.yml` - Environment variables (not in git)
- `backend/config/cloud-foundry.js` - CF-specific config

### 3. PostgreSQL Database

**Service**: `audit-checklist-db`
**Provider**: ElephantSQL / PostgreSQL
**Features**:
- Managed service
- Automatic backups
- SSL connections
- Bound to backend via VCAP_SERVICES

## Deployment Flow

### Manual Deployment

```
Developer Machine                     Cloud Foundry
─────────────────                     ─────────────
      │
      │  1. cf login
      ├──────────────────────────────►
      │  2. cf create-service         Create PostgreSQL
      ├──────────────────────────────► service instance
      │
      │  3. cd backend
      │     cf push                    Deploy backend
      ├──────────────────────────────► with nodejs buildpack
      │                                Bind to database
      │                                Start instances
      │
      │  4. cd web
      │     npm run build              Build React app
      │     cf push                    Deploy frontend
      ├──────────────────────────────► with staticfile buildpack
      │                                Configure nginx
      │                                Start instances
      │
      │  5. cf apps                    Verify deployment
      ◄──────────────────────────────┤
      │                                Backend: Running
      │                                Web: Running
```

### CI/CD with GitHub Actions

```
GitHub Repository                GitHub Actions              Cloud Foundry
─────────────────                ──────────────              ─────────────
      │
      │  Push to main
      │  branch
      ├─────────────────────►
      │                       Run tests
      │                       ├─ Backend tests
      │                       ├─ Web tests
      │                       └─ Lint checks
      │                              │
      │                              │ Tests pass
      │                              │
      │                       Login to CF  ──────────────►
      │                              │
      │                       Deploy backend
      │                       ├─ Create vars.yml
      │                       └─ cf push  ──────────────► Deploy + Verify
      │                              │
      │                       Build web
      │                       ├─ npm run build
      │                       └─ cf push  ──────────────► Deploy + Verify
      │                              │
      │                       Verify health
      │                       ├─ Check /api/health
      │                       └─ Test web URL
      │                              │
      ◄─────────────────────┤  Notify success
      Deployment complete
```

## Network Flow

### User Request Flow

```
1. User opens https://audit-checklist-web.cfapps.io
   │
   ├─► Cloud Foundry Router
   │   │
   │   └─► audit-checklist-web (nginx)
   │       │
   │       ├─► Serve index.html
   │       └─► Serve static assets (JS, CSS, images)
   │
   └─► Browser renders React app

2. React app makes API call to /api/audits
   │
   ├─► Backend URL: https://audit-checklist-backend.cfapps.io/api/audits
   │
   └─► Cloud Foundry Router
       │
       └─► audit-checklist-backend
           │
           ├─► Express.js handler
           ├─► JWT verification
           ├─► Database query (PostgreSQL)
           │   │
           │   └─► VCAP_SERVICES connection
           │
           └─► Return JSON response

3. Response flows back
   │
   └─► React app updates UI
```

## Scaling Strategy

### Horizontal Scaling (More Instances)

```bash
# Scale web frontend
cf scale audit-checklist-web -i 3

# Scale backend API
cf scale audit-checklist-backend -i 3

Cloud Foundry automatically:
├─► Load balances requests across instances
├─► Monitors instance health
├─► Restarts failed instances
└─► Distributes traffic evenly
```

### Vertical Scaling (More Resources)

```bash
# Increase memory and disk
cf scale audit-checklist-backend -m 1G -k 2G

Benefits:
├─► Handle more concurrent requests
├─► Larger in-memory caches
└─► Better performance under load
```

## Security Architecture

```
External Client                 Cloud Foundry               Application
───────────────                 ─────────────               ───────────
      │                               │                           │
      │  HTTPS Request                │                           │
      ├──────────────────────────────►│                           │
      │                               │  TLS Termination          │
      │                               │  (CF Handles SSL)         │
      │                               │                           │
      │                               │  Forward to app           │
      │                               ├──────────────────────────►│
      │                               │                           │
      │                               │                           │  CORS Check
      │                               │                           │  (ALLOWED_ORIGINS)
      │                               │                           │
      │                               │                           │  JWT Verification
      │                               │                           │
      │                               │                           │  Rate Limiting
      │                               │                           │
      │                               │  Response                 │
      │                               ◄──────────────────────────┤
      │  HTTPS Response               │                           │
      ◄──────────────────────────────┤                           │
      │                               │                           │
```

**Security Layers**:
1. **Cloud Foundry**: TLS/SSL, Network isolation, Platform security
2. **Application**: CORS, Rate limiting, Input validation
3. **Authentication**: JWT tokens, bcrypt password hashing
4. **Database**: SSL connections, Parameterized queries

## Monitoring & Logging

```
Application Logs ─────► Cloud Foundry Loggregator ─────► Log Aggregator
                                   │                     (Papertrail, etc.)
                                   │
Health Checks ─────────────────────┤
                                   │
Application Metrics ───────────────┤
(CPU, Memory, Disk)                │
                                   │
                              Monitoring
                              Dashboard
```

## Cost Optimization

```
Environment          Configuration              Monthly Cost
───────────         ─────────────              ────────────
Development         • 1 backend instance       $5-10
                    • 1 web instance
                    • Small DB

Staging             • 1 backend instance       $20-30
                    • 1 web instance
                    • Medium DB

Production          • 2-3 backend instances    $100-150
                    • 2 web instances
                    • Production DB
                    • Monitoring

Enterprise          • 3+ backend instances     $300-500+
                    • 3+ web instances
                    • High-availability DB
                    • Advanced monitoring
```

## Disaster Recovery

```
Regular Backups           Incident Occurs           Recovery Process
───────────────           ───────────               ────────────────
      │                         │                           │
      │  Automated daily        │                           │
      │  database backups       │                           │
      │  ├─ ElephantSQL         │                           │
      │  └─ VCAP_SERVICES       │                           │
      │                         │  Application fails        │
      │                         ├──────────────────────────►│
      │                         │                           │
      │                         │                           │  1. cf logs
      │                         │                           │     (diagnose)
      │                         │                           │
      │                         │                           │  2. cf restart
      │                         │                           │     or cf rollback
      │                         │                           │
      │                         │                           │  3. Verify health
      │                         │                           │
      │                         │  Service restored         │
      │                         ◄──────────────────────────┤
      │                         │                           │
```

## File Structure

```
audit_Checklists-app/
├── backend/
│   ├── manifest.yml              # Backend CF config
│   ├── .cfignore                 # Exclude files
│   ├── vars.yml.template         # Env vars template
│   ├── config/
│   │   └── cloud-foundry.js      # CF database config
│   └── server.js                 # Entry point
├── web/
│   ├── manifest.yml              # Web CF config
│   ├── .cfignore                 # Exclude files
│   ├── Staticfile                # nginx config
│   └── includes/
│       └── routes.conf           # Routing rules
├── deploy-to-cf.sh               # Deployment script
├── CLOUD_FOUNDRY_DEPLOYMENT.md   # Full guide
├── CLOUD_FOUNDRY_CHECKLIST.md    # Pre-deployment checklist
├── CLOUD_FOUNDRY_QUICK_REFERENCE.md # Commands
└── .github/
    └── workflows/
        └── deploy-cloud-foundry.yml # CI/CD pipeline
```

## Next Steps

1. Review [Getting Started Guide](GETTING_STARTED_CLOUD_FOUNDRY.md)
2. Complete [Pre-Deployment Checklist](CLOUD_FOUNDRY_CHECKLIST.md)
3. Run deployment: `./deploy-to-cf.sh`
4. Monitor: `cf logs audit-checklist-backend`
5. Scale as needed: `cf scale audit-checklist-backend -i 3`

---

*For detailed deployment instructions, see [CLOUD_FOUNDRY_DEPLOYMENT.md](CLOUD_FOUNDRY_DEPLOYMENT.md)*
