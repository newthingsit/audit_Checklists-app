# Quick Start: Tracing & Evaluation

## ✅ What Was Set Up

I've autonomously configured comprehensive tracing and evaluation for your audit app:

### 🔍 **Tracing** (Observability)
- **Backend**: OpenTelemetry with Node.js SDK - auto-tracks Express routes, HTTP calls, errors
- **Mobile**: Custom tracer - tracks API calls, category navigation, item submission, data sync
- **Collector**: Send to `http://localhost:4318` (HTTP) or `http://localhost:4317` (gRPC)

### 📊 **Evaluation** (Quality Metrics)
- **3 Core Metrics**: Audit completion accuracy, Data sync reliability, Category navigation flow
- **8 Test Scenarios**: Cover offline workflows, concurrent users, long sessions, error recovery, location tracking
- **Python Framework**: Evaluates audit quality with 100-point scoring system

---

## 🚀 Getting Started (2 minutes)

### 1️⃣ Install Backend Dependencies
```bash
cd d:\audit_Checklists-app\backend
npm install
```
✅ Done! (OpenTelemetry packages already installed)

### 2️⃣ Run Evaluation Framework (Optional - Preview)
```bash
cd d:\audit_Checklists-app\evaluation
python evaluation_framework.py
```

**Output:**
```
🧪 Starting Audit App Evaluation Framework
============================================================
✓ Loaded evaluation config from evaluation/evaluation_config.json
✓ Loaded 8 test queries from evaluation/test_queries.json

📊 Evaluation Metrics:
  • audit_completion_accuracy: Verify that audits are completed correctly...
  • data_sync_reliability: Ensure real-time sync between mobile and backend...
  • category_navigation_flow: Validate that auto-navigation between categories...

✅ Evaluation Framework Ready!
📄 Sample report saved to evaluation/evaluation_report.json
```

### 3️⃣ Run Backend with Tracing
```bash
cd d:\audit_Checklists-app\backend
npm start  # or: npm run dev
```

**Output:**
```
🔍 OpenTelemetry initialized - tracing to http://localhost:4318
Server running on port 5000...
```

### 4️⃣ Run Mobile App
```bash
cd d:\audit_Checklists-app\mobile
npm start  # or: npx expo start
```

Mobile app will auto-initialize tracing and track all audit interactions.

---

## 📂 Files Created/Modified

### **New Files**
| File | Purpose |
|------|---------|
| `backend/utils/tracing.js` | Backend OpenTelemetry setup |
| `mobile/utils/tracing.js` | Mobile app tracing |
| `evaluation/evaluation_config.json` | Metrics & test scenarios |
| `evaluation/test_queries.json` | 8 comprehensive test cases |
| `evaluation/evaluation_framework.py` | Python evaluation engine |
| `evaluation/README.md` | Evaluation documentation |
| `TRACING_AND_EVALUATION_SETUP.md` | Complete setup guide |

### **Modified Files**
| File | Change |
|------|--------|
| `backend/server.js` | Initialize tracing at startup |
| `backend/package.json` | Add OpenTelemetry dependencies |
| `mobile/App.js` | Initialize mobile tracing |

---

## 🔍 View Traces

### Option 1: VS Code AI Toolkit (Recommended)
```
1. Press Ctrl+Shift+P
2. Type: ai-mlstudio.tracing.open
3. View real-time traces from backend and mobile
```

### Option 2: Run Trace Collector Docker
```bash
docker run -p 4317:4317 -p 4318:4318 \
  otel/opentelemetry-collector-contrib:latest
```

---

## 📊 Run Evaluation

### Simple: Run Framework
```bash
cd evaluation
python evaluation_framework.py
```

### Full: Execute Test Scenarios
1. Start backend with tracing
2. Run audits using `test_queries.json` test cases
3. Collect responses
4. Call evaluation metrics:
   ```python
   from evaluation_framework import AuditEvaluationMetrics
   
   metrics = AuditEvaluationMetrics()
   
   # Evaluate an audit
   result = metrics.evaluate_audit_completion(audit_data)
   print(f"Score: {result['score']}/100")
   
   # Generate report
   report = metrics.generate_report()
   ```

---

## 📋 Test Scenarios Available

| Query | Scenario | Type | Focus |
|-------|----------|------|-------|
| `q1_cvr_complete` | Complete CVR audit | Multi-category | Accuracy |
| `q2_qsr_offline` | Offline + sync | Offline-first | Sync reliability |
| `q3_cdr_dynamic_items` | Dynamic items | Multi-category | Item handling |
| `q4_long_session` | 35+ min session | Stability | Performance |
| `q5_concurrent_users` | 3 simultaneous audits | Concurrency | Data integrity |
| `q6_category_completion` | Auto-navigation | Navigation | Flow |
| `q7_error_handling` | Network error + recovery | Error handling | Resilience |
| `q8_location_tracking` | GPS tracking | Location | Feature support |

---

## 🎯 What Gets Traced

### Backend
✅ Express route handlers  
✅ HTTP requests/responses  
✅ Database operations  
✅ Error exceptions  
✅ Custom spans via `getTracer()`  

### Mobile
✅ All API calls (via patched fetch)  
✅ Category navigation events  
✅ Item submission actions  
✅ Data sync operations  
✅ Errors and crashes  
✅ Offline queuing  

---

## 🔧 Configuration

### Backend Endpoint
File: `backend/.env`
```
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Mobile Endpoint
File: `mobile/utils/tracing.js` (line 8)
```javascript
this.collectorUrl = 'http://localhost:4318'; // Change here
```

---

## 📚 Documentation

- **Full Setup Guide**: `TRACING_AND_EVALUATION_SETUP.md`
- **Evaluation Guide**: `evaluation/README.md`
- **Backend Code**: `backend/utils/tracing.js`
- **Mobile Code**: `mobile/utils/tracing.js`
- **Evaluation Code**: `evaluation/evaluation_framework.py`

---

## ✨ Key Features Enabled

✅ **Observability** - See what's happening in your app  
✅ **Performance Monitoring** - Track request latencies  
✅ **Error Tracking** - Capture and debug failures  
✅ **Data Validation** - Verify audit integrity  
✅ **Offline Support** - Test disconnected workflows  
✅ **Concurrent Testing** - Handle multi-user scenarios  
✅ **Automated Metrics** - Consistent quality scoring  

---

## 🚨 Next Steps

### Immediate
1. ✅ Run `python evaluation_framework.py` to preview metrics
2. ✅ Start backend with tracing
3. ✅ Check traces in VS Code AI Toolkit

### Testing
1. Run audit scenarios from `test_queries.json`
2. Evaluate results using `evaluation_framework.py`
3. Review metrics in generated report

### Production
1. Deploy with tracing enabled
2. Monitor traces in production
3. Use evaluation metrics for continuous quality assurance

---

## 📞 Support

- **Setup Issues**: Check `TRACING_AND_EVALUATION_SETUP.md`
- **Evaluation Help**: See `evaluation/README.md`
- **Code Reference**: Review `.js` and `.py` files inline docs
- **OpenTelemetry Docs**: https://opentelemetry.io/docs/

---

**Status**: ✅ Complete & Ready!  
Your audit app now has enterprise-grade observability and quality metrics.

Happy testing! 🎉
