# Resolution Tracking Test Cases

## Test Scenarios

### Scenario 1: Basic Resolution Detection
**Given:** An audit item with mark = "Fail"  
**When:** Item is updated with mark = "Pass"  
**Then:** `resolved_recurring_failure` should be set to 1

**API Request:**
```http
PUT /audits/123/items/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "itemId": 456,
      "mark": "Pass",
      "status": "completed",
      "comment": "Corrective action completed"
    }
  ]
}
```

**Expected Log Output:**
```
[Batch Update] Recurring failure resolved for item 456: Fail → Pass
```

**Database Verification:**
```sql
SELECT item_id, mark, resolved_recurring_failure 
FROM audit_items 
WHERE audit_id = 123 AND item_id = 456;
-- Expected: item_id=456, mark='Pass', resolved_recurring_failure=1
```

---

### Scenario 2: Numeric Mark Resolution
**Given:** An audit item with mark = "0"  
**When:** Item is updated with mark = "100"  
**Then:** `resolved_recurring_failure` should be set to 1

**API Request:**
```http
PUT /audits/123/items/batch

{
  "items": [
    {
      "itemId": 789,
      "mark": "100",
      "status": "completed"
    }
  ]
}
```

**Expected Result:** resolved_recurring_failure = 1

---

### Scenario 3: No Resolution (NA to Pass)
**Given:** An audit item with mark = "NA"  
**When:** Item is updated with mark = "Pass"  
**Then:** `resolved_recurring_failure` should remain 0 (not a failure)

**Expected Result:** resolved_recurring_failure = 0

---

### Scenario 4: Regression (Pass to Fail)
**Given:** An audit item with mark = "Pass"  
**When:** Item is updated with mark = "Fail"  
**Then:** `resolved_recurring_failure` should remain 0 (not a resolution)

**Expected Result:** resolved_recurring_failure = 0

---

## Analytics Endpoint Tests

### Test 1: Get All Resolved Failures
**Request:**
```http
GET /analytics/resolved-recurring-failures?months=6
Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "resolutions": [
    {
      "item_id": 456,
      "title": "Food Storage Temperature",
      "category": "Food Safety",
      "template_name": "Health & Safety Audit",
      "location_name": "Store #123",
      "resolved_mark": "Pass",
      "resolution_date": "2025-01-29T...",
      "audit_id": 123
    }
  ],
  "summary": {
    "total_resolutions": 1,
    "by_category": { "Food Safety": 1 },
    "by_store": { "Store #123": 1 },
    "by_template": { "Health & Safety Audit": 1 },
    "months": 6
  }
}
```

---

### Test 2: Filter by Location
**Request:**
```http
GET /analytics/resolved-recurring-failures?location_id=10&months=3
```

**Expected:** Only resolutions from location_id=10 in the last 3 months

---

### Test 3: Filter by Template
**Request:**
```http
GET /analytics/resolved-recurring-failures?template_id=5
```

**Expected:** Only resolutions from template_id=5

---

## Performance Tests

### Test 1: CTE Query Performance
**Endpoint:** `GET /audits/previous-failures?template_id=5&location_id=10&months_back=6`

**Metrics to Monitor:**
- Query execution time (should be <250ms)
- Number of database queries (should be 1, not 3)
- Response size consistency

**Azure Log Query:**
```
traces
| where message contains "previous-failures"
| project timestamp, message, duration=customDimensions.duration
| order by timestamp desc
| take 50
```

---

### Test 2: Resolution Detection Performance
**Load Test:** Submit 50 audit items with 10 resolutions
- Batch update should complete in <2 seconds
- All 10 resolutions should be logged
- No database deadlocks or timeouts

---

## Integration Tests

### Test 1: Full Workflow
1. Create audit with 5 failed items
2. Complete corrective actions
3. Update 3 items from Fail → Pass
4. Query analytics endpoint
5. Verify 3 resolutions are tracked

**Expected:**
- ✅ 3 items have resolved_recurring_failure = 1
- ✅ Analytics shows 3 resolutions
- ✅ Summary grouped by category

---

### Test 2: Multi-Store Analysis
1. Store A: 5 resolutions
2. Store B: 3 resolutions
3. Store C: 0 resolutions

**Query:**
```http
GET /analytics/resolved-recurring-failures?months=6
```

**Expected Summary:**
```json
{
  "summary": {
    "total_resolutions": 8,
    "by_store": {
      "Store A": 5,
      "Store B": 3
    }
  }
}
```

---

## Edge Case Tests

### Edge Case 1: Empty String Mark
**Given:** mark = ""  
**When:** Updated to mark = "Yes"  
**Expected:** Not a resolution (empty is not a failure)

---

### Edge Case 2: NULL Mark
**Given:** mark = NULL  
**When:** Updated to mark = "Pass"  
**Expected:** Not a resolution (NULL is not a failure)

---

### Edge Case 3: Multiple Updates
**Given:** mark = "Fail"  
**When:** Updated to "Pass", then updated again to "Pass"  
**Expected:** 
- First update: resolved_recurring_failure = 1
- Second update: resolved_recurring_failure remains 1 (not reset)

---

### Edge Case 4: Mixed Case Marks
**Given:** mark = "fail" (lowercase)  
**When:** Updated to "PASS" (uppercase)  
**Expected:** Detected as resolution (case-insensitive)

---

## Security Tests

### Test 1: Permission Check
**Request:** GET /analytics/resolved-recurring-failures (without permission)  
**Expected:** 403 Forbidden

### Test 2: SQL Injection
**Request:** 
```
GET /analytics/resolved-recurring-failures?location_id=1'; DROP TABLE audit_items;--
```
**Expected:** 400 Bad Request (parseInt protection)

---

## Database Migration Tests

### Test 1: Column Exists Check
**Scenario:** Backend restart with existing column  
**Expected:** No error, column not duplicated

### Test 2: Column Creation
**Scenario:** Fresh database without column  
**Expected:** Column added automatically on startup

**Verification:**
```sql
-- SQLite
PRAGMA table_info(audit_items);
-- Should show: resolved_recurring_failure | BOOLEAN | 0 | 0

-- SQL Server
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'audit_items' AND COLUMN_NAME = 'resolved_recurring_failure';
-- Should show: resolved_recurring_failure | bit | 0
```

---

## Monitoring Checklist

### Production Deployment
- [ ] Backend deployment successful (GitHub Actions)
- [ ] Database column added without errors
- [ ] No breaking changes in existing audits
- [ ] Resolution detection logs appearing
- [ ] Analytics endpoint returning 200 OK
- [ ] Query performance <250ms on average
- [ ] No permission errors in logs

### Post-Deployment
- [ ] Test resolution detection with real audit
- [ ] Verify analytics data accuracy
- [ ] Monitor database size (new column impact)
- [ ] Check mobile app compatibility
- [ ] Review error logs for 24 hours

---

## Known Limitations

1. **Historical Data:** Existing audit_items will have `resolved_recurring_failure = 0`. Only new resolutions after deployment are tracked.

2. **False Positives:** If an item is marked as "Fail" by mistake and immediately corrected to "Pass", it will be counted as a resolution.

3. **Single Audit Context:** Resolution is tracked per audit. If the same item fails and passes multiple times across different audits, each is tracked separately.

4. **No Undo:** Once `resolved_recurring_failure = 1`, it cannot be automatically reverted if the item fails again in a later audit.

---

## Success Criteria

✅ **Performance:** Query execution time reduced by 50%+  
✅ **Accuracy:** 100% of Fail→Pass transitions detected  
✅ **Stability:** No errors in production logs for 48 hours  
✅ **Usability:** Analytics endpoint returns data within 500ms  
✅ **Compatibility:** Works with SQLite and SQL Server  

---

**Test Plan Status:** Ready for execution  
**Priority:** HIGH  
**Estimated Testing Time:** 2-3 hours
