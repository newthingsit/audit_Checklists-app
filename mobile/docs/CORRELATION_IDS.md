# Request Correlation IDs

## Overview

Correlation IDs enable **distributed tracing** across mobile and backend systems. Every API request from the mobile app includes a unique `X-Correlation-ID` header that flows through the entire request lifecycle, making it easy to trace a single request across logs, error reports, and monitoring systems.

## How It Works

### 1. Request Flow
```
Mobile App → API Request → Backend → Database
     ↓            ↓           ↓          ↓
[Generate ID] [X-Correlation-ID] [Log with ID] [Log with ID]
```

### 2. Automatic ID Generation

The `ApiService` automatically generates a UUID v4 correlation ID for **every outgoing request**:

```javascript
// Generated format: 550e8400-e29b-41d4-a716-446655440000
X-Correlation-ID: 550e8400-e29b-41d4-a716-446655440000
```

### 3. Integration Points

**API Requests (ApiService.js)**
- ✅ Attaches `X-Correlation-ID` header to all requests
- ✅ Logs correlation ID with request/response in dev mode
- ✅ Stores correlation ID in axios config for error handling

**Error Reporting (Sentry)**
- ✅ Captures correlation ID with all API errors
- ✅ Tags errors with correlation ID for searchability
- ✅ Links mobile errors to backend logs

**Logging (Console)**
- ✅ Includes correlation ID in all API logs
- ✅ Format: `[API] METHOD url [correlation-id]`

## Usage

### Automatic (Default Behavior)

No manual action needed. Correlation IDs are automatically:
1. Generated for each request
2. Sent to backend via `X-Correlation-ID` header
3. Logged in development mode
4. Captured with Sentry errors

### Manual Access

Access correlation ID from axios config:

```javascript
import apiClient from './services/ApiService';

apiClient.get('/api/audits')
  .then(response => {
    const correlationId = response.config.correlationId;
    console.log('Request succeeded:', correlationId);
  })
  .catch(error => {
    const correlationId = error.config?.correlationId || 'unknown';
    console.error('Request failed:', correlationId);
  });
```

## Log Examples

### Successful Request
```
[API] GET /api/audits [550e8400-e29b-41d4-a716-446655440000]
[API] ✓ 200 /api/audits [550e8400-e29b-41d4-a716-446655440000]
```

### Failed Request (with Retry)
```
[API] POST /api/audits [7c9e6679-7425-40de-944b-e7db9ea0a4f1]
[API] ✗ 500: /api/audits [7c9e6679-7425-40de-944b-e7db9ea0a4f1]
[API] ↻ Retrying request (attempt 1/3): /api/audits [7c9e6679-7425-40de-944b-e7db9ea0a4f1]
[API] ✓ 200 /api/audits [7c9e6679-7425-40de-944b-e7db9ea0a4f1]
```

### Authentication Error
```
[API] GET /api/user [a3b1c2d4-e5f6-4789-0abc-def123456789]
[API] ✗ 401 Unauthorized: /api/user [a3b1c2d4-e5f6-4789-0abc-def123456789]
[API] ✗ Token refresh failed [a3b1c2d4-e5f6-4789-0abc-def123456789] Network Error
```

## Tracing Errors Across Systems

### Step 1: User Reports Issue
User: "I got an error submitting my audit"

### Step 2: Check Sentry Dashboard
1. Go to Sentry dashboard
2. Search for errors around the time of failure
3. Find error tagged with correlation ID: `550e8400-e29b-41d4-a716-446655440000`

### Step 3: Search Backend Logs
```bash
# Search backend logs for the correlation ID
grep "550e8400-e29b-41d4-a716-446655440000" /var/log/backend/*.log

# Results show:
[2025-01-29 14:30:15] [550e8400-e29b-41d4-a716-446655440000] POST /api/audits - Database connection timeout
[2025-01-29 14:30:15] [550e8400-e29b-41d4-a716-446655440000] Database pool exhausted - 50/50 connections in use
```

### Step 4: Root Cause Identified
→ Database connection pool exhausted
→ Increase pool size or investigate long-running queries

## Sentry Integration

### Error Tags

All API errors captured by Sentry include:

```javascript
{
  tags: {
    correlation_id: "550e8400-e29b-41d4-a716-446655440000",
    http_status: "500",
    http_method: "POST",
    endpoint: "/api/audits"
  },
  contexts: {
    api: {
      correlation_id: "550e8400-e29b-41d4-a716-446655440000",
      endpoint: "/api/audits",
      method: "POST",
      status: 500,
      error_message: "Internal Server Error"
    }
  }
}
```

### Searching in Sentry

**By Correlation ID:**
```
tags.correlation_id:"550e8400-e29b-41d4-a716-446655440000"
```

**By Endpoint:**
```
tags.endpoint:"/api/audits"
```

**By Status Code:**
```
tags.http_status:"500"
```

## Backend Integration

### Required Backend Changes

For full distributed tracing, the backend must:

1. **Read X-Correlation-ID from request headers**
   ```javascript
   const correlationId = req.headers['x-correlation-id'];
   ```

2. **Log correlation ID with all operations**
   ```javascript
   logger.info(`[${correlationId}] Processing audit submission`);
   logger.error(`[${correlationId}] Database query failed: ${error}`);
   ```

3. **Return correlation ID in error responses**
   ```javascript
   res.status(500).json({
     error: 'Internal Server Error',
     correlationId: correlationId
   });
   ```

4. **Forward to downstream services**
   ```javascript
   axios.post('https://external-api.com/data', data, {
     headers: { 'X-Correlation-ID': correlationId }
   });
   ```

## Benefits

### 🔍 **Faster Debugging**
- Trace a single request across mobile → backend → database
- No more "I can't reproduce the error" - find exact request in logs

### 📊 **Better Observability**
- Correlate mobile errors with backend logs
- Identify patterns (e.g., all errors from specific endpoint)

### 🚀 **Improved Performance Analysis**
- Track request duration end-to-end
- Identify bottlenecks in specific requests

### 👥 **Better Customer Support**
- Find exact error in logs from user report
- Provide specific fix instead of generic "try again"

## Best Practices

### ✅ DO
- Always log correlation IDs in development
- Include correlation ID in error messages shown to support team
- Search by correlation ID first when debugging
- Use correlation IDs to group related errors in Sentry

### ❌ DON'T
- Never show correlation IDs to end users (internal use only)
- Don't use correlation IDs for authentication
- Don't reuse correlation IDs across multiple requests
- Don't log sensitive data alongside correlation IDs

## Troubleshooting

### Correlation ID not in Sentry errors

**Check 1:** Verify Sentry is initialized
```javascript
// mobile/App.js
import { initSentry } from './src/config/sentry';
initSentry(); // Must be called before any API requests
```

**Check 2:** Verify API errors are being captured
```javascript
// mobile/src/services/ApiService.js
import { captureApiError } from '../config/sentry';
// Should be called in error handler
```

### Correlation ID not in logs

**Check 1:** Verify you're in development mode
```javascript
if (__DEV__) {
  console.log(`[API] ...`); // Only logs in dev mode
}
```

**Check 2:** Check console filters
- Ensure console.log is not filtered out
- Look for `[API]` prefix

### Backend not receiving correlation ID

**Check 1:** Verify header is being sent
```javascript
// Add temporary debug log
apiClient.interceptors.request.use((config) => {
  console.log('Request headers:', config.headers);
  return config;
});
```

**Check 2:** Verify backend is reading the header
```javascript
// Backend (Node.js/Express)
app.use((req, res, next) => {
  console.log('Correlation ID:', req.headers['x-correlation-id']);
  next();
});
```

## Example: Full Request Lifecycle

```
1. User taps "Submit Audit"
   → auditService.createAudit() called

2. ApiService generates correlation ID
   → correlationId: "7c9e6679-7425-40de-944b-e7db9ea0a4f1"
   → [API] POST /api/audits [7c9e6679-7425-40de-944b-e7db9ea0a4f1]

3. Request sent to backend with header
   → X-Correlation-ID: 7c9e6679-7425-40de-944b-e7db9ea0a4f1

4. Backend logs request
   → [7c9e6679-7425-40de-944b-e7db9ea0a4f1] POST /api/audits - User: john@example.com

5. Backend validation fails
   → [7c9e6679-7425-40de-944b-e7db9ea0a4f1] Validation error: Missing required field

6. Backend returns 400 error
   → { error: "Missing field", correlationId: "7c9e6679-7425-40de-944b-e7db9ea0a4f1" }

7. Mobile receives error
   → [API] ✗ 400 Bad Request: /api/audits [7c9e6679-7425-40de-944b-e7db9ea0a4f1]

8. Error NOT sent to Sentry (400 = client error, not server error)

9. User sees error message
   → "Please fill in all required fields"
```

## Testing

### Test Correlation ID Generation

```javascript
import { generateCorrelationId } from './services/ApiService';

// Should match UUID v4 format
const id = generateCorrelationId();
console.log(id); // e.g., "550e8400-e29b-41d4-a716-446655440000"

// Should be unique
const id1 = generateCorrelationId();
const id2 = generateCorrelationId();
console.assert(id1 !== id2, 'IDs should be unique');
```

### Test Header Injection

```javascript
import apiClient from './services/ApiService';

apiClient.get('/api/test')
  .then(response => {
    const sentHeaders = response.config.headers;
    console.log('X-Correlation-ID:', sentHeaders['X-Correlation-ID']);
    console.assert(sentHeaders['X-Correlation-ID'], 'Header should exist');
  });
```

### Test Sentry Integration

```javascript
import { captureApiError } from './config/sentry';

const testError = {
  response: { status: 500, data: { message: 'Test error' } },
  config: { url: '/api/test', method: 'get' }
};

captureApiError(testError, 'test-correlation-id', '/api/test', 'GET');
// Check Sentry dashboard for error with tag: correlation_id: "test-correlation-id"
```

## Next Steps

1. ✅ **Task 3 Complete**: Correlation IDs integrated
2. **Task 4**: Set up Jest testing framework (test correlation ID generation)
3. **Task 5**: Write unit tests for API service (including correlation ID tests)
4. **Backend**: Implement correlation ID logging (see "Backend Integration" section)
5. **Monitoring**: Set up dashboard to track requests by correlation ID

## Related Documentation

- [SENTRY_SETUP.md](./SENTRY_SETUP.md) - Error tracking configuration
- [API_SERVICE.md](../src/services/README.md) - API service architecture
- [ENTERPRISE_ASSESSMENT.md](../../MOBILE_ENTERPRISE_GRADE_ASSESSMENT.md) - Sprint 1 roadmap
