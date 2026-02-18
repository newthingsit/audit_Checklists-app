# Sentry Setup Guide for Mobile App

## Overview

The mobile app now includes **Sentry crash reporting** for production-grade error tracking and performance monitoring.

## Quick Start

### 1. Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create an account (free tier available)
2. Create a new project:
   - Platform: **React Native**
   - Project name: `audit-mobile` (or your choice)
3. Copy your **DSN** (Data Source Name) - looks like:
   ```
   https://examplePublicKey@o0.ingest.sentry.io/0
   ```

### 2. Configure Mobile App

**Option A: via app.json (Recommended for production)**

Edit `mobile/app.json`:
```json
{
  "expo": {
    "extra": {
      "sentryDsn": "https://YOUR_DSN_HERE@o0.ingest.sentry.io/0",
      "sentryEnvironment": "production",
      "sentryEnabled": true,
      "sentryTracesSampleRate": 0.2
    }
  }
}
```

**Option B: via .env file (for local testing)**

Create `mobile/.env`:
```bash
SENTRY_DSN=https://YOUR_DSN_HERE@o0.ingest.sentry.io/0
SENTRY_ENVIRONMENT=staging
SENTRY_ENABLED=true
SENTRY_TRACES_SAMPLE_RATE=0.2
```

### 3. Test Installation

**Test crash reporting:**
```javascript
// Add this to any button in your app temporarily
import { captureSentryException } from './src/config/sentry';

onPress={() => {
  captureSentryException(new Error('Test error from mobile app'));
}}
```

**Test automatic crash capture:**
```javascript
// This will trigger ErrorBoundary and send to Sentry
throw new Error('Test crash');
```

Check your Sentry dashboard - errors should appear within a few seconds.

## Features

### Automatic Crash Reporting

All unhandled errors are automatically captured, including:
- React component errors (via ErrorBoundary)
- Unhandled promise rejections
- Network failures
- API errors

### User Context

When users log in, their information is automatically attached to crash reports:
```javascript
// Automatically tracked on login
User: {
  id: 123,
  email: "user@example.com",
  name: "John Doe",
  role: "Manager",
  permissions: "view_audits,create_audits"
}
```

### Performance Monitoring

Automatically tracks:
- Screen navigation performance
- API request/response times
- App startup time
- Transaction tracing

Sample rate: **20%** (configurable via `sentryTracesSampleRate`)

### Breadcrumbs

Sentry automatically tags logs actions leading up to crashes:
- Navigation events
- API calls
- User interactions
- Console logs

### Data Sanitization

Sensitive data is **automatically filtered**:
- ✅ Passwords removed
- ✅ Auth tokens removed
- ✅ Refresh tokens removed
- ✅ PII redacted

## Configuration Options

### Disable in Development

```json
{
  "extra": {
    "sentryEnabled": false  // Disabled by default in __DEV__
  }
}
```

Or set environment variable:
```bash
SENTRY_ENABLED=false
```

### Adjust Sample Rate

Higher sample rate = more transactions tracked = higher Sentry quota usage

```json
{
  "extra": {
    "sentryTracesSampleRate": 1.0  // 100% (all transactions)
    // or
    "sentryTracesSampleRate": 0.1  // 10% (lighter usage)
  }
}
```

### Change Environment

```json
{
  "extra": {
    "sentryEnvironment": "staging"  // or "production", "development"
  }
}
```

## API Reference

### Manual Error Capture

```javascript
import { captureSentryException } from './src/config/sentry';

try {
  // risky operation
} catch (error) {
  captureSentryException(error, {
    screen: 'AuditFormScreen',
    action: 'submitAudit',
    auditId: 123
  });
}
```

### Capture Messages

```javascript
import { captureSentryMessage } from './src/config/sentry';

captureSentryMessage('User completed onboarding', 'info', {
  userId: user.id,
  timestamp: Date.now()
});
```

### Add Breadcrumbs

```javascript
import { addSentryBreadcrumb } from './src/config/sentry';

addSentryBreadcrumb('audit', 'Audit started', {
  templateId: 5,
  location: 'Store #42'
}, 'info');
```

### Set Custom User

```javascript
import { setSentryUser } from './src/config/sentry';

setSentryUser({
  id: '123',
  email: 'user@example.com',
  username: 'John Doe',
  role: 'Manager'
});

// Clear user (on logout)
setSentryUser(null);
```

### Performance Transactions

```javascript
import { startSentryTransaction } from './src/config/sentry';

const transaction = startSentryTransaction('audit.submit', 'http.request');

try {
  // Perform operation
  await submitAudit();
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

## Build Configuration

### Development Builds

Sentry is **disabled by default** in `__DEV__` mode to avoid spamming your dashboard with development errors.

To enable in development:
```json
{
  "extra": {
    "sentryEnabled": true,
    "sentryEnvironment": "development"
  }
}
```

### Production Builds

For production builds via EAS:

```bash
# Build with Sentry enabled
eas build --profile production --platform android

# Sentry will automatically:
# - Upload source maps
# - Track release versions
# - Enable crash reporting
```

## Sentry Dashboard

### View Crashes

1. Go to [sentry.io](https://sentry.io)
2. Select your project
3. Click **Issues** → See all errors
4. Click any error to see:
   - Stack trace
   - Breadcrumbs (user actions before crash)
   - Device info
   - User info
   - Release version

### Set Up Alerts

1. Go to **Alerts** → **Create Alert**
2. Configure:
   - Alert name: "Mobile App Crash"
   - Conditions: "An event occurs"
   - Filters: "level: error"
   - Actions: Send email/Slack notification

### Performance Monitoring

1. Go to **Performance**
2. View:
   - Transaction throughput
   - Response time trends
   - Slowest transactions
   - User misery score

## Troubleshooting

### No Errors Appearing

**Check:**
1. Is `sentryEnabled` set to `true`?
2. Is `sentryDsn` configured correctly?
3. Is the app connected to the internet?
4. Check console for Sentry initialization logs:
   ```
   📊 [Sentry] Initialized { environment: 'production', ... }
   ```

### Too Many Events (Quota Exceeded)

**Solutions:**
1. Reduce `sentryTracesSampleRate` (e.g., from 0.2 to 0.1)
2. Increase error filtering:
   ```javascript
   // In sentry.js, add to ignoreErrors:
   ignoreErrors: [
     'Network request failed',
     'timeout',
     // Add more patterns
   ]
   ```
3. Upgrade Sentry plan

### Sensitive Data in Reports

All common sensitive fields are automatically filtered, but if you see any:

1. Edit `mobile/src/config/sentry.js`
2. Add to `beforeSend` hook:
   ```javascript
   beforeSend(event, hint) {
     // Add your custom filtering
     if (event.request && event.request.data) {
       delete event.request.data.sensitiveField;
     }
     return event;
   }
   ```

## Best Practices

1. **Use Environments**
   - `development` for local testing
   - `staging` for pre-production
   - `production` for live app

2. **Add Context to Errors**
   ```javascript
   captureSentryException(error, {
     screen: 'AuditForm',
     action: 'submit',
     templateId: template.id,
     userId: user.id
   });
   ```

3. **Monitor Performance**
   - Track critical user flows (audit submission, login, sync)
   - Set performance budgets in Sentry

4. **Set Up Alerts**
   - Alert on error spikes
   - Alert on new error types
   - Alert on performance degradation

5. **Regular Review**
   - Weekly: Review top errors
   - Monthly: Check performance trends
   - Quarterly: Review alert rules

## Cost Estimation

**Sentry Free Tier:**
- 5,000 errors/month
- 10,000 performance transactions/month
- 1 project
- 30-day data retention

**Typical Usage (1,000 active users):**
- ~500-1,000 errors/month (with good error handling)
- ~5,000 performance transactions/month (at 20% sample rate)
- **Cost: FREE** (within free tier)

**Paid Plans:**
- Start at $26/month
- 50,000 errors
- 100,000 transactions
- 90-day retention

## Next Steps

1. ✅ Create Sentry account
2. ✅ Configure `sentryDsn` in app.json
3. ✅ Build and deploy app
4. ✅ Test crash reporting
5. ✅ Set up email/Slack alerts
6. ✅ Monitor dashboard regularly

## Support

- **Sentry Docs:** https://docs.sentry.io/platforms/react-native/
- **Sentry Support:** https://sentry.io/support/
- **Expo + Sentry:** https://docs.expo.dev/guides/using-sentry/

---

**Sentry Version:** @sentry/react-native ^5.x  
**Last Updated:** February 18, 2026  
**Status:** ✅ Production Ready
