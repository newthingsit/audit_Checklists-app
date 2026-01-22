# Speed of Service Features Implementation

## 📋 Requirements from Screenshots

Based on the provided screenshots, the Speed of Service feature needs:

### 1. **Time/Sec Pairs**
- Each service event has TWO fields:
  - `(Time)` - Date/Time input (datetime-local)
  - `(Sec)` - Number input (seconds)
- These should be displayed as pairs

### 2. **Sections Organization**
- Items organized into sections:
  - `Trnx-1` (Transaction 1)
  - `Trnx-2` (Transaction 2)
  - `Trnx-3` (Transaction 3)
  - `Trnx-4` (Transaction 4)
  - `Avg` (Average)

### 3. **Section Features**
- Collapsible sections (expand/collapse)
- "Add New Item" button per section
- "Collapse Section" button
- Edit section name

### 4. **Item Features**
- Drag handle (hamburger icon) for reordering
- Options menu (three dots) for edit/delete
- Input type indicators (Date icon for Time, Number icon for Sec)

### 5. **Item Types**
- `Table no.` - Number input
- `[Event] (Time)` - Date/Time input
- `[Event] (Sec)` - Number input

## ✅ Current Implementation Status

### Backend ✅
- Endpoint exists: `POST /api/templates/admin/update-speed-of-service`
- Creates items with sections (Trnx-1, Trnx-2, Trnx-3, Trnx-4, Avg)
- Supports `input_type: 'date'` and `input_type: 'number'`
- Section field properly stored in database

### Frontend - Partially Implemented
- ✅ Section grouping exists
- ✅ Collapsible sections
- ✅ Date and Number input types supported
- ❌ Time/Sec pairs not visually grouped
- ❌ No drag-and-drop reordering
- ❌ No "Add New Item" per section
- ❌ No section edit controls

## 🎯 Implementation Plan

### Phase 1: Enhance Section Display
1. Group Time/Sec pairs visually
2. Add section header with controls
3. Improve section collapse/expand UI

### Phase 2: Add Dynamic Item Management
1. Add "Add New Item" button per section
2. Implement drag-and-drop reordering
3. Add item edit/delete options

### Phase 3: UI Polish
1. Match screenshot styling
2. Add input type icons
3. Improve spacing and layout

## 📝 Next Steps

1. Update `web/src/pages/AuditForm.js` to group Time/Sec pairs
2. Add section management controls
3. Implement drag-and-drop (using react-beautiful-dnd or similar)
4. Add "Add New Item" functionality
5. Update mobile app similarly

---

**Status:** Ready for implementation
