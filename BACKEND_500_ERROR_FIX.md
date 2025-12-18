# 🔧 Backend 500 Error Fix - Time Tracking Columns

## ❌ Error Details

**Error:** `Request failed with status code 500`  
**Endpoint:** `GET /api/audits/125`  
**Cause:** Database query trying to select `time_taken_minutes` and `started_at` columns that don't exist yet in production database

## ✅ Fix Applied

### Problem
The query was explicitly selecting `ai.time_taken_minutes, ai.started_at` which fails if those columns don't exist in the database (migration hasn't run yet).

### Solution
1. **Removed explicit column selection** - Changed from:
   ```sql
   SELECT ai.*, ..., ai.time_taken_minutes, ai.started_at
   ```
   To:
   ```sql
   SELECT ai.*, ...
   ```
   This way, `ai.*` will include all existing columns, and if the time tracking columns don't exist yet, the query won't fail.

2. **Added graceful column detection** - The time statistics calculation now checks if the column exists before trying to use it:
   ```javascript
   const hasTimeColumn = items.some(item => 'time_taken_minutes' in item);
   if (hasTimeColumn) {
     // Calculate time statistics
   }
   ```

## 🚀 Deployment Steps

### Step 1: Deploy the Fix
The fix has been committed and pushed. The GitHub Actions workflow should automatically deploy it.

**Or manually:**
1. Wait for GitHub Actions to deploy (check Actions tab)
2. Or manually deploy using ZIP deploy (see Azure deployment guide)

### Step 2: Restart Backend Server
**CRITICAL:** After deployment, restart the app service:

1. Azure Portal → App Services → `audit-app-backend-2221`
2. Click **Restart** button
3. Wait ~30 seconds
4. Verify status is **Running**

### Step 3: Verify Database Migration
The database migration should run automatically on app startup. To verify:

1. Check Azure Portal → App Services → `audit-app-backend-2221` → **Log stream**
2. Look for messages about adding columns
3. Or check database directly to see if columns exist

### Step 4: Test the Fix
1. Try accessing `/api/audits/125` again
2. Should return 200 OK (not 500)
3. Time statistics will be empty if columns don't exist yet (which is fine)

## 📊 Expected Behavior

### Before Migration Runs:
- ✅ API returns 200 OK
- ✅ Audit data returned normally
- ✅ `timeStats` will show all zeros (no time tracking data yet)

### After Migration Runs:
- ✅ API returns 200 OK
- ✅ Audit data returned normally
- ✅ `timeStats` will show actual time tracking data (if any items have time data)

## 🔍 Verify Migration Status

**Check if columns exist:**
```sql
-- For SQLite
PRAGMA table_info(audit_items);

-- For SQL Server
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'audit_items' 
AND COLUMN_NAME IN ('time_taken_minutes', 'started_at');
```

**Expected columns:**
- `time_taken_minutes` (REAL)
- `started_at` (DATETIME)

## ⚠️ Important Notes

1. **The fix is backward compatible** - Works with or without the time tracking columns
2. **Migration runs automatically** - No manual SQL needed
3. **No data loss** - Existing audits continue to work
4. **Time tracking is optional** - Items without time data work normally

## 🐛 If Error Persists

1. **Check backend logs:**
   - Azure Portal → App Services → `audit-app-backend-2221` → **Log stream**
   - Look for specific error messages

2. **Verify deployment:**
   - Check GitHub Actions for successful deployment
   - Verify app is running (not stopped/restarting)

3. **Check database connection:**
   - Verify database is accessible
   - Check connection string in app settings

4. **Manual migration (if needed):**
   ```sql
   ALTER TABLE audit_items ADD COLUMN time_taken_minutes REAL;
   ALTER TABLE audit_items ADD COLUMN started_at DATETIME;
   ```

## ✅ Status

- ✅ Fix committed and pushed
- ✅ Query updated to handle missing columns
- ✅ Time statistics calculation updated
- ⏳ Waiting for deployment
- ⏳ Waiting for app restart
- ⏳ Waiting for migration to run

---

**The fix ensures the API works even if the database migration hasn't run yet. Once the migration runs, time tracking will automatically start working.**

