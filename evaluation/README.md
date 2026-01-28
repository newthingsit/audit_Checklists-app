# Audit App Evaluation Framework

Comprehensive evaluation framework for testing audit completion accuracy, data sync reliability, and category navigation flow.

## Overview

This evaluation framework measures three critical metrics:

1. **Audit Completion Accuracy** - Verifies all required fields are filled and validated correctly
2. **Data Sync Reliability** - Ensures real-time sync captures all responses without loss
3. **Category Navigation Flow** - Validates auto-navigation and audit flow smoothness

## Files

- `evaluation_config.json` - Configuration of metrics and test scenarios
- `test_queries.json` - 8 comprehensive test queries covering various audit scenarios
- `evaluation_framework.py` - Core evaluation logic and metrics calculation
- `evaluation_report.json` - Generated evaluation results

## Test Scenarios

### 1. Complete CVR Audit (`q1_cvr_complete`)
- **Type**: Multi-category audit completion
- **Items**: 4 items across 4 categories
- **Expected**: All items synced, categories navigated sequentially

### 2. Offline Submission (`q2_qsr_offline`)
- **Type**: Offline-first audit workflow
- **Items**: 2 items submitted while offline
- **Expected**: Queued locally, synced on reconnect, zero data loss

### 3. Multi-Category Item Entry (`q3_cdr_dynamic_items`)
- **Type**: Dynamic item entry across categories
- **Items**: Static + dynamic items
- **Expected**: Correct categorization, navigation context preserved

### 4. Long Audit Session (`q4_long_session`)
- **Type**: Extended duration audit (35+ minutes)
- **Items**: 20 items across 8 category transitions
- **Expected**: No crashes, successful completion, no sync failures

### 5. Concurrent Multi-User (`q5_concurrent_users`)
- **Type**: Multiple simultaneous audits
- **Users**: 3 concurrent users submitting different audit types
- **Expected**: All recorded, no conflicts, data consistency

### 6. Category Completion (`q6_category_completion`)
- **Type**: Category-driven navigation
- **Items**: 9 items across 3 categories
- **Expected**: Auto-navigation on completion, progress updates

### 7. Error Handling (`q7_error_handling`)
- **Type**: Error recovery during submission
- **Items**: 5 items with network timeout on item 5
- **Expected**: Automatic retry, successful completion

### 8. Location Tracking (`q8_location_tracking`)
- **Type**: Location data capture during audit
- **Items**: 1 item with GPS coordinates
- **Expected**: Location recorded, high accuracy

## Running Evaluations

### Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# (Optional) Set up tracing collector
# Run in separate terminal:
# docker run -p 4317:4317 -p 4318:4318 otel/opentelemetry-collector-contrib
```

### Execute Evaluation

```bash
# Run evaluation framework
python evaluation/evaluation_framework.py

# This will:
# 1. Load configuration and test queries
# 2. Display all evaluation metrics and scenarios
# 3. Generate sample evaluation report
# 4. Show example audit completion evaluation
```

### Output

```
🧪 Starting Audit App Evaluation Framework
============================================================
✓ Loaded evaluation config from evaluation/evaluation_config.json
✓ Loaded 8 test queries from evaluation/test_queries.json

📊 Evaluation Metrics:
  • audit_completion_accuracy: Verify that audits are completed correctly...
  • data_sync_reliability: Ensure real-time sync between mobile and backend...
  • category_navigation_flow: Validate that auto-navigation between categories...

📝 Test Scenarios:
  • q1_cvr_complete: Complete CVR Audit with Multiple Items
  • q2_qsr_offline: Offline Submission with Sync
  • q3_cdr_dynamic_items: Multi-Category Item Entry

  ... and 5 more test scenarios

✅ Evaluation Framework Ready!
📄 Sample report saved to evaluation/evaluation_report.json

📋 Sample Audit Evaluation Result:
   Score: 100/100
   Passed: True
```

## Metrics Details

### Audit Completion Accuracy (100 point scale)
- Items present: 0 points (if missing)
- Items with valid IDs: -10 per missing
- Items with categories: -10 per missing
- Items with responses: -15 per missing
- Valid response values: -15 per invalid
- Required metadata (audit_id, user_id, restaurant_id): -10 per missing

**Pass Threshold**: 80/100

### Data Sync Reliability (100 point scale)
- Submission received: -100 if missing
- Item count match: -30 if mismatch
- Timestamp accuracy: -20 if >5s difference
- Data integrity: -15 per corrupted item

**Pass Threshold**: 80/100

### Category Navigation Flow (100 point scale)
- Navigation events recorded: -100 if none
- Valid categories: -10 per invalid
- State preservation: -25 per state loss
- Progress updates: -20 if missing

**Pass Threshold**: 80/100

## Integration with CI/CD

Add to GitHub Actions workflow:

```yaml
- name: Run Audit Evaluation
  run: |
    cd evaluation
    python evaluation_framework.py
    
- name: Upload Evaluation Report
  uses: actions/upload-artifact@v4
  with:
    name: evaluation-report
    path: evaluation/evaluation_report.json
```

## Tracing Integration

The evaluation framework works with OpenTelemetry tracing:

- **Backend**: Spans track audit submission, validation, and sync
- **Mobile**: Spans track category navigation, item submission, offline sync
- **Collector**: Receives traces at `http://localhost:4318` (HTTP) or `http://localhost:4317` (gRPC)

View traces in VS Code AI Toolkit after running evaluation.

## Next Steps

1. **Execute Test Scenarios**: Run audits using test_queries.json data
2. **Capture Results**: Collect API responses and navigation events
3. **Run Metrics**: Calculate scores for each test scenario
4. **Generate Report**: Review results in evaluation_report.json
5. **Iterate**: Adjust app based on failed metrics

## Support

For issues or improvements:
- Check trace logs in VS Code AI Toolkit
- Review evaluation_report.json for detailed results
- Add new test scenarios to test_queries.json
