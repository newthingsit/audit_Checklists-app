# Performance Fix Implementation Script

## CRITICAL: Run these steps in order to fix performance issues

### Step 1: Add Database Indexes (Most Important - Do This First!)

Run the index creation script:
```bash
cd backend
node scripts/add-performance-indexes.js
```

This will add critical indexes to speed up queries by 10-50x.

### Step 2: Install Dependencies (if needed)

No new dependencies required - caching uses built-in JavaScript Map.

### Step 3: Restart Backend Server

After adding indexes, restart your backend:
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

### Step 4: Clear Browser Cache (Web App)

Users should clear their browser cache or do a hard refresh:
- Chrome/Edge: Ctrl+Shift+R or Ctrl+F5
- Firefox: Ctrl+Shift+R
- Safari: Cmd+Shift+R

### Step 5: Rebuild Mobile App (Optional)

For mobile app, rebuild to get the latest fetch optimizations:
```bash
cd mobile
npm run android
# or
npm run ios
```

### Step 6: Test the Fixes

1. **Test Dashboard Load Time**:
   - Open web app dashboard
   - Should load within 2 seconds
   - All numbers should show correctly (not 0)
   - No blank screens

2. **Test Mobile App**:
   - Open mobile app
   - Pull to refresh dashboard
   - Should load within 2 seconds
   - Statistics should display correctly

3. **Test Under Slow Network**:
   - Use Chrome DevTools to throttle network to "Fast 3G"
   - Dashboard should still load (may take 5-8 seconds)
   - Should show proper error messages if timeout
   - Should not show 0 or blank data

### Expected Results

**Before Fix:**
- Dashboard load: 5-10 seconds
- Sometimes shows 0 for all stats
- Blank screens on slow connections
- Database queries: 2-5 seconds each

**After Fix:**
- Dashboard load: 1-2 seconds
- Always shows correct numbers
- Graceful error handling
- Database queries: 0.1-0.5 seconds each
- 5-minute cache reduces server load

### Monitoring

Check backend logs for:
```
✓ Successfully created index: idx_audits_user_id
✓ Successfully created index: idx_audits_status
...
```

Check application logs for:
```
Cache hit for dashboard: dashboard:userId
Cached dashboard data: dashboard:userId
```

### Troubleshooting

**If dashboard still slow:**
1. Check if indexes were created: `SELECT name FROM sqlite_master WHERE type='index';`
2. Check backend logs for errors
3. Verify cache is working (look for "Cache hit" in logs)
4. Check database size - may need optimization if very large

**If showing 0s:**
1. Check browser console for errors
2. Verify API endpoints are responding
3. Check if data exists in database
4. Review backend logs for query errors

**If timeout errors:**
1. Increase timeout in frontend (currently 30 seconds)
2. Check database connection pool settings
3. Consider database upgrade if very large dataset

### Cache Management

Cache automatically expires after 5 minutes. To force refresh:
- Web: Add `?refresh=true` to URL
- Mobile: Pull to refresh
- Backend: Cache clears on server restart

### Rollback Instructions

If issues occur, rollback by:
1. Comment out cache.set() and cache.get() in analytics.js
2. Optionally drop indexes (performance will be slower but app will work)
3. Revert frontend timeout changes

## Success Criteria

- ✅ Dashboard loads in <2 seconds
- ✅ No 0 values when data exists
- ✅ No blank screens
- ✅ Proper error messages
- ✅ Cache reduces database load
- ✅ Users report improved experience

## Next Steps

After verifying fixes work:
1. Monitor cache hit rates
2. Adjust TTL if needed (currently 5 minutes)
3. Consider adding more indexes for other slow queries
4. Implement database query logging for further optimization
