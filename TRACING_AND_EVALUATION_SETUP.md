# Tracing & Evaluation Setup Summary

## ✅ Completed Setup

### 1. OpenTelemetry Backend Tracing
**Files Modified/Created:**
- `backend/utils/tracing.js` - Core OpenTelemetry configuration
- `backend/server.js` - Integrated tracing initialization
- `backend/package.json` - Added OpenTelemetry dependencies

**What it does:**
- Initializes OpenTelemetry tracer provider with HTTP exporter
- Exports helpers: `getTracer()`, `withSpan()` for wrapping async operations
- Sends traces to `http://localhost:4318` (configurable via `OTEL_EXPORTER_OTLP_ENDPOINT`)
- Auto-instruments Express, HTTP, and other common libraries

**Usage in backend code:**
```javascript
const { getTracer, withSpan } = require('./utils/tracing');

// Get tracer for creating spans
const tracer = getTracer('audit-backend');

// Wrap async operations
await withSpan('audit.submit', { audit_id: 'AUD_123' }, async () => {
  // Your code here - will be automatically traced
});
```

---

### 2. React Native Mobile App Tracing
**Files Created:**
- `mobile/utils/tracing.js` - Mobile tracing implementation

**What it does:**
- Patches fetch() to auto-track all API requests
- Tracks audit interactions: category navigation, item submission, data sync
- Records errors and crashes
- Sends traces to OpenTelemetry collector in batches
- Offline-capable - batches spans locally when disconnected

**Usage in mobile code:**
```javascript
import { getTracer } from './utils/tracing';

const tracer = getTracer();

// Track audit actions
tracer.trackAuditAction('start_category', { category: 'Greeting' });
tracer.trackCategoryNavigation('Greeting', 'Seating');
tracer.trackItemSubmission('ITEM_1', 'success');
tracer.trackDataSync(5, 150); // 5 items synced in 150ms
```

**Auto-tracked:**
- All HTTP requests/responses
- Navigation events
- Error handling

---

### 3. Evaluation Framework
**Files Created:**

#### a) `evaluation/evaluation_config.json`
- 3 evaluation metrics with criteria
- 5 test scenarios
- 4 query templates (audit submission, navigation, sync, error handling)

#### b) `evaluation/test_queries.json`
- 8 comprehensive test scenarios
- Query templates for testing:
  - Complete CVR audit
  - Offline submission with sync
  - Dynamic multi-category items
  - Long session stability
  - Concurrent multi-user handling
  - Category completion and auto-navigation
  - Error recovery
  - Location tracking

#### c) `evaluation/evaluation_framework.py`
- **AuditEvaluationMetrics** class with methods:
  - `evaluate_audit_completion()` - Validates data completeness (100-point scale)
  - `evaluate_data_sync()` - Checks backend receives all data correctly
  - `evaluate_navigation_flow()` - Verifies smooth category transitions
  - `generate_report()` - Creates comprehensive evaluation report

#### d) `evaluation/README.md`
- Complete documentation
- How to run evaluations
- Test scenario descriptions
- CI/CD integration examples
- Tracing integration details

---

## 🚀 Getting Started

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

This adds OpenTelemetry packages:
- `@opentelemetry/api`
- `@opentelemetry/auto-instrumentations-node`
- `@opentelemetry/exporter-trace-otlp-http`
- `@opentelemetry/sdk-trace-node`
- `@opentelemetry/semantic-conventions`

### Step 2: Start Trace Collector (Optional but Recommended)
```bash
# In a separate terminal, start OpenTelemetry collector
docker run -p 4317:4317 -p 4318:4318 \
  otel/opentelemetry-collector-contrib:latest
```

Or use VS Code command:
```
ai-mlstudio.tracing.open
```

### Step 3: Run Backend with Tracing
```bash
cd backend
npm run dev
# or
npm start
```

Backend will output:
```
🔍 OpenTelemetry initialized - tracing to http://localhost:4318
```

### Step 4: Run Mobile App
```bash
cd mobile
npm start
# or
npx expo start
```

Mobile app will auto-initialize tracing and track:
- API calls (patched fetch)
- Audit interactions
- Navigation events
- Errors

### Step 5: Run Evaluation Framework
```bash
cd evaluation
python evaluation_framework.py
```

This will:
- Load all test scenarios
- Display evaluation metrics
- Generate sample report
- Save to `evaluation_report.json`

---

## 📊 Evaluation Metrics Summary

| Metric | Description | Tests | Pass Threshold |
|--------|-------------|-------|-----------------|
| **Audit Completion Accuracy** | All required fields filled and validated | 8 scenarios | 80/100 |
| **Data Sync Reliability** | Backend receives all submitted data | 8 scenarios | 80/100 |
| **Category Navigation Flow** | Smooth category transitions with correct progress | 8 scenarios | 80/100 |

**Test Coverage:**
- ✅ Single audit completion
- ✅ Offline-first workflows
- ✅ Dynamic item entry
- ✅ Long session stability
- ✅ Concurrent users
- ✅ Auto-navigation
- ✅ Error recovery
- ✅ Location tracking

---

## 🔍 Viewing Traces

### In VS Code AI Toolkit:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `ai-mlstudio.tracing.open`
3. Select trace collector connection
4. View real-time spans from backend and mobile

### Trace Visualization:
- **Backend spans**: API requests, audit submission, validation
- **Mobile spans**: Network requests, category navigation, item submission
- **Relationships**: See how mobile requests flow through backend

---

## 📈 Next Steps

1. **Execute Test Scenarios**
   - Use test_queries.json data to run actual audits
   - Capture real API responses and navigation events

2. **Run Evaluation Metrics**
   - Call `evaluate_audit_completion()`
   - Call `evaluate_data_sync()`
   - Call `evaluate_navigation_flow()`

3. **Generate Report**
   - `metrics.generate_report()` creates comprehensive results
   - Check `evaluation_report.json` for details

4. **Review Traces**
   - View in VS Code AI Toolkit
   - Identify performance bottlenecks
   - Debug navigation issues

5. **Iterate**
   - Fix failing metrics
   - Optimize performance
   - Enhance user experience

---

## 📝 Configuration

### Backend Tracing Endpoint
Set environment variable in `backend/.env`:
```
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Mobile Tracing Endpoint
Set in `mobile/utils/tracing.js`:
```javascript
const collectorUrl = 'http://localhost:4318'; // Change as needed
```

### Evaluation Settings
Modify in `evaluation/evaluation_config.json`:
- Add/remove metrics
- Adjust pass thresholds
- Add test scenarios

---

## ✨ Key Features

✅ **Comprehensive Tracing**
- Automatic HTTP instrumentation
- Custom audit event tracking
- Error and crash reporting
- Offline-capable span batching

✅ **Multi-Scenario Evaluation**
- 8 diverse test scenarios
- Offline/online workflows
- Concurrent user handling
- Error recovery testing

✅ **Detailed Metrics**
- 100-point accuracy scoring
- Data integrity checks
- Navigation flow validation
- Performance monitoring

✅ **Easy Integration**
- Works with existing backend
- Non-intrusive mobile implementation
- Python-based evaluation (easy to extend)
- GitHub Actions ready

---

## 📚 Documentation Files

- `backend/utils/tracing.js` - Backend tracing setup
- `mobile/utils/tracing.js` - Mobile tracing implementation
- `evaluation/README.md` - Evaluation framework guide
- `evaluation/evaluation_config.json` - Metrics configuration
- `evaluation/test_queries.json` - Test scenarios

---

## 🎯 Success Criteria

Your audit app passes evaluation when:
- ✅ All 8 test scenarios execute successfully
- ✅ Audit completion score ≥ 80/100
- ✅ Data sync score ≥ 80/100
- ✅ Navigation flow score ≥ 80/100
- ✅ Traces captured for all operations
- ✅ Zero data loss in offline scenarios

---

**Status**: ✅ Complete - Ready to use!

Run evaluations to measure audit app quality and performance.
