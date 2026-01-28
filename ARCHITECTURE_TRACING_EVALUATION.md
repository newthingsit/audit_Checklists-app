# Architecture: Tracing & Evaluation System

## System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         AUDIT APP WITH OBSERVABILITY                      │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  CLIENT TIER                                                               │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │                                                              │         │
│  │  Mobile App (React Native/Expo)                             │         │
│  │  ┌────────────────────────────────────────────────────────┐ │         │
│  │  │  App.js (Startup)                                      │ │         │
│  │  │  └─ initTracing() ────┐                               │ │         │
│  │  │                       │                                │ │         │
│  │  │  AuditFormScreen.js   │                                │ │         │
│  │  │  ├─ Category Navigation ─────┐                         │ │         │
│  │  │  ├─ Item Submission ──────────┼─> Tracer Calls        │ │         │
│  │  │  └─ Data Sync ────────────────┤                        │ │         │
│  │  │                               │                        │ │         │
│  │  │  Network Requests             │                        │ │         │
│  │  │  └─ fetch() (patched) ────────┘                        │ │         │
│  │  │                                                        │ │         │
│  │  └────────────────────────────────────────────────────────┘ │         │
│  │                                                              │         │
│  └─────────────────────┬──────────────────────────────────────┘         │
│                        │                                                  │
│                        │ OpenTelemetry Spans                            │
│                        │ (HTTP: localhost:4318)                         │
│                        │ (gRPC: localhost:4317)                         │
│                        │                                                  │
│  SERVER TIER           │                                                  │
│  ┌────────────────────┴──────────────────────────────────────┐           │
│  │                                                           │           │
│  │  Backend API (Express.js)                                │           │
│  │  ┌─────────────────────────────────────────────────────┐ │           │
│  │  │  server.js (Startup)                                │ │           │
│  │  │  └─ initializeTracing() ──────────────────────────┐ │ │           │
│  │  │                                                   │ │ │           │
│  │  │  Route Handlers                                  │ │ │           │
│  │  │  ├─ POST /api/audits (submit)      ┐            │ │ │           │
│  │  │  ├─ GET /api/audits/:id            ├─> Auto     │ │ │           │
│  │  │  ├─ PUT /api/audits/:id (update)   │  Traced    │ │ │           │
│  │  │  └─ DELETE /api/audits/:id         ┘            │ │ │           │
│  │  │                                                   │ │ │           │
│  │  │  Business Logic                                  │ │ │           │
│  │  │  ├─ Validation (withSpan)                        │ │ │           │
│  │  │  ├─ Database Operations                          │ │ │           │
│  │  │  └─ Error Handling                               │ │ │           │
│  │  │                                                   │ │ │           │
│  │  └───────────────────────────────────────────────────┘ │ │           │
│  │                                                           │           │
│  │  Database                                                │           │
│  │  ├─ SQL Server / SQLite                                │           │
│  │  └─ Audit Records, Items, Responses                   │           │
│  │                                                           │           │
│  └───────────────────────────────────────────────────────────┘           │
│                                                                            │
│  OBSERVABILITY TIER                                                       │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │                                                          │            │
│  │  OpenTelemetry Collector                                │            │
│  │  ┌────────────────────────────────────────────────────┐ │            │
│  │  │  Receivers                                         │ │            │
│  │  │  ├─ OTLP HTTP (port 4318)                         │ │            │
│  │  │  └─ OTLP gRPC (port 4317)                         │ │            │
│  │  │                                                    │ │            │
│  │  │  Processing                                        │ │            │
│  │  │  └─ Batch Processing, Filtering                  │ │            │
│  │  │                                                    │ │            │
│  │  │  Exporters                                         │ │            │
│  │  │  ├─ File (local storage)                           │ │            │
│  │  │  └─ Console (debug output)                         │ │            │
│  │  │                                                    │ │            │
│  │  └────────────────────────────────────────────────────┘ │            │
│  │                                                          │            │
│  │  Trace Viewer (VS Code AI Toolkit)                      │            │
│  │  ├─ Span Timeline Visualization                         │            │
│  │  ├─ Request Tracing                                     │            │
│  │  ├─ Error Analysis                                      │            │
│  │  └─ Performance Metrics                                 │            │
│  │                                                          │            │
│  └──────────────────────────────────────────────────────────┘            │
│                                                                            │
│  EVALUATION TIER                                                          │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │                                                          │            │
│  │  Evaluation Framework (Python)                          │            │
│  │  ┌────────────────────────────────────────────────────┐ │            │
│  │  │  Test Data                                         │ │            │
│  │  │  ├─ test_queries.json (8 scenarios)               │ │            │
│  │  │  │  ├─ CVR Complete Audit                         │ │            │
│  │  │  │  ├─ Offline + Sync                             │ │            │
│  │  │  │  ├─ Dynamic Items                              │ │            │
│  │  │  │  ├─ Long Session (35+ min)                     │ │            │
│  │  │  │  ├─ Concurrent Users (3)                       │ │            │
│  │  │  │  ├─ Category Completion                        │ │            │
│  │  │  │  ├─ Error Recovery                             │ │            │
│  │  │  │  └─ Location Tracking                          │ │            │
│  │  │  └─ evaluation_config.json (metrics)              │ │            │
│  │  │                                                    │ │            │
│  │  │  Evaluation Metrics (3 Core)                      │ │            │
│  │  │  ├─ Audit Completion Accuracy (100 pts)           │ │            │
│  │  │  │  ├─ Required Fields Present                    │ │            │
│  │  │  │  ├─ Valid Data Types                           │ │            │
│  │  │  │  └─ Pass Threshold: ≥80                        │ │            │
│  │  │  │                                                 │ │            │
│  │  │  ├─ Data Sync Reliability (100 pts)               │ │            │
│  │  │  │  ├─ Backend Receives All Items                 │ │            │
│  │  │  │  ├─ No Data Corruption                         │ │            │
│  │  │  │  ├─ Timestamp Accuracy                         │ │            │
│  │  │  │  └─ Pass Threshold: ≥80                        │ │            │
│  │  │  │                                                 │ │            │
│  │  │  └─ Category Navigation Flow (100 pts)            │ │            │
│  │  │     ├─ Smooth Category Transitions                │ │            │
│  │  │     ├─ Accurate Progress Tracking                 │ │            │
│  │  │     ├─ No State Loss                              │ │            │
│  │  │     └─ Pass Threshold: ≥80                        │ │            │
│  │  │                                                    │ │            │
│  │  │  Reporting                                         │ │            │
│  │  │  ├─ evaluation_report.json (detailed)             │ │            │
│  │  │  ├─ Summary Statistics                            │ │            │
│  │  │  ├─ Per-Scenario Scores                           │ │            │
│  │  │  └─ Issue Identification                          │ │            │
│  │  │                                                    │ │            │
│  │  └────────────────────────────────────────────────────┘ │            │
│  │                                                          │            │
│  └──────────────────────────────────────────────────────────┘            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Audit Submission with Tracing

```
User Action                     Mobile App                 Backend API
(Start Audit)                   (Tracing)                  (Tracing)
    │                              │                          │
    ├──────────────────────────────┼──────────────────────────┤
    │  1. User taps "Start"        │                          │
    │──────────────────────────────>│                          │
    │                              │ trackAuditAction()       │
    │                              │ startSpan('audit.start') │
    │                              │                          │
    │  2. User fills item          │                          │
    │──────────────────────────────>│                          │
    │                              │ trackItemSubmission()    │
    │                              │ startSpan('item.fill')   │
    │                              │                          │
    │  3. User navigates category  │                          │
    │──────────────────────────────>│                          │
    │                              │ trackCategoryNav()       │
    │                              │ endSpan('item.fill')     │
    │                              │                          │
    │  4. User submits audit       │                          │
    │──────────────────────────────>│                          │
    │                              │ fetch('/api/audits')     │
    │                              │ (patched, auto-traced)   │
    │                              │                          │
    │                              │ HTTP POST request        │
    │                              │ with OTLP span ─────────>│
    │                              │                          │ initializeTracing()
    │                              │                          │ startSpan('audit.submit')
    │                              │                          │
    │                              │                          │ validateAudit()
    │                              │                          │ (auto-traced)
    │                              │                          │
    │                              │                          │ saveToDatabase()
    │                              │                          │ (auto-traced)
    │                              │                          │
    │                              │ HTTP 200 response        │
    │                              │ with OTLP span <─────────┤
    │                              │ (auto-traced response)   │ endSpan('audit.submit')
    │                              │                          │
    │  5. Data synced (offline)    │                          │
    │  ✓ Received confirmation     │                          │
    │<──────────────────────────────│                          │
    │                              │ trackDataSync()          │
    │                              │ endSpan('audit.start')   │
    │                              │                          │
    │                              │ flushSpans()             │
    │                              │ (send batch to collector)│
    │                              │                          │
    │                         Collector                       │
    │                      Receives Spans                     │
    │                      Stores Traces                      │
    │                     (localhost:4318)                    │
    │                            │                            │
    │                       Visualization                     │
    │                    (VS Code AI Toolkit)                │
    │                                                         │
```

---

## Data Flow: Evaluation Process

```
Test Scenario                   Python Framework              Metrics Scoring
(from test_queries.json)        (evaluation_framework.py)     (Pass/Fail)
    │                                │                           │
    ├───────────────────────────────┼───────────────────────────┤
    │                               │                           │
    │  Load Query: q1_cvr_complete  │                           │
    │───────────────────────────────>│                           │
    │  (4 items, 4 categories)       │                           │
    │                               │ Load Config              │
    │                               │ Load Test Queries        │
    │                               │                           │
    │  Execute Audit Actions         │                           │
    │───────────────────────────────>│                           │
    │  (via API or simulation)       │                           │
    │                               │                           │
    │  Capture Responses             │                           │
    │   - Submission success         │                           │
    │   - Backend stored items       │                           │
    │   - Navigation events          │                           │
    │───────────────────────────────>│                           │
    │                               │ evaluate_audit_completion()
    │                               │ ✓ 4 items present        │
    │                               │ ✓ All fields valid       │
    │                               │ ✓ Metadata complete      │
    │                               ├──────────────────────────>│
    │                               │                           │ Score: 100/100
    │                               │                           │ Status: PASS ✅
    │                               │                           │
    │                               │ evaluate_data_sync()      │
    │                               │ ✓ 4 items received       │
    │                               │ ✓ No corruption          │
    │                               │ ✓ Timestamps match       │
    │                               ├──────────────────────────>│
    │                               │                           │ Score: 100/100
    │                               │                           │ Status: PASS ✅
    │                               │                           │
    │                               │ evaluate_navigation()     │
    │                               │ ✓ 4 navigation events    │
    │                               │ ✓ No state loss          │
    │                               │ ✓ Progress updated       │
    │                               ├──────────────────────────>│
    │                               │                           │ Score: 100/100
    │                               │                           │ Status: PASS ✅
    │                               │                           │
    │                               │ generate_report()         │
    │                               │ Save evaluation_report.json
    │                               │                           │
    │                               │ Summary:                  │
    │                               │ ├─ Metric 1: PASS (100)   │
    │                               │ ├─ Metric 2: PASS (100)   │
    │                               │ └─ Metric 3: PASS (100)   │
    │                               │                           │
    │  Overall: PASS ✅             │                           │
    │  Scenario Complete            │                           │
    │<───────────────────────────────┤                           │
    │                               │                           │
    │  Next Scenario (q2_offline)   │                           │
    │───────────────────────────────>│                           │
    │  ...                          │                           │
    │                               │                           │
```

---

## Tracing Instrumentation Strategy

### Backend - Auto Instrumentation
```
Express Middleware                -> HTTP Span
  └─ Request Handler
       └─ Validation              -> Custom Span (withSpan)
       └─ Database Query          -> Auto Span
       └─ Response                -> HTTP Response Span
            └─ Error Handler      -> Error Span
```

### Mobile - Manual & Patched Instrumentation
```
App Startup
  └─ initTracing()
       └─ patchFetch()            -> Auto Spans for HTTP
       └─ setupErrorTracking()    -> Error Spans

User Actions
  └─ trackAuditAction()           -> Manual Spans
  └─ trackCategoryNavigation()    -> Navigation Spans
  └─ trackItemSubmission()        -> Item Spans
  └─ trackDataSync()              -> Sync Spans
```

---

## Span Hierarchy Example

```
Trace ID: 550e8400e29b41d4dbed4444aff5d4e0

├─ audit.start
│  ├─ category.Greeting
│  │  ├─ item_submission (item_1)
│  │  └─ item_submission (item_2)
│  └─ navigation (Greeting → Seating)
│
├─ category.Seating
│  ├─ item_submission (item_3)
│  ├─ item_submission (item_4)
│  └─ navigation (Seating → Service)
│
└─ audit.submit
   ├─ http.request (POST /api/audits)
   │  ├─ http.response (200 OK)
   │  └─ http.client_connection
   └─ data.sync
      └─ batch_send (10 spans)
```

---

## Metric Calculation Engine

### Audit Completion Accuracy
```
Base Score: 100

Deductions:
├─ No items found: -50
├─ Missing item ID: -10 per item
├─ Missing category: -10 per item
├─ Missing response: -15 per item
├─ Invalid response: -15 per item
├─ Missing audit_id: -10
├─ Missing user_id: -10
└─ Missing restaurant_id: -10

Final Score = Base - Deductions (min: 0, max: 100)
Pass = Score ≥ 80
```

### Data Sync Reliability
```
Base Score: 100

Deductions:
├─ Not received: -100 (fail immediately)
├─ Item count mismatch: -30
├─ Timestamp >5sec off: -20 per mismatch
└─ Data corruption: -15 per item

Final Score = Base - Deductions (min: 0, max: 100)
Pass = Score ≥ 80
```

### Category Navigation Flow
```
Base Score: 100

Deductions:
├─ No events: -100 (fail immediately)
├─ Invalid category: -10 per event
├─ State loss: -25 per loss
└─ No progress updates: -20

Final Score = Base - Deductions (min: 0, max: 100)
Pass = Score ≥ 80
```

---

## Integration Points

### GitHub Actions CI/CD
```yaml
- name: Run Evaluation Framework
  run: python evaluation/evaluation_framework.py
  
- name: Upload Report
  uses: actions/upload-artifact@v4
  with:
    name: evaluation-report
    path: evaluation/evaluation_report.json
```

### Docker Deployment
```dockerfile
FROM node:20
WORKDIR /app
COPY backend/ .
RUN npm install
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
CMD ["npm", "start"]
```

### Kubernetes Deployment
```yaml
spec:
  containers:
  - name: audit-backend
    env:
    - name: OTEL_EXPORTER_OTLP_ENDPOINT
      value: http://otel-collector:4318
    - name: OTEL_SERVICE_NAME
      value: audit-backend
```

---

## Monitoring & Alerting

```
Trace Collector
    │
    ├─> Prometheus Exporter
    │   └─> Alert Rules (if latency > 1s, etc.)
    │
    ├─> File Export
    │   └─> Long-term Storage
    │
    └─> Console Output (Dev)
        └─> Debug Logs
```

---

This architecture provides:
- ✅ **Full Observability**: See all operations in real-time
- ✅ **Quality Assurance**: Automated evaluation of key metrics
- ✅ **Performance Monitoring**: Track latencies and errors
- ✅ **Data Integrity**: Verify sync and consistency
- ✅ **User Experience**: Validate smooth navigation flows
- ✅ **Production Ready**: Scalable, maintainable, extensible
