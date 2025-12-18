# 🔍 Failed Requests Analysis - Application Insights

## What Are "Failed Requests" in Application Insights?

**Failed requests** are HTTP requests that return error status codes:
- **500 Internal Server Error** - Server-side errors (database, code exceptions)
- **400 Bad Request** - Invalid client requests
- **401 Unauthorized** - Authentication failures
- **403 Forbidden** - Permission denied
- **404 Not Found** - Endpoint not found
- **429 Too Many Requests** - Rate limiting
- **502/503/504** - Gateway/Service unavailable

---

## 🔴 Common Causes in Your Application

Based on codebase analysis, here are the main failure sources:

### 1. **Database Connection Issues** ⚠️ HIGH PRIORITY
**Location:** `backend/config/database-mssql.js`

**Issues:**
- SQL Server connection timeouts (especially Azure cold starts)
- Connection pool exhaustion
- Network interruptions
- Certificate/encryption issues

**Symptoms:**
- Intermittent 500 errors
- "Database error" messages
- Timeouts during peak usage

**Current Mitigations:**
- ✅ Connection pool configured (max: 10, min: 2)
- ✅ Retry logic with exponential backoff
- ✅ Connection timeout: 60 seconds
- ✅ Auto-reconnection on connection errors

**Recommendations:**
```javascript
// Monitor connection pool health
// Add connection pool metrics to Application Insights
// Consider increasing pool size if needed
```

---

### 2. **SQL Query Syntax Errors** ✅ MOSTLY FIXED
**Location:** `backend/routes/reports.js`, `backend/routes/audits.js`

**Issues:**
- SQL Server vs SQLite syntax differences
- Missing columns (`location_name` issue - FIXED)
- Invalid column references

**Status:** ✅ **Fixed** - All queries now use database type detection

**Remaining Risks:**
- Complex queries with joins might still have issues
- Date/time functions differ between databases

---

### 3. **Missing Error Handling** ⚠️ MEDIUM PRIORITY
**Location:** Multiple route files

**Issues:**
- Unhandled promise rejections
- Missing try-catch blocks
- Database errors not caught properly

**Examples Found:**
```javascript
// Some routes return 500 without proper error details
res.status(500).json({ error: 'Database error' });
```

**Recommendations:**
- ✅ Add try-catch to all async routes
- ✅ Log detailed error information
- ✅ Return user-friendly error messages

---

### 4. **Rate Limiting (429 Errors)** ✅ CONFIGURED
**Location:** `backend/server.js`

**Current Settings:**
- Login attempts: 100 per 15 minutes
- API requests: Rate limited per IP

**This is EXPECTED behavior** - Not a bug, but protection against abuse.

---

### 5. **Authentication Failures (401)** ✅ NORMAL
**Location:** `backend/routes/auth.js`

**Common Causes:**
- Expired JWT tokens
- Invalid credentials
- Missing Authorization header

**This is EXPECTED behavior** - Normal security responses.

---

### 6. **Settings/Preferences Endpoint** ✅ FIXED
**Location:** `backend/routes/settings.js`

**Previous Issue:**
- Query failed if `user_preferences` table didn't exist
- Returned 500 error

**Status:** ✅ **Fixed** - Now returns default preferences gracefully

---

### 7. **Report Generation Errors** ⚠️ MEDIUM PRIORITY
**Location:** `backend/routes/reports.js`, `backend/utils/excelExport.js`

**Issues:**
- Large dataset timeouts
- Memory issues with Excel generation
- File system errors

**Current Mitigations:**
- ✅ Error handling added
- ✅ Timeout handling
- ⚠️ May need optimization for very large reports

---

## 📊 How to Investigate Failed Requests

### Step 1: Check Application Insights Dashboard

1. **Go to Azure Portal** → Application Insights → `audit-app-backend-2221`
2. **Navigate to Failures** section
3. **Review:**
   - Failed request count over time
   - Top failing endpoints
   - Error types and messages
   - Exception stack traces

### Step 2: Filter by Error Type

**In Application Insights, filter by:**
- **Status Code:** 500, 400, 401, 429
- **Request Path:** Specific endpoints
- **Time Range:** Last 24 hours, 7 days, etc.

### Step 3: Analyze Exception Details

**Look for:**
- Database connection errors
- SQL syntax errors
- Missing table/column errors
- Timeout errors
- Memory errors

### Step 4: Check Backend Logs

**Location:** Azure App Service → Log Stream or Application Insights → Logs

**Search for:**
```javascript
// Common error patterns
"Database error"
"Unhandled request error"
"Error fetching"
"Connection timeout"
```

---

## 🛠️ Recommendations to Reduce Failed Requests

### 1. **Add Application Insights Custom Events**
```javascript
// Track specific error types
const appInsights = require('applicationinsights');
appInsights.defaultClient.trackEvent({
  name: 'DatabaseConnectionError',
  properties: { endpoint: req.path, error: err.message }
});
```

### 2. **Implement Circuit Breaker Pattern**
```javascript
// Prevent cascading failures
// If database is down, return cached data or graceful degradation
```

### 3. **Add Request Retry Logic** ✅ PARTIALLY IMPLEMENTED
- ✅ Mobile app has retry logic
- ⚠️ Backend could retry transient database errors

### 4. **Monitor Connection Pool Health**
```javascript
// Add metrics for:
// - Active connections
// - Pool size
// - Connection wait time
// - Failed connection attempts
```

### 5. **Optimize Slow Queries**
- Identify slow endpoints in Application Insights
- Add database indexes
- Optimize complex queries
- Consider query result caching

### 6. **Add Health Check Endpoint**
```javascript
// /api/health endpoint that checks:
// - Database connectivity
// - Connection pool status
// - Memory usage
// - Response time
```

### 7. **Improve Error Messages**
```javascript
// Instead of generic "Database error"
// Return specific error codes:
{
  error: 'DATABASE_CONNECTION_ERROR',
  message: 'Unable to connect to database',
  retryable: true,
  retryAfter: 5000
}
```

---

## 📈 Expected vs Unexpected Failures

### ✅ **Expected Failures (Normal):**
- **401 Unauthorized** - Invalid/expired tokens
- **400 Bad Request** - Invalid input data
- **404 Not Found** - Invalid endpoints
- **429 Too Many Requests** - Rate limiting working

### ⚠️ **Unexpected Failures (Need Investigation):**
- **500 Internal Server Error** - Should be investigated
- **502/503/504** - Service unavailable (Azure issues)
- **Database connection errors** - Need monitoring
- **Timeout errors** - May need optimization

---

## 🎯 Action Items

### Immediate (High Priority):
1. ✅ **Monitor Application Insights** - Check failed requests daily
2. ✅ **Set up Alerts** - Get notified when failure rate > 5%
3. ⚠️ **Review Error Logs** - Identify top failing endpoints

### Short Term (Medium Priority):
1. ⚠️ **Add Health Check Endpoint** - Monitor system health
2. ⚠️ **Optimize Slow Queries** - Reduce timeout errors
3. ⚠️ **Add Connection Pool Monitoring** - Track pool health

### Long Term (Low Priority):
1. ⚠️ **Implement Circuit Breaker** - Prevent cascading failures
2. ⚠️ **Add Request Caching** - Reduce database load
3. ⚠️ **Performance Testing** - Identify bottlenecks

---

## 📞 How to Get Help

1. **Check Application Insights** - Most errors are logged there
2. **Review Backend Logs** - Azure App Service Log Stream
3. **Check Database Health** - Azure SQL Database metrics
4. **Review Recent Code Changes** - Check git history for recent fixes

---

## 🔗 Related Documentation

- `FIX_ALL_500_ERRORS.md` - Previous fixes applied
- `FIX_500_ERROR_FINAL.md` - Final fixes for 500 errors
- `RATE_LIMIT_FIX.md` - Rate limiting configuration
- `SQL_SERVER_FIXES.md` - SQL Server specific fixes

---

**Last Updated:** Based on current codebase analysis
**Status:** Most critical issues fixed, monitoring recommended

