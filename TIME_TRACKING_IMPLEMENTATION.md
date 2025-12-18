# Item Making Performance - Time Tracking Implementation

## ✅ Implementation Complete

### Backend Changes

1. **Database Schema** (`backend/config/database.js`)
   - Added `time_taken_minutes` (REAL) column to `audit_items` table
   - Added `started_at` (DATETIME) column to `audit_items` table
   - Migration handles existing databases

2. **API Updates** (`backend/routes/audits.js`)
   - **PUT `/api/audits/:auditId/items/:itemId`**: Accepts `time_taken_minutes` and `started_at`
   - **PUT `/api/audits/:id/items/batch`**: Accepts time tracking data for batch updates
   - **GET `/api/audits/:id`**: Returns `timeStats` object with:
     - `totalTime`: Sum of all item times (minutes)
     - `averageTime`: Average time per item (minutes, rounded to 2 decimals)
     - `itemsWithTime`: Count of items with time tracking
     - `totalItems`: Total number of items in audit
   - Auto-calculates time from `started_at` to `completed_at` if `time_taken_minutes` not provided

### Mobile Changes (`mobile/src/screens/AuditFormScreen.js`)

1. **Time Tracking State**
   - `itemStartTimes`: Tracks when user starts working on each item
   - `itemElapsedTimes`: Tracks elapsed time for display (updates every 10 seconds)
   - `timeTrackingIntervals`: Stores interval IDs for cleanup

2. **Time Tracking Functions**
   - `startItemTimer(itemId)`: Starts timer when user first interacts with item
   - `stopItemTimer(itemId)`: Stops timer and calculates final time
   - Auto-cleanup of intervals on component unmount

3. **UI Updates**
   - Timer display shows elapsed time (⏱️ X min) below item title
   - Timer starts automatically when user selects option or changes status
   - Timer stops when item is marked as completed

4. **Save Functionality**
   - Includes `time_taken_minutes` and `started_at` when saving items
   - Time data sent to backend API

### Web Changes (`web/src/pages/AuditForm.js`)

1. **Time Tracking State** (same as mobile)
2. **Time Tracking Functions** (same as mobile)
3. **UI Updates**
   - Timer display shows elapsed time as a Chip (⏱️ X min) next to item title
   - Timer starts/stops same as mobile
4. **Save Functionality** (same as mobile)

### Audit Detail Display (`web/src/pages/AuditDetail.js`)

1. **Time Statistics Display**
   - Shows "Item Making Performance" section when time data exists
   - Displays:
     - Average Time per Item
     - Total Time
     - Items Tracked (X / Y)
   - Styled with info color scheme

## 🧪 Testing Checklist

### Backend Testing
- [ ] Test API accepts `time_taken_minutes` and `started_at` in single item update
- [ ] Test API accepts time data in batch update
- [ ] Test time calculation from `started_at` to `completed_at`
- [ ] Test `timeStats` calculation and return
- [ ] Test with items that have no time tracking (should not break)

### Mobile Testing
- [ ] Start audit and interact with items - verify timer starts
- [ ] Verify timer displays elapsed time correctly
- [ ] Complete an item - verify timer stops
- [ ] Save audit - verify time data is sent to backend
- [ ] View completed audit - verify time data is saved
- [ ] Test with multiple items simultaneously

### Web Testing
- [ ] Start audit and interact with items - verify timer starts
- [ ] Verify timer chip displays elapsed time correctly
- [ ] Complete an item - verify timer stops
- [ ] Save audit - verify time data is sent to backend
- [ ] View audit detail - verify time statistics display
- [ ] Test with multiple items simultaneously

### Integration Testing
- [ ] Create audit on mobile, verify time tracking works
- [ ] Create audit on web, verify time tracking works
- [ ] View audit detail - verify time statistics appear
- [ ] Test with partial completion (some items with time, some without)
- [ ] Test with completed audit (should show all time data)

## 📊 Expected Behavior

1. **Timer Start**: When user first interacts with an item (selects option or changes status from pending)
2. **Timer Display**: Shows elapsed time in minutes, updates every 10 seconds
3. **Timer Stop**: When item is marked as completed
4. **Time Calculation**: 
   - If `time_taken_minutes` provided, use it
   - If `started_at` provided but not `time_taken_minutes`, calculate from `started_at` to `completed_at`
5. **Statistics**: Only items with time tracking are included in averages

## 🐛 Known Issues / Limitations

1. Timer updates every 10 seconds (not real-time) to reduce performance impact
2. If user closes app/browser before completing item, timer may not be saved (time will be calculated from `started_at` to `completed_at` on backend)
3. Time tracking is optional - items without time tracking still work normally

## 🚀 Deployment Notes

1. Database migration will run automatically on backend startup
2. Existing audits will have `NULL` for time tracking fields (no breaking changes)
3. Mobile app needs to be rebuilt/redeployed for time tracking UI
4. Web app needs to be rebuilt/redeployed for time tracking UI

## 📝 Future Enhancements

1. Real-time timer updates (every second instead of 10 seconds)
2. Time tracking analytics/reports
3. Average time per category
4. Time tracking for specific item types only
5. Export time data in reports

