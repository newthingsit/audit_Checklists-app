# Quick Integration Guide: Dynamic Item Entry

## What's Been Created

✅ **Backend API** (`backend/routes/dynamic-audit-items.js`)
✅ **Mobile Component** (`mobile/src/components/DynamicItemEntry.js`)
✅ **Server Route Registration** (Updated `backend/server.js`)

## How to Use (For Auditors)

### Current Implementation Status

The feature is **90% complete**. What's working:
- ✅ Backend API fully functional
- ✅ Mobile component ready to use
- ✅ Time tracking with timer
- ✅ Manual time entry
- ✅ Automatic score calculation
- ✅ Database support

What needs integration (10%):
- ⏳ Add "Add Item Manually" button to AuditFormScreen
- ⏳ Display dynamic items in audit view

## Step-by-Step Integration

### Step 1: Update AuditFormScreen.js

Add at the top of the file (with other imports):
```javascript
import DynamicItemEntry from '../components/DynamicItemEntry';
```

Add state variables (around line 47, with other useState declarations):
```javascript
const [showDynamicEntry, setShowDynamicEntry] = useState(false);
const [dynamicItems, setDynamicItems] = useState([]);
```

Add handler function (around line 700, before handleSubmit):
```javascript
const handleAddDynamicItem = async (item) => {
  try {
    setSaving(true);
    const response = await axios.post(
      `${API_BASE_URL}/audits/${currentAuditId}/dynamic-items`,
      {
        title: item.title,
        category: item.category || selectedCategory || 'Preparation Time',
        is_time_based: true,
        time_entries: item.time_entries,
        min_time_minutes: 1.5,
        max_time_minutes: 3,
        target_time_minutes: 2
      }
    );
    
    // Add to local state
    setDynamicItems(prev => [...prev, response.data.item]);
    setShowDynamicEntry(false);
    
    Alert.alert(
      'Success',
      `"${item.title}" added with score: ${item.score}/100\nAverage time: ${item.average_time_minutes} min`,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('Error adding dynamic item:', error);
    Alert.alert('Error', 'Failed to add item');
  } finally {
    setSaving(false);
  }
};
```

Add button in checklist view (around line 1650, after the filteredItems.map section):
```javascript
{/* Add Item Manually Button */}
{!showDynamicEntry && currentStep === 2 && (
  <TouchableOpacity
    style={styles.dynamicEntryButton}
    onPress={() => setShowDynamicEntry(true)}
  >
    <Icon name="add-circle" size={24} color="#fff" />
    <Text style={styles.dynamicEntryButtonText}>
      Add Item Manually (Preparation Time)
    </Text>
  </Icon>
</TouchableOpacity>
)}
```

Add the component (around line 1665):
```javascript
{/* Dynamic Item Entry Modal/View */}
{showDynamicEntry && (
  <View style={styles.dynamicEntryContainer}>
    <View style={styles.dynamicEntryHeader}>
      <TouchableOpacity
        onPress={() => setShowDynamicEntry(false)}
        style={styles.backButton}
      >
        <Icon name="arrow-back" size={24} color="#333" />
        <Text style={styles.backButtonText}>Back to Checklist</Text>
      </TouchableOpacity>
    </View>
    <DynamicItemEntry
      category={selectedCategory || 'Preparation Time'}
      onAddItem={handleAddDynamicItem}
    />
  </View>
)}
```

Display dynamic items in the list (around line 1400, modify the items rendering):
```javascript
{/* Show dynamic items at the top */}
{dynamicItems.map((item) => (
  <View key={`dynamic-${item.id}`} style={[styles.itemCard, styles.dynamicItemCard]}>
    <View style={styles.dynamicBadge}>
      <Text style={styles.dynamicBadgeText}>MANUAL ENTRY</Text>
    </View>
    <Text style={styles.itemNumber}>⏱️</Text>
    <View style={styles.itemContent}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <View style={styles.dynamicItemInfo}>
        <View style={styles.timeInfo}>
          <Icon name="timer" size={16} color="#1976d2" />
          <Text style={styles.timeText}>
            Avg: {item.average_time_minutes} min
          </Text>
        </View>
        <View style={styles.scoreInfo}>
          <Icon name="check-circle" size={16} color="#4caf50" />
          <Text style={styles.scoreText}>
            Score: {item.score}/100
          </Text>
        </View>
      </View>
    </View>
  </View>
))}
```

Add styles (at the bottom of StyleSheet.create):
```javascript
dynamicEntryButton: {
  backgroundColor: '#4caf50',
  borderRadius: 10,
  padding: 15,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  marginVertical: 15,
  marginHorizontal: 15,
},
dynamicEntryButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
  marginLeft: 10,
},
dynamicEntryContainer: {
  flex: 1,
  backgroundColor: '#fff',
},
dynamicEntryHeader: {
  backgroundColor: '#fff',
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
backButton: {
  flexDirection: 'row',
  alignItems: 'center',
},
backButtonText: {
  fontSize: 16,
  color: '#333',
  marginLeft: 10,
},
dynamicItemCard: {
  borderLeftWidth: 4,
  borderLeftColor: '#4caf50',
  backgroundColor: '#f1f8f4',
},
dynamicBadge: {
  position: 'absolute',
  top: 10,
  right: 10,
  backgroundColor: '#4caf50',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
},
dynamicBadgeText: {
  color: '#fff',
  fontSize: 10,
  fontWeight: 'bold',
},
dynamicItemInfo: {
  flexDirection: 'row',
  marginTop: 10,
  gap: 15,
},
timeInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#e3f2fd',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 5,
},
timeText: {
  marginLeft: 5,
  fontSize: 13,
  color: '#1976d2',
  fontWeight: '600',
},
scoreInfo: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f1f8f4',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 5,
},
scoreText: {
  marginLeft: 5,
  fontSize: 13,
  color: '#4caf50',
  fontWeight: '600',
},
```

## Testing the Feature

### Test Case 1: Add Item with Timer
1. Open an audit
2. Click "Add Item Manually"
3. Enter "Classic Virgin Mojito"
4. Click timer #1, wait 2 minutes, stop
5. Repeat for 3 more attempts
6. Verify average and score display
7. Click "Add Item to Audit"
8. Verify item appears in the list

### Test Case 2: Add Item with Manual Entry
1. Open an audit
2. Click "Add Item Manually"
3. Enter "Lemonade"
4. Manually enter times: 1:45, 2:00, 1:50, 2:10
5. Verify average and score
6. Click "Add Item to Audit"

### Test Case 3: Mixed Entry
1. Use timer for first 2 attempts
2. Use manual entry for last 3 attempts
3. Verify all values are captured

## API Usage

### Add Dynamic Item
```javascript
POST /api/audits/:auditId/dynamic-items

Body:
{
  "title": "Classic Virgin Mojito",
  "category": "PROCESS",
  "is_time_based": true,
  "time_entries": [1.5, 2.0, 1.8, 2.2],
  "min_time_minutes": 1.5,
  "max_time_minutes": 3,
  "target_time_minutes": 2
}

Response:
{
  "message": "Dynamic item added successfully",
  "item": {
    "id": 123,
    "audit_item_id": 456,
    "title": "Classic Virgin Mojito",
    "category": "PROCESS",
    "average_time_minutes": 1.88,
    "time_based_score": 90,
    "mark": "90",
    "status": "completed"
  }
}
```

### Get Dynamic Items
```javascript
GET /api/audits/:auditId/dynamic-items

Response:
{
  "items": [...]
}
```

### Delete Dynamic Item
```javascript
DELETE /api/audits/:auditId/dynamic-items/:itemId

Response:
{
  "message": "Dynamic item deleted successfully"
}
```

## Deployment

The backend changes have been deployed. To deploy the mobile app:

1. **Test locally first:**
   ```bash
   cd mobile
   npm start
   # Test on your device/simulator
   ```

2. **Build and deploy:**
   ```bash
   # For Expo
   expo build:android
   expo build:ios
   
   # For EAS
   eas build --platform all
   ```

## Support

If you need help with integration:
1. Check the component source: `mobile/src/components/DynamicItemEntry.js`
2. Review the backend API: `backend/routes/dynamic-audit-items.js`
3. See full documentation: `DYNAMIC_ITEM_ENTRY_FEATURE.md`

## Next Steps

After integration, you can enhance:
1. Add photo capture for dynamic items
2. Create templates from frequently used dynamic items
3. Add historical data comparison
4. Custom scoring thresholds per audit type
5. Bulk import of items from CSV

