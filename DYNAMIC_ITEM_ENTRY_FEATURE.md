# Dynamic Item Entry Feature for Preparation Time Audits

## Overview
This feature allows auditors to **dynamically add items during an audit** instead of being limited to pre-defined checklist items. This is perfect for "Preparation Time Audits" where auditors need to:
1. Enter item/product names manually
2. Record preparation times for 4-5 attempts
3. Get automatic score calculation based on average time

## Files Created

### 1. Backend API Route
**File**: `backend/routes/dynamic-audit-items.js`

**Endpoints**:
- `POST /api/audits/:auditId/dynamic-items` - Add a dynamic item to an audit
- `GET /api/audits/:auditId/dynamic-items` - Get all dynamic items for an audit
- `DELETE /api/audits/:auditId/dynamic-items/:itemId` - Remove a dynamic item

**Features**:
- Validates audit ownership and status
- Accepts time_entries array (e.g., [1.5, 2.0, 1.8, 2.2, 1.9])
- Calculates average time automatically
- Calculates time-based score based on constraints
- Marks dynamic items with `order_index = -1`
- Updates audit total_items count

### 2. Mobile Component
**File**: `mobile/src/components/DynamicItemEntry.js`

**Features**:
- Item name input field
- 5 time entry slots (minimum 4 required for scoring)
- **Timer mode**: Start/stop timer for each attempt
- **Manual entry mode**: Enter time as MM:SS or decimal minutes
- Real-time average calculation
- Automatic score calculation
- Visual feedback for progress (X/5 recorded)
- Beautiful UI with instructions

**Scoring Logic**:
```javascript
- Under 2 minutes: 100 points
- 2-3 minutes: 90 points  
- 3-4 minutes: 80 points
- 4-5 minutes: 70 points
- Over 5 minutes: decreases proportionally
```

## Integration Steps

### Step 1: Update AuditFormScreen.js (Mobile)

Add state for dynamic item mode:
```javascript
const [showDynamicEntry, setShowDynamicEntry] = useState(false);
const [dynamicItems, setDynamicItems] = useState([]);
```

Add button to switch to dynamic entry mode (in category selection or checklist view):
```javascript
<TouchableOpacity 
  style={styles.dynamicEntryButton}
  onPress={() => setShowDynamicEntry(true)}
>
  <Icon name="add-circle" size={24} color="#fff" />
  <Text style={styles.dynamicEntryButtonText}>Add Item Manually</Text>
</TouchableOpacity>
```

Add the DynamicItemEntry component:
```javascript
import DynamicItemEntry from '../components/DynamicItemEntry';

// In render:
{showDynamicEntry && (
  <DynamicItemEntry
    category={selectedCategory}
    onAddItem={handleAddDynamicItem}
  />
)}
```

Add handler for adding dynamic items:
```javascript
const handleAddDynamicItem = async (item) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/audits/${currentAuditId}/dynamic-items`,
      {
        title: item.title,
        category: item.category,
        is_time_based: true,
        time_entries: item.time_entries,
        target_time_minutes: 2, // Optional
        min_time_minutes: 1.5,  // Optional
        max_time_minutes: 3    // Optional
      }
    );
    
    setDynamicItems([...dynamicItems, response.data.item]);
    setShowDynamicEntry(false);
    Alert.alert('Success', 'Item added successfully!');
  } catch (error) {
    Alert.alert('Error', 'Failed to add item');
  }
};
```

### Step 2: Display Dynamic Items in Audit

```javascript
// Show dynamic items alongside template items
const allItems = [...items, ...dynamicItems];

// Filter and display
{allItems.map((item, index) => (
  <View key={item.id} style={styles.itemCard}>
    <Text style={styles.itemTitle}>{item.title}</Text>
    {item.average_time_minutes && (
      <Text style={styles.timeInfo}>
        Average: {item.average_time_minutes} min
      </Text>
    )}
    {item.score && (
      <Text style={styles.scoreInfo}>
        Score: {item.score}/100
      </Text>
    )}
  </View>
))}
```

## Usage Scenario

### Example: Classic Virgin Mojito Preparation Time Audit

1. Auditor starts audit
2. Instead of selecting from pre-defined items, clicks "Add Item Manually"
3. Enters "Classic Virgin Mojito"
4. Records 5 preparation times:
   - Attempt 1: Starts timer, makes drink, stops timer → 2:15
   - Attempt 2: Enters manually → 1:55
   - Attempt 3: Starts timer → 2:05
   - Attempt 4: Enters manually → 2:10
   - Attempt 5: Starts timer → 2:00
5. System calculates:
   - Average time: 2.08 minutes
   - Score: 90/100 (within 2-3 minute range)
6. Item is added to audit with automatic scoring
7. Auditor can add more items or continue with other checklist items

## Database Schema

The existing `audit_items` table already supports:
- `time_entries` (TEXT/JSON) - Array of time values
- `average_time_minutes` (REAL) - Calculated average
- `time_based_score` (INTEGER) - Score based on time

Dynamic items are marked in `checklist_items` with:
- `order_index = -1` (indicates dynamic item)
- `is_time_based = 1`

## Benefits

1. **Flexibility**: Auditors can audit any product, not just pre-defined ones
2. **Accuracy**: Multiple time entries provide reliable averages
3. **Ease of Use**: Both timer and manual entry options
4. **Automatic Scoring**: No manual calculation needed
5. **Real-time Feedback**: See average and score immediately
6. **Visual Progress**: Clear indication of how many times recorded

## Future Enhancements

1. Customizable scoring thresholds per audit
2. Export dynamic items to create new templates
3. Historical data for dynamic items
4. Photo/video recording for dynamic items
5. Comparison charts for multiple attempts
6. Target time suggestions based on historical data

## Testing Checklist

- [ ] Add dynamic item with timer
- [ ] Add dynamic item with manual entry
- [ ] Add item with less than 4 entries (should warn)
- [ ] Verify score calculation
- [ ] Verify average calculation
- [ ] Test in different audit categories
- [ ] Test with multiple dynamic items
- [ ] Verify items save to database
- [ ] Verify items appear in audit detail view
- [ ] Test delete dynamic item

