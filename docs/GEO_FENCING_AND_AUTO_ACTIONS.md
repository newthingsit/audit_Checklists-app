# Geo-Fencing & Automated Corrective Actions - Implementation Summary

## ✅ Completed Features

### 1. Geo-Fencing Validation

#### Mobile App (`mobile/src/screens/AuditFormScreen.js`)
- **Distance Calculation**: Uses Haversine formula to calculate distance between captured GPS and store location
- **Auto-Verification**: Automatically verifies location when GPS is captured
- **Distance Thresholds**:
  - **500m**: Warning threshold (shows warning but allows continuation)
  - **1000m**: Block threshold (prevents audit submission)
- **User Experience**:
  - Shows distance in meters
  - Clear error messages when too far
  - Option to "Continue Anyway" if between 500-1000m
  - Blocks submission if >1000m

#### Backend (`backend/routes/audits.js`)
- **Validation on Audit Creation**: Validates GPS distance before creating audit
- **Haversine Formula**: Calculates distance between GPS coordinates and store location
- **Error Response**: Returns detailed error with distance and max allowed distance
- **Blocking**: Prevents audit creation if >1000m from store

#### Location Verification Component (`mobile/src/components/LocationCapture.js`)
- **Visual Indicators**: Shows verification status with icons
- **Distance Display**: Shows distance from expected location
- **Status Colors**: Green for verified, red for too far
- **Auto-Verification**: Can trigger verification automatically

### 2. Automated Corrective Actions

#### Auto-Actions Utility (`backend/utils/autoActions.js`)
- **Automatic Creation**: Creates action items when audit is completed
- **Failed Item Detection**: Identifies failed items based on:
  - Status = 'failed'
  - Selected option with negative mark (No, N/A, Fail, etc.)
  - Critical items (if `onlyCritical` option is enabled)
- **Duplicate Prevention**: Checks if action items already exist for failed items
- **Smart Assignment**:
  - Priority 1: Location manager (if exists)
  - Priority 2: Audit creator
  - Priority 3: Store owner
- **Priority Assignment**:
  - **High**: Critical items (`is_critical = 1`)
  - **Medium**: Regular failed items
- **Due Date**: Default 7 days from creation (configurable)
- **Action Item Details**:
  - Title: "Fix: [Item Title]"
  - Description: Includes item description, comment, selected option, and mark
  - Links to audit and item

#### Integration Points
1. **Single Item Update** (`PUT /api/audits/:id/items/:itemId`)
   - Triggers auto-actions when audit status changes to 'completed'

2. **Batch Update** (`PUT /api/audits/:id/items/batch`)
   - Triggers auto-actions when audit status changes to 'completed'

3. **Complete Audit** (`POST /api/audits/:id/complete`)
   - Triggers auto-actions when audit is manually completed

## 📊 Configuration

### Geo-Fencing Settings
- **Warning Distance**: 500 meters (configurable in `LocationVerification` component)
- **Block Distance**: 1000 meters (configurable in validation logic)
- **Location Required**: Store must have `latitude` and `longitude` in `locations` table

### Auto-Actions Settings
- **Default Due Days**: 7 days (configurable in `autoCreateActionItems` call)
- **Only Critical**: `false` by default (creates actions for all failed items)
- **Assignment Rules**: Location manager → Audit creator → Store owner

## 🔧 Database Requirements

### Locations Table
```sql
ALTER TABLE locations ADD COLUMN latitude DECIMAL(10, 8);
ALTER TABLE locations ADD COLUMN longitude DECIMAL(11, 8);
```

### Action Items Table
Already exists with required columns:
- `audit_id` - Links to audit
- `item_id` - Links to checklist item
- `title` - Action item title
- `description` - Action item description
- `assigned_to` - Assigned user ID
- `due_date` - Due date
- `priority` - Priority (high/medium/low)
- `status` - Status (pending/in_progress/completed)

## 🚀 Usage

### For Store Managers
1. **Add GPS Coordinates**: Edit store in web app and add latitude/longitude
2. **Conduct Audits**: Mobile app will automatically verify location
3. **Review Actions**: Failed items automatically create action items

### For Auditors
1. **Capture Location**: Tap "Capture Your Location" before starting audit
2. **Verify Distance**: App shows distance and verification status
3. **Submit Audit**: If too far (>1000m), submission is blocked

### For Administrators
1. **Monitor Actions**: View auto-created action items in Actions page
2. **Adjust Settings**: Modify `defaultDueDays` and `onlyCritical` in code
3. **Review Assignments**: Check assignment rules in `autoActions.js`

## 📝 Logging

All auto-action creation is logged:
- Success: `[Auto-Actions] Created X action items for completed audit Y`
- Errors: `Error auto-creating action items: [error message]`

## 🔄 Future Enhancements

1. **Configurable Distances**: Make warning/block distances configurable per store
2. **Assignment Rules**: Add category-based, location-based, severity-based rules
3. **Escalation Workflows**: Auto-escalate after X days if not completed
4. **Notification Integration**: Send notifications when actions are auto-created
5. **Web App Integration**: Show geo-fencing status in web audit form

## 🐛 Known Issues

1. **Geo-fencing validation** in audit creation uses callback - may need refactoring for better error handling
2. **Location manager** lookup assumes `manager_id` column exists in `locations` table
3. **Action item notifications** not yet integrated (will be added in future)

## ✅ Testing Checklist

- [x] GPS capture works on mobile
- [x] Distance calculation accurate
- [x] Warning shown at 500m
- [x] Block at 1000m
- [x] Auto-actions created on audit completion
- [x] Assignment rules work correctly
- [x] Duplicate prevention works
- [x] Backend validation works
- [ ] End-to-end testing with real GPS coordinates
- [ ] Action item notifications
- [ ] Escalation workflows
