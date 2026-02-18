# Mobile App - Complete Flow Documentation

**Date:** February 18, 2026  
**Version:** 1.0  
**App Framework:** React Native (Expo 54.0.32)

---

## Table of Contents

1. [App Architecture Overview](#app-architecture-overview)
2. [Navigation Structure](#navigation-structure)
3. [Authentication Flows](#authentication-flows)
4. [Dashboard Flow](#dashboard-flow)
5. [Audit Creation Flows](#audit-creation-flows)
6. [Audit Management Flows](#audit-management-flows)
7. [Scheduled Audits Flow](#scheduled-audits-flow)
8. [Audit History Flow](#audit-history-flow)
9. [Profile & Settings Flow](#profile-settings-flow)
10. [Offline & Network Handling](#offline-network-handling)
11. [Permission System](#permission-system)
12. [Context Providers](#context-providers)
13. [Error Handling](#error-handling)
14. [Flow Diagrams](#flow-diagrams)

---

## App Architecture Overview

### Core Stack
- **Framework:** React Native with Expo 54.0.32
- **Navigation:** React Navigation 6.x (Stack + Bottom Tabs)
- **State Management:** React Context API + Hooks
- **HTTP Client:** Axios
- **Storage:** AsyncStorage
- **UI Components:** React Native Paper + Custom Components

### File Structure
```
mobile/
├── App.js                          # Entry point with providers
├── src/
│   ├── screens/                    # All screen components
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── ChecklistsScreen.js
│   │   ├── CategorySelectionScreen.js
│   │   ├── AuditFormScreen.js
│   │   ├── AuditDetailScreen.js
│   │   ├── AuditHistoryScreen.js
│   │   ├── ScheduledAuditsScreen.js
│   │   ├── ProfileScreen.js
│   │   └── ...
│   ├── navigation/                 # Navigation setup
│   │   ├── AppStack.js            # Authenticated navigation
│   │   └── AuthStack.js           # Authentication navigation
│   ├── context/                    # React Context providers
│   │   ├── AuthContext.js
│   │   ├── NetworkContext.js
│   │   ├── OfflineContext.js
│   │   ├── NotificationContext.js
│   │   ├── LocationContext.js
│   │   └── BiometricContext.js
│   ├── components/                 # Reusable components
│   ├── services/                   # API services
│   ├── utils/                      # Utility functions
│   └── config/                     # Configuration files
```

---

## Navigation Structure

### Primary Navigation Flow

```
App.js
  └── AppWithProviders (Multiple Context Providers)
      └── AppNavigator
          ├── AuthStack (Not authenticated)
          │   ├── Login
          │   ├── Register
          │   └── ForgotPassword
          │
          └── AppStack (Authenticated - Bottom Tab Navigator)
              ├── Dashboard Tab → DashboardStack
              │   ├── DashboardMain
              │   ├── ScheduledAudits
              │   ├── Tasks
              │   └── AuditForm
              │
              ├── Checklists Tab → ChecklistsStack
              │   ├── ChecklistsList
              │   └── AuditForm
              │
              ├── History Tab → HistoryStack
              │   ├── HistoryList
              │   ├── AuditDetail
              │   └── AuditForm
              │
              ├── Tasks Tab → TasksScreen (Direct)
              │
              └── Profile Tab → ProfileStack
                  ├── ProfileMain
                  └── NotificationSettings
```

### Tab Configuration
- **Dashboard:** Home screen with stats and quick actions
- **Checklists:** Template selection and audit creation
- **History:** View completed and in-progress audits
- **Tasks:** Task management (conditional - permission based)
- **Profile:** User settings and preferences

### Screen Options
All stacks use consistent header styling:
- White background with minimal border
- Back button without title
- Consistent typography (600 weight, 17px)
- Card-style background for content areas

---

## Authentication Flows

### 1. Login Flow

**Entry Point:** `LoginScreen.js`

**User Journey:**
1. User opens app → Redirected to Login if not authenticated
2. Enter email/password
3. Optional: Enable biometric authentication (Face ID/Touch ID)
4. Tap "Login"
5. AuthContext validates credentials via API
6. On success: Navigate to Dashboard
7. On failure: Show error message

**API Endpoint:** `POST /auth/login`

**Route Parameters:** None

**Navigation:**
```javascript
// From Login to Dashboard (automatic)
navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });

// To Register
navigation.navigate('Register');

// To Forgot Password
navigation.navigate('ForgotPassword');
```

**Error Handling:**
- Invalid credentials → Show alert
- Network error → Show connection error
- Server error → Show generic error message

---

### 2. Registration Flow

**Entry Point:** `RegisterScreen.js`

**User Journey:**
1. From LoginScreen → Tap "Create Account"
2. Fill in: Name, Email, Password, Confirm Password
3. Tap "Register"
4. API creates user account
5. Auto-login and navigate to Dashboard

**API Endpoint:** `POST /auth/register`

**Validation:**
- Email format validation
- Password strength requirements
- Password confirmation match

---

### 3. Forgot Password Flow

**Entry Point:** `ForgotPasswordScreen.js`

**User Journey:**
1. From LoginScreen → Tap "Forgot Password?"
2. Enter email address
3. Tap "Send Reset Link"
4. API sends password reset email
5. Show success message
6. Navigate back to Login

**API Endpoint:** `POST /auth/forgot-password`

---

## Dashboard Flow

**Entry Point:** `DashboardScreen.js`

### Dashboard Features

**Main Stats Cards:**
- Templates Count
- Total Audits
- Completed Audits
- Pending Actions

**Quick Action Buttons:**
- New Audit → Navigate to Checklists
- View History → Navigate to History tab
- Scheduled Audits → Navigate to ScheduledAuditsScreen

**Recent Audits List:**
- Last 5 audits (sorted by updated_at)
- Tap to view → Navigate to AuditDetail
- Shows: Template name, score, status, date

**Analytics Section** (if user has permission):
- Average score
- Completion rate
- Schedule adherence
- Trend indicators

### Data Flow

```javascript
// On screen focus
useFocusEffect(() => {
  refreshUser();              // Update user permissions
  fetchData({ silent: true }); // Refresh dashboard data
});

// Parallel API calls
Promise.all([
  GET /templates,           // Template count
  GET /audits,              // Audit list & completed count
  GET /actions,             // Pending actions count
  GET /analytics/dashboard  // Analytics data
]);
```

### Permissions

Dashboard visibility is role-based:
- **Templates stat:** `display_templates`, `view_templates`, or admin
- **Audits stat:** `view_audits`, `view_own_audits`, or admin
- **Actions stat:** `view_actions`, `manage_actions`, or admin
- **Analytics section:** `view_analytics` or admin

### Auto-Refresh

- Refreshes on screen focus (throttled to 3 seconds minimum)
- Pull-to-refresh enabled
- Requires online connection

---

## Audit Creation Flows

### Flow 1: Direct Template Selection (Checklists Tab)

**Entry Point:** `ChecklistsScreen.js`

**User Journey:**
```
Checklists Tab
  → View all templates
  → Tap template card
  → Navigate to AuditForm with templateId
  → AuditForm loads template
  → User fills form
  → Submit audit
```

**Navigation:**
```javascript
navigation.navigate('AuditForm', {
  templateId: template.id,
  templateData: template  // Pass full template for offline support
});
```

**Features:**
- Search templates by name
- Shows template item count
- Shows template categories
- Pull-to-refresh
- Real-time online check

**Permission Required:** `create_audits` or `manage_audits` or admin

---

### Flow 2: Category-Based Template Selection (Dashboard → "New")

**Entry Point:** `DashboardScreen.js` → `CategorySelectionScreen.js`

**User Journey:**
```
Dashboard
  → Tap "New Audit" button
  → Navigate to CategorySelectionScreen
  → Select category
  → Select template within category
  → Navigate to AuditForm with templateId & selectedCategory
  → User fills form
  → Submit audit
```

**Two-Step Selection:**

**Step 1: Category Selection**
```javascript
// Categories derived from templates
const categoryMap = {};
templates.forEach(template => {
  template.categories.forEach(cat => {
    if (!categoryMap[cat]) categoryMap[cat] = [];
    categoryMap[cat].push(template);
  });
});
```

**Step 2: Template Selection within Category**
```javascript
navigation.navigate('AuditForm', {
  templateId: template.id,
  templateData: template,
  selectedCategory: category.name
});
```

**Features:**
- Grouped templates by category
- Shows template count per category
- Back navigation between steps
- Auto-groups templates without categories as "General"

---

### Flow 3: Scheduled Audit Start

**Entry Point:** `ScheduledAuditsScreen.js`

**User Journey:**
```
Dashboard
  → Tap "Scheduled Audits"
  → View scheduled audit list
  → Tap "Start" on pending audit
  → Navigate to AuditForm with scheduledAuditId & templateId
  → AuditForm automatically links to scheduled audit
  → User fills form
  → Submit audit (marks scheduled audit as in_progress)
```

**Navigation:**
```javascript
navigation.navigate('AuditForm', {
  templateId: schedule.template_id,
  scheduledAuditId: schedule.id,
  locationId: schedule.location_id || null
});
```

**Business Rules:**
- Only audits with status `pending` or `null` can be started
- Managers/Admins can start any audit
- Regular users can only start audits:
  - They created, OR
  - They are assigned to (if `assigned_to` is set)
- Pre-poning is allowed (can start before scheduled_date)
- Location is pre-filled if specified in schedule

**Permission Required:** `start_scheduled_audits` or `manage_scheduled_audits` or admin

---

### Flow 4: Continue Draft Audit

**Entry Point:** `AuditHistoryScreen.js` or `DashboardScreen.js`

**User Journey:**
```
History Tab / Dashboard Recent Audits
  → Tap draft audit
  → Navigate to AuditDetail
  → Tap "Continue Audit" button
  → Navigate to AuditForm with auditId
  → AuditForm loads existing audit data
  → User continues filling form
  → Submit audit
```

**Navigation:**
```javascript
navigation.navigate('AuditForm', {
  auditId: audit.id,
  continueMode: true
});
```

**Features:**
- Preserves existing responses
- Auto-saves drafts every 5 seconds
- Shows progress indicator
- Allows editing submitted audits (if not finalized)

---

## Audit Management Flows

### AuditFormScreen - The Core Audit Experience

**Entry Point:** `AuditFormScreen.js` (5947 lines - largest component)

### Operating Modes

AuditForm operates in **4 distinct modes** based on route params:

#### Mode 1: New Audit from Template
**Trigger:** `templateId` provided, no `auditId`
```javascript
route.params = { templateId: 123 }
```

**Flow:**
1. Log route params for diagnostics
2. Fetch template via `GET /checklists/{templateId}`
3. Validate template structure
4. Initialize empty form state
5. Render multi-step form

#### Mode 2: Continue Existing Audit
**Trigger:** `auditId` provided
```javascript
route.params = { auditId: 456 }
```

**Flow:**
1. Fetch audit data via `GET /audits/{auditId}`
2. Fetch associated template
3. Pre-populate form with existing responses
4. Render form with edit mode

#### Mode 3: Scheduled Audit
**Trigger:** `scheduledAuditId` + `templateId` provided
```javascript
route.params = { 
  templateId: 123,
  scheduledAuditId: 789,
  locationId: 5
}
```

**Flow:**
1. Check existing audit via `GET /audits/by-scheduled/{scheduledAuditId}`
2. If existing audit found → Load it (continue mode)
3. If no audit → Create new audit linked to schedule
4. Pre-fill location from scheduled audit
5. Render form

#### Mode 4: Recover/Retry Scheduled Audit
**Trigger:** User taps "Retry" on failed scheduled audit
```javascript
// Same as Mode 3 but recovers from failure state
```

### Multi-Step Form Process

**Step 1: Basic Information**
- Template pre-selected (non-editable)
- Location selection (if enabled)
- Outlet/Site selection (optional)
- Category selection (if template has multiple categories)

**Step 2: Checklist Items**
- Dynamic item rendering by category
- Item types:
  - **Checkbox:** Pass/Fail/NA
  - **Text Input:** Free text response
  - **Number Input:** Numeric response
  - **Date Picker:** Date selection
  - **File/Photo Upload:** Attach images/documents
  - **Dropdown/Select:** Single/Multiple choice
- Item scoring (if applicable)
- Notes per item (optional)
- Photos per item (optional)

**Step 3: Final Details**
- Summary review
- Overall notes
- Sign-off/confirmation
- Submit button

### Real-Time Features

**Auto-Save (Draft Mode):**
```javascript
// Every 5 seconds while editing
useEffect(() => {
  const interval = setInterval(() => {
    if (isDirty) saveDraft();
  }, 5000);
  return () => clearInterval(interval);
}, [isDirty]);
```

**Auto-Save saves:**
- Form responses
- Item statuses
- Photos (stored locally)
- Location data
- Timestamp

**Offline Support:**
- Forms can be filled offline
- Data stored in AsyncStorage
- Auto-syncs when online
- Shows offline banner

**Progress Tracking:**
```javascript
const progress = {
  completedItems: items.filter(i => i.status).length,
  totalItems: items.length,
  percentage: (completedItems / totalItems) * 100
};
```

### Validation Rules

**Required Fields:**
- Template selection
- Location (if required by template)
- All mandatory checklist items
- Final sign-off (if enabled)

**Item Validation:**
- Checkbox items: Must select Pass/Fail/NA
- Text items: Min/Max length (if configured)
- Number items: Min/Max range (if configured)
- Date items: Valid date format
- File uploads: Max file size, allowed types

### Submission Flow

```javascript
// Submit button pressed
const handleSubmit = async () => {
  // 1. Validate all required fields
  if (!validateForm()) {
    showValidationErrors();
    return;
  }

  // 2. Prepare submission payload
  const payload = {
    template_id: templateId,
    scheduled_audit_id: scheduledAuditId || null,
    location_id: selectedLocationId,
    outlet_id: selectedOutletId,
    status: 'completed',
    items: items.map(item => ({
      checklist_item_id: item.id,
      status: item.status,
      response: item.response,
      notes: item.notes,
      photos: item.photos
    })),
    notes: finalNotes,
    completed_at: new Date().toISOString()
  };

  // 3. Submit to API
  if (auditId) {
    // Update existing audit
    await axios.put(`${API_BASE_URL}/audits/${auditId}`, payload);
  } else {
    // Create new audit
    const response = await axios.post(`${API_BASE_URL}/audits`, payload);
    auditId = response.data.audit.id;
  }

  // 4. Calculate score (if applicable)
  await axios.post(`${API_BASE_URL}/audits/${auditId}/calculate-score`);

  // 5. Navigate to detail view
  navigation.navigate('AuditDetail', { 
    id: auditId, 
    refresh: true 
  });

  // 6. Clear draft
  await AsyncStorage.removeItem(`audit_draft_${auditId || 'new'}`);
};
```

### Error Handling in AuditForm

**Error States:**
1. **Template Load Error:** Can't fetch template
2. **Audit Load Error:** Can't fetch existing audit
3. **Network Error:** No connection during save
4. **Validation Error:** Required fields missing
5. **Submission Error:** API failure

**Error UI:**
```javascript
if (error) {
  return (
    <View style={styles.errorContainer}>
      <Icon name="error-outline" size={64} color="#f44336" />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity onPress={handleRetry}>
        <Text style={styles.retryButton}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Diagnostic Logging

**Comprehensive logs for debugging:**
```javascript
// Route params logging
console.log('[AuditForm] Route params received:', {
  templateId,
  templateIdType: typeof templateId,
  auditId,
  auditIdType: typeof auditId,
  scheduledAuditId,
  hasAllParams: !!(templateId || auditId || scheduledAuditId)
});

// Template fetch logging
console.log('[AuditForm] Fetching template:', {
  templateId,
  type: typeof templateId,
  hasExistingData: !!auditId,
  apiUrl: `${API_BASE_URL}/checklists/${templateId}`
});

// API call logging
console.log('[AuditForm] Making API call to:', apiUrl);
console.log('[AuditForm] API response received in Xms, status:', response.status);

// Success logging
console.log('[AuditForm] Template loaded successfully:', {
  name: template.name,
  itemCount: template.items.length,
  templateId: template.id
});

// Error logging
console.error('[AuditForm] Error fetching template:', {
  message: error.message,
  code: error.code,
  status: error.response?.status,
  url: apiUrl,
  stack: error.stack
});
```

---

## Scheduled Audits Flow

**Entry Point:** `ScheduledAuditsScreen.js`

### Features

**View Scheduled Audits:**
- List all scheduled audits (pending + in_progress)
- Filter by status: All, Pending, In Progress, Overdue
- Sort by scheduled date
- Search by name/template
- Shows: Name, Template, Location, Scheduled Date, Status

**Status Types:**
- **Pending:** Not started yet
- **In Progress:** Audit has been started
- **Overdue:** Past scheduled_date and not started
- **Completed:** Audit finished (not shown in list)

### Actions

#### 1. Start Scheduled Audit
**Button:** "Start" (only for pending audits)
**Flow:**
```
Tap "Start"
  → Validate permissions (canStartSchedule)
  → Navigate to AuditForm with scheduledAuditId + templateId
  → AuditForm checks if audit already exists for this schedule
  → If exists: Continue existing audit
  → If not: Create new audit linked to schedule
  → Backend marks schedule as in_progress
```

**Permission Check:**
```javascript
const canStartSchedule = (schedule) => {
  const hasStartPermission = 
    hasPermission(userPermissions, 'start_scheduled_audits') || 
    hasPermission(userPermissions, 'manage_scheduled_audits') || 
    isAdmin(user);
  
  if (!hasStartPermission) return false;
  
  const isPending = !schedule.status || schedule.status === 'pending';
  if (!isPending) return false;
  
  // Managers can start any audit
  if (isManager) return true;
  
  // Regular users can start only their own or assigned audits
  const isCreator = schedule.created_by === user.id;
  const isAssignee = schedule.assigned_to === user.id;
  return isCreator || isAssignee;
};
```

#### 2. Continue Scheduled Audit
**Button:** "Continue" (only for in_progress audits)
**Flow:**
```
Tap "Continue"
  → Fetch linked audit via GET /audits/by-scheduled/{scheduleId}
  → Navigate to AuditForm with auditId
  → AuditForm loads existing audit
  → User continues filling form
```

#### 3. Recover Failed Scheduled Audit
**Button:** "Retry" (only for failed audits)
**Flow:**
```
Tap "Retry"
  → Show confirmation dialog
  → On confirm: Navigate to AuditForm with scheduledAuditId
  → AuditForm attempts to recover or create new audit
```

#### 4. Reschedule Audit
**Button:** "Reschedule" (available for pending/overdue audits)
**Flow:**
```
Tap "Reschedule"
  → Check reschedule limit (GET /scheduled-audits/reschedule-count)
  → If limit reached: Show error
  → If allowed: Show date picker modal
  → User selects new date
  → PUT /scheduled-audits/{id}/reschedule with new date
  → Backend updates scheduled_date
  → Increment reschedule count
  → Refresh list
```

**Reschedule Rules:**
- Max 2 reschedules per audit
- Can only reschedule pending/overdue audits
- New date must be in future
- Requires `manage_scheduled_audits` or admin permission

### Auto-Refresh

**Scheduled audits screen auto-refreshes:**
- On screen focus
- Every 60 seconds while focused
- When app comes to foreground
- Pull-to-refresh gesture

**Silent refresh logic:**
```javascript
const fetchScheduledAuditsSilent = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/scheduled-audits`);
    let schedulesData = response.data.schedules || [];
    
    // Filter out completed audits
    schedulesData = schedulesData.filter(schedule => 
      schedule.status !== 'completed'
    );
    
    setSchedules(schedulesData);
    
    // Fetch linked audits for in_progress schedules
    const inProgressSchedules = schedulesData.filter(s => 
      s.status === 'in_progress'
    );
    
    const auditsMap = {};
    if (inProgressSchedules.length > 0) {
      const auditPromises = inProgressSchedules.map(schedule =>
        axios.get(`${API_BASE_URL}/audits/by-scheduled/${schedule.id}`)
          .then(response => ({ 
            scheduleId: schedule.id, 
            auditId: response.data.audit.id 
          }))
          .catch(() => ({ scheduleId: schedule.id, auditId: null }))
      );
      
      const auditResults = await Promise.all(auditPromises);
      auditResults.forEach(({ scheduleId, auditId }) => {
        if (auditId) auditsMap[scheduleId] = auditId;
      });
    }
    
    setLinkedAudits(auditsMap);
  } catch (error) {
    console.error('[Mobile] Silent refresh error:', error.message);
  }
};
```

---

## Audit History Flow

**Entry Point:** `AuditHistoryScreen.js`

### Features

**Audit List:**
- All audits (completed + in_progress + draft)
- Sorted by updated_at (newest first)
- Shows: Template name, Location, Score, Status, Date
- Tap to view details

**Search & Filters:**
- **Search:** Filter by audit name, template name, location
- **Status Filter:** All, Completed, In Progress, Draft
- **Template Filter:** Filter by specific template
- **Date Range:** Filter by creation/completion date

**Filter Modal:**
```javascript
<Modal visible={filterModalVisible}>
  <ScrollView>
    <Text>Filter by Status</Text>
    <TouchableOpacity onPress={() => setStatusFilter('all')}>
      <Text>All</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setStatusFilter('completed')}>
      <Text>Completed</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setStatusFilter('in_progress')}>
      <Text>In Progress</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => setStatusFilter('draft')}>
      <Text>Draft</Text>
    </TouchableOpacity>
    
    <Text>Filter by Template</Text>
    {templates.map(template => (
      <TouchableOpacity 
        key={template.id}
        onPress={() => setTemplateFilter(template.id)}
      >
        <Text>{template.name}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</Modal>
```

### Actions

**Tap Audit → Navigate to AuditDetailScreen**

**Long Press Options:**
- Share audit (if completed)
- Delete audit (if draft)
- Export audit (if completed)

### Auto-Refresh

- Initial fetch on mount
- Fetch on screen focus
- Auto-refresh every 60 seconds while focused
- Pull-to-refresh

### Error Handling

**Soft Error Banner:**
If API fails during auto-refresh, show dismissible banner:
```
⚠️ Connection issue. Showing cached data.
```

**Hard Error Screen:**
If initial load fails completely:
```
❌ Failed to Load Audits
Unable to connect to server.
[Retry Button]
```

---

## Audit Detail Flow

**Entry Point:** `AuditDetailScreen.js`

### Audit Detail View

**Header Section:**
- Template name
- Overall score (with color coding)
- Status badge (Completed/In Progress/Draft)
- Completion date/time
- Location display

**Time Statistics:**
- Start time
- End time
- Total duration
- Pauses (if any)

**Checklist Items Section:**
- Grouped by category
- Shows all items with responses
- Color coding:
  - ✅ Green: Pass
  - ❌ Red: Fail
  - ⚠️ Yellow: Warning/NA
- Notes per item (if any)
- Photos per item (if any)

**Location Section:**
- Location name
- Coordinates (if captured)
- Distance from scheduled location (if applicable)
- Map preview (if enabled)

**Action Plan Section (if completed):**
- Auto-generated action items
- Priority levels
- Responsible parties
- Due dates
- Status tracking

**Audit Notes:**
Overall notes/comments from auditor

### Actions

**Continue Audit Button (if not completed):**
```javascript
<TouchableOpacity onPress={() => {
  navigation.navigate('AuditForm', { 
    auditId: audit.id,
    continueMode: true
  });
}}>
  <Text>Continue Audit</Text>
</TouchableOpacity>
```

**Share Audit Button (if completed):**
```javascript
const handleShare = async () => {
  try {
    await Share.share({
      message: `Audit Report: ${audit.template_name}\nScore: ${audit.score}%\nStatus: ${audit.status}\nCompleted: ${audit.completed_at}`,
      title: 'Audit Report'
    });
  } catch (error) {
    console.error('Error sharing:', error);
  }
};
```

**Export PDF Button (if completed):**
```javascript
// Navigate to web export endpoint
const exportUrl = `${API_BASE_URL}/audits/${audit.id}/export/pdf`;
```

**Delete Button (if draft):**
Only admins or audit creators can delete drafts

### Real-Time Updates

**Screen auto-refreshes:**
- On focus (navigating back from AuditForm)
- When `refresh` param is set
- When `refreshAuditDetail` param is set

```javascript
useEffect(() => {
  if (route.params?.refresh || route.params?.refreshAuditDetail) {
    console.log('[AuditDetail] Refresh requested, fetching latest data');
    fetchAudit();
    navigation.setParams({ refresh: false, refreshAuditDetail: false });
  }
}, [route.params]);
```

---

## Profile & Settings Flow

**Entry Point:** `ProfileScreen.js`

### Profile Information

**User Details:**
- Name
- Email
- Role
- Department (if applicable)
- Organization

**Edit Profile:**
- Update name
- Change password
- Update email (with verification)
- Upload profile photo

### Settings Sections

#### 1. Notification Settings
**Navigate to:** `NotificationSettingsScreen.js`

**Options:**
- Enable/Disable push notifications
- Scheduled audit reminders
- Action item due date alerts
- New audit assignment notifications
- Weekly summary emails
- Notification sound
- Vibration

#### 2. Biometric Authentication
**Toggle:** Enable Face ID / Touch ID
**Implementation:**
```javascript
<Switch
  value={biometricEnabled}
  onValueChange={async (enabled) => {
    if (enabled) {
      const result = await BiometricAuth.authenticate();
      if (result.success) {
        await AsyncStorage.setItem('biometric_enabled', 'true');
        setBiometricEnabled(true);
      }
    } else {
      await AsyncStorage.removeItem('biometric_enabled');
      setBiometricEnabled(false);
    }
  }}
/>
```

#### 3. Offline Mode Settings
- Enable offline mode
- Sync preferences
- Clear offline cache
- View offline storage usage

#### 4. App Information
- App version
- Build number
- Last sync time
- Terms of Service
- Privacy Policy

#### 5. Logout
**Flow:**
```
Tap "Logout"
  → Show confirmation dialog
  → On confirm:
    → Clear AsyncStorage (except offline data if opted in)
    → Clear AuthContext
    → Navigate to Login screen
    → Reset navigation stack
```

---

## Offline & Network Handling

### Network Context

**Provider:** `NetworkContext.js`

**Features:**
- Real-time network status monitoring
- Online/Offline detection
- Connection type detection (WiFi/Cellular)

**Usage:**
```javascript
const { isOnline, connectionType } = useNetwork();

if (!isOnline) {
  Alert.alert('No Internet', 'Please connect to continue.');
  return;
}
```

### Offline Context

**Provider:** `OfflineContext.js`

**Features:**
- Offline mode toggle
- Offline data storage
- Sync queue management
- Auto-sync when online

### Offline Banner

**Component:** `OfflineBanner` (shown in App.js)

```javascript
{isAuthenticated && <OfflineBanner />}
```

**Behavior:**
- Appears at top of screen when offline
- Shows: "⚠️ You are offline. Changes will sync when online."
- Dismissible
- Auto-hides when online

### Offline Support by Feature

| Feature | Offline Support | Sync Strategy |
|---------|----------------|---------------|
| **Login** | ❌ No | Requires API |
| **Dashboard** | ⚠️ Cached | Shows last loaded data |
| **Template List** | ⚠️ Cached | Shows last fetched templates |
| **Audit Form** | ✅ Full | Saves to AsyncStorage, syncs when online |
| **Draft Audits** | ✅ Full | Local storage, background sync |
| **Audit History** | ⚠️ Cached | Shows last fetched audits |
| **Audit Detail** | ⚠️ Cached | Shows last viewed audit |
| **Scheduled Audits** | ❌ No | Requires real-time data |
| **Profile** | ⚠️ Cached | Shows last loaded profile |

### Draft Auto-Save

**Mechanism:**
```javascript
// Save draft every 5 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    if (isDirty && !isSubmitting) {
      const draft = {
        templateId,
        auditId,
        scheduledAuditId,
        items: items.map(i => ({
          id: i.id,
          status: i.status,
          response: i.response,
          notes: i.notes,
          photos: i.photos
        })),
        location: selectedLocation,
        outlet: selectedOutlet,
        notes: finalNotes,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(
        `audit_draft_${auditId || 'new'}`,
        JSON.stringify(draft)
      );
      
      console.log('[AuditForm] Draft saved');
      setIsDirty(false);
    }
  }, 5000);
  
  return () => clearInterval(interval);
}, [isDirty, isSubmitting, items, selectedLocation, selectedOutlet, finalNotes]);
```

**Draft Recovery:**
```javascript
// On component mount, check for existing draft
useEffect(() => {
  const loadDraft = async () => {
    const draftKey = `audit_draft_${auditId || 'new'}`;
    const draftJson = await AsyncStorage.getItem(draftKey);
    
    if (draftJson) {
      const draft = JSON.parse(draftJson);
      
      Alert.alert(
        'Draft Found',
        'A draft was found for this audit. Do you want to continue from where you left off?',
        [
          {
            text: 'Discard',
            onPress: async () => {
              await AsyncStorage.removeItem(draftKey);
            },
            style: 'destructive'
          },
          {
            text: 'Continue',
            onPress: () => {
              setItems(draft.items);
              setSelectedLocation(draft.location);
              setSelectedOutlet(draft.outlet);
              setFinalNotes(draft.notes);
            }
          }
        ]
      );
    }
  };
  
  loadDraft();
}, [auditId]);
```

### Sync Queue

**When offline:**
1. User actions queued in AsyncStorage
2. Queue structure:
```javascript
{
  id: 'unique_id',
  type: 'CREATE_AUDIT' | 'UPDATE_AUDIT' | 'DELETE_AUDIT',
  payload: { /* action data */ },
  timestamp: Date.now(),
  retries: 0,
  status: 'pending'
}
```

**When online:**
1. Sync queue processes automatically
2. Actions executed in order
3. Failed actions retry with exponential backoff
4. Success → Remove from queue
5. Failure after 3 retries → Mark for manual review

---

## Permission System

### Permission Context

**Provider:** `AuthContext.js` (includes permissions in user object)

**User Object Structure:**
```javascript
{
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  role: "Manager",
  permissions: [
    "view_audits",
    "create_audits",
    "manage_audits",
    "view_templates",
    "start_scheduled_audits",
    "view_analytics"
  ]
}
```

### Permission Utility Functions

**File:** `utils/permissions.js`

```javascript
export const hasPermission = (permissions, requiredPermission) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return permissions.includes(requiredPermission);
};

export const hasAnyPermission = (permissions, requiredPermissions) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return requiredPermissions.some(perm => permissions.includes(perm));
};

export const hasAllPermissions = (permissions, requiredPermissions) => {
  if (!permissions || !Array.isArray(permissions)) return false;
  return requiredPermissions.every(perm => permissions.includes(perm));
};

export const isAdmin = (user) => {
  return user?.role?.toLowerCase() === 'admin' || 
         user?.is_admin === true;
};
```

### Permission-Based UI Rendering

**Example: Dashboard Tabs**
```javascript
const { user } = useAuth();
const userPermissions = user?.permissions || [];

const canViewTemplates = 
  hasPermission(userPermissions, 'display_templates') ||
  hasPermission(userPermissions, 'view_templates') ||
  hasPermission(userPermissions, 'manage_templates') ||
  isAdmin(user);

return (
  <Tab.Navigator>
    <Tab.Screen name="Dashboard" component={DashboardStack} />
    
    {canViewTemplates && (
      <Tab.Screen name="Checklists" component={ChecklistsStack} />
    )}
    
    {/* Conditional tabs based on permissions */}
  </Tab.Navigator>
);
```

### Common Permissions

| Permission | Description | Screens/Features |
|-----------|-------------|------------------|
| `view_audits` | View all audits | History Tab, Dashboard stats |
| `view_own_audits` | View only user's audits | History Tab (filtered) |
| `create_audits` | Create new audits | New Audit button, Template selection |
| `manage_audits` | Full audit management | Edit, Delete, Assign |
| `view_templates` | View templates | Checklists Tab |
| `manage_templates` | Manage templates | Template admin features |
| `start_scheduled_audits` | Start scheduled audits | Scheduled Audits "Start" button |
| `manage_scheduled_audits` | Manage scheduled audits | Reschedule, Reassign |
| `view_actions` | View action items | Actions section |
| `manage_actions` | Manage actions | Create, Update, Close actions |
| `view_analytics` | View analytics | Dashboard analytics section |
| `view_schedule_adherence` | View schedule compliance | Schedule adherence metrics |
| `view_tasks` | View tasks | Tasks Tab |
| `manage_tasks` | Manage tasks | Create, Update, Delete tasks |

---

## Context Providers

### 1. AuthContext

**Purpose:** User authentication and session management

**State:**
- `user`: Current user object
- `isAuthenticated`: Boolean
- `loading`: Boolean
- `token`: JWT token

**Methods:**
- `login(email, password)`: Authenticate user
- `logout()`: Clear session
- `register(userData)`: Create account
- `refreshUser()`: Refresh user data and permissions
- `updateProfile(updates)`: Update user profile

**Usage:**
```javascript
const { user, isAuthenticated, login, logout } = useAuth();
```

---

### 2. NetworkContext

**Purpose:** Network status monitoring

**State:**
- `isOnline`: Boolean
- `connectionType`: 'wifi' | 'cellular' | 'none'

**Implementation:**
```javascript
import NetInfo from '@react-native-community/netinfo';

const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      setConnectionType(state.type);
    });
    
    return () => unsubscribe();
  }, []);
  
  return (
    <NetworkContext.Provider value={{ isOnline, connectionType }}>
      {children}
    </NetworkContext.Provider>
  );
};
```

**Usage:**
```javascript
const { isOnline } = useNetwork();

if (!isOnline) {
  Alert.alert('Offline', 'Please connect to internet');
  return;
}
```

---

### 3. OfflineContext

**Purpose:** Offline data management and sync

**State:**
- `offlineModeEnabled`: Boolean
- `pendingSyncCount`: Number
- `lastSyncTime`: Date

**Methods:**
- `enableOfflineMode()`: Enable offline support
- `disableOfflineMode()`: Disable offline support
- `syncNow()`: Trigger manual sync
- `addToSyncQueue(action)`: Add action to sync queue
- `clearOfflineCache()`: Clear local cache

**Usage:**
```javascript
const { offlineModeEnabled, syncNow, pendingSyncCount } = useOffline();
```

---

### 4. NotificationContext

**Purpose:** Push notification management

**State:**
- `notifications`: Array of notifications
- `unreadCount`: Number
- `pushToken`: Expo push token

**Methods:**
- `requestPermissions()`: Request notification permissions
- `markAsRead(notificationId)`: Mark notification read
- `clearAll()`: Clear all notifications

**Implementation:**
```javascript
import * as Notifications from 'expo-notifications';

const NotificationProvider = ({ children }) => {
  const [pushToken, setPushToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    registerForPushNotifications();
    
    const subscription = Notifications.addNotificationReceivedListener(
      notification => {
        setNotifications(prev => [notification, ...prev]);
      }
    );
    
    return () => subscription.remove();
  }, []);
  
  const registerForPushNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    setPushToken(token);
    
    // Send token to backend
    await axios.post(`${API_BASE_URL}/users/push-token`, { token });
  };
  
  return (
    <NotificationContext.Provider value={{ notifications, pushToken }}>
      {children}
    </NotificationContext.Provider>
  );
};
```

**Usage:**
```javascript
const { notifications, unreadCount } = useNotification();
```

---

### 5. LocationContext

**Purpose:** Location services and geofencing

**State:**
- `currentLocation`: { latitude, longitude, accuracy }
- `locationPermission`: 'granted' | 'denied' | 'undetermined'

**Methods:**
- `requestPermission()`: Request location permission
- `getCurrentLocation()`: Get current coordinates
- `calculateDistance(lat1, lon1, lat2, lon2)`: Calculate distance
- `startTracking()`: Start continuous location tracking
- `stopTracking()`: Stop location tracking

**Implementation:**
```javascript
import * as Location from 'expo-location';

const LocationProvider = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('undetermined');
  
  const requestPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status);
    return status === 'granted';
  };
  
  const getCurrentLocation = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return null;
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    
    setCurrentLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy
    });
    
    return location.coords;
  };
  
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };
  
  return (
    <LocationContext.Provider value={{ 
      currentLocation, 
      locationPermission,
      getCurrentLocation,
      calculateDistance
    }}>
      {children}
    </LocationContext.Provider>
  );
};
```

**Usage:**
```javascript
const { getCurrentLocation, calculateDistance } = useLocation();

const location = await getCurrentLocation();
const distance = calculateDistance(
  location.latitude, 
  location.longitude,
  scheduledLat,
  scheduledLon
);

if (distance > 100) {
  Alert.alert('Location Mismatch', 'You are not at the scheduled location.');
}
```

---

### 6. BiometricContext

**Purpose:** Biometric authentication (Face ID / Touch ID)

**State:**
- `isBiometricSupported`: Boolean
- `biometricType`: 'FaceID' | 'TouchID' | 'Fingerprint' | null
- `isEnrolled`: Boolean

**Methods:**
- `checkSupport()`: Check if device supports biometrics
- `authenticate(reason)`: Trigger biometric authentication
- `enableBiometric()`: Enable for app login
- `disableBiometric()`: Disable biometric login

**Implementation:**
```javascript
import * as LocalAuthentication from 'expo-local-authentication';

const BiometricProvider = ({ children }) => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  
  useEffect(() => {
    checkSupport();
  }, []);
  
  const checkSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    setIsBiometricSupported(compatible);
    
    if (compatible) {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('FaceID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('TouchID');
      }
    }
  };
  
  const authenticate = async (reason = 'Authenticate to continue') => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use Passcode'
    });
    
    return result.success;
  };
  
  return (
    <BiometricContext.Provider value={{
      isBiometricSupported,
      biometricType,
      authenticate
    }}>
      {children}
    </BiometricContext.Provider>
  );
};
```

**Usage:**
```javascript
const { authenticate, biometricType } = useBiometric();

// On login screen
const handleBiometricLogin = async () => {
  const success = await authenticate('Login to Audit App');
  if (success) {
    // Proceed with login using stored credentials
    login(storedEmail, storedPassword);
  }
};
```

---

## Error Handling

### Error Boundary

**Component:** `ErrorBoundary.js` (wraps entire app)

**Purpose:** Catch React component errors and prevent app crash

```javascript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Report to error tracking service (e.g., Sentry)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={64} color="#f44336" />
          <Text style={styles.errorText}>Something went wrong</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false })}>
            <Text style={styles.retryButton}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return this.props.children;
  }
}
```

### API Error Handling

**Standard pattern across all screens:**

```javascript
const fetchData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await axios.get(`${API_BASE_URL}/endpoint`);
    setData(response.data);
  } catch (error) {
    console.error('Error fetching data:', error);
    
    // Network error
    if (error.message === 'Network Error') {
      setError('No internet connection. Please check your network.');
      Alert.alert('Connection Error', 'Please check your internet connection.');
      return;
    }
    
    // 4xx errors (client errors)
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Something went wrong';
      
      if (status === 401) {
        // Unauthorized - token expired
        Alert.alert('Session Expired', 'Please login again.');
        logout();
        return;
      }
      
      if (status === 403) {
        // Forbidden - permission denied
        Alert.alert('Permission Denied', 'You do not have access to this resource.');
        return;
      }
      
      if (status === 404) {
        // Not found
        setError('Resource not found.');
        return;
      }
      
      if (status >= 500) {
        // Server error
        setError('Server error. Please try again later.');
        Alert.alert('Server Error', 'Our servers are experiencing issues. Please try again later.');
        return;
      }
      
      // Generic error
      setError(message);
      Alert.alert('Error', message);
    } else {
      // Unknown error
      setError('An unexpected error occurred.');
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
```

### Retry Logic

**Exponential backoff for failed API calls:**

```javascript
const fetchWithRetry = async (url, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (client errors)
      if (error.response && error.response.status < 500) {
        throw error;
      }
      
      // Exponential backoff: 2^i seconds
      const delay = Math.pow(2, i) * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
```

---

## Flow Diagrams

### 1. Complete Audit Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER STARTS                              │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─────► Path 1: Dashboard → "New Audit" Button
             │         │
             │         └──► CategorySelectionScreen
             │                 │
             │                 ├──► Select Category
             │                 │
             │                 └──► Select Template from Category
             │                         │
             │                         └──► AuditFormScreen(templateId)
             │
             ├─────► Path 2: Checklists Tab → Direct Template
             │         │
             │         └──► ChecklistsScreen
             │                 │
             │                 └──► Tap Template Card
             │                         │
             │                         └──► AuditFormScreen(templateId)
             │
             ├─────► Path 3: Scheduled Audits → Start
             │         │
             │         └──► ScheduledAuditsScreen
             │                 │
             │                 └──► Tap "Start" on Pending Audit
             │                         │
             │                         └──► AuditFormScreen(templateId, scheduledAuditId)
             │
             └─────► Path 4: Continue Draft
                       │
                       └──► AuditHistoryScreen / Dashboard
                               │
                               └──► Tap Draft Audit
                                       │
                                       └──► AuditDetailScreen
                                               │
                                               └──► Tap "Continue"
                                                       │
                                                       └──► AuditFormScreen(auditId)
                                                       
┌─────────────────────────────────────────────────────────────────┐
│              ALL PATHS CONVERGE TO AUDITFORM                    │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├──► Load Template Data
             │      ├──► Fetch template via API
             │      ├──► Validate template structure
             │      └──► Initialize form state
             │
             ├──► Step 1: Basic Information
             │      ├──► Location selection (if required)
             │      ├──► Outlet selection (optional)
             │      └──► Category selection (if multiple)
             │
             ├──► Step 2: Checklist Items
             │      ├──► Render items by category
             │      ├──► Fill responses (checkbox/text/number/etc)
             │      ├──► Add photos/notes per item
             │      ├──► Calculate progress (X/Y completed)
             │      └──► Auto-save draft every 5 seconds
             │
             ├──► Step 3: Final Details
             │      ├──► Review summary
             │      ├──► Add overall notes
             │      ├──── Sign-off/confirmation
             │      └──► Tap "Submit"
             │
             ├──► Validation
             │      ├──► Check all required fields
             │      ├──► Validate item responses
             │      └──► If errors → Show validation UI
             │
             ├──► Submission
             │      ├──► Prepare payload
             │      ├──► POST /audits (new) or PUT /audits/:id (update)
             │      ├──► Calculate score
             │      └──► If Scheduled Audit → Update status to in_progress
             │
             └──► Success
                    ├──► Clear draft from storage
                    ├──► Navigate to AuditDetailScreen(auditId)
                    └──── Show success message
```

---

### 2. Scheduled Audit Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                   SCHEDULED AUDIT CREATED                      │
│                   (via Web Dashboard)                           │
└────────────┬───────────────────────────────────────────────────┘
             │
             │ Status: pending
             │ Assigned to: User X
             │ Template: Template Y
             │ Scheduled Date: 2026-02-20
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│         MOBILE: ScheduledAuditsScreen Displays Audit            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ CVR Audit - Location: Store #5                       │     │
│  │ Template: CVR Checklist                             │     │
│  │ Scheduled: Feb 20, 2026 at 10:00 AM                 │     │
│  │ Status: Pending                                      │     │
│  │                                                       │     │
│  │ [Start Audit] [Reschedule]                          │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
└────────────┬───────────────────────────────────────────────────┘
             │
             ├──────► User taps "Start Audit"
             │          │
             │          ├──► Permission check (canStartSchedule)
             │          │
             │          ├──► Navigate to AuditForm
             │          │      with scheduledAuditId + templateId
             │          │
             │          ├──► AuditForm checks for existing audit
             │          │      GET /audits/by-scheduled/:id
             │          │
             │          ├──► If exists: Continue existing audit
             │          │
             │          └──► If not: Create new audit
             │                  POST /audits {
             │                    template_id,
             │                    scheduled_audit_id,
             │                    status: 'in_progress'
             │                  }
             │
             ├──► Backend updates schedule status
             │      PUT /scheduled-audits/:id {
             │        status: 'in_progress'
             │      }
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│         Status: in_progress                                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ CVR Audit - Location: Store #5                       │     │
│  │ Template: CVR Checklist                             │     │
│  │ Status: In Progress                                  │     │
│  │                                                       │     │
│  │ [Continue] [View Details]                           │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
└────────────┬───────────────────────────────────────────────────┘
             │
             ├──────► User taps "Continue"
             │          │
             │          └──► Fetch linked audit
             │                GET /audits/by-scheduled/:id
             │                  │
             │                  └──► Navigate to AuditForm(auditId)
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│         User Completes Audit                                    │
└────────────┬───────────────────────────────────────────────────┘
             │
             ├──► AuditForm submits audit
             │      PUT /audits/:id {
             │        status: 'completed',
             │        completed_at: now
             │      }
             │
             ├──► Backend updates schedule
             │      PUT /scheduled-audits/:id {
             │        status: 'completed',
             │        actual_completion_date: now
             │      }
             │
             └──► Navigate to AuditDetailScreen
             
┌────────────────────────────────────────────────────────────────┐
│         Status: completed                                       │
│         (Audit removed from ScheduledAuditsScreen list)        │
└────────────────────────────────────────────────────────────────┘
```

---

### 3. Offline Audit Creation Flow

```
┌────────────────────────────────────────────────────────────────┐
│                   USER GOES OFFLINE                            │
└────────────┬───────────────────────────────────────────────────┘
             │
             ├──► NetworkContext detects offline
             │      isOnline = false
             │
             └──► OfflineBanner appears at top
                    "⚠️ You are offline. Changes will sync when online."
                    
┌────────────────────────────────────────────────────────────────┐
│                User Navigates to Checklists                     │
└────────────┬───────────────────────────────────────────────────┘
             │
             ├──► ChecklistsScreen tries to fetch templates
             │      GET /templates → Network Error
             │
             ├──► Shows last cached templates (if any)
             │      OR
             │      Shows "No Internet" message
             │
             └──► User selects template from cache
                    (if templateData was passed previously)
                    
┌────────────────────────────────────────────────────────────────┐
│         AuditFormScreen (Offline Mode)                          │
└────────────┬───────────────────────────────────────────────────┘
             │
             ├──► Unable to fetch template from API
             │      (if templateData not in cache)
             │      → Shows error with "Retry when online"
             │
             ├──► IF template data is cached or passed via params:
             │
             ├──► Load template from templateData parameter
             │      navigation.params.templateData
             │
             ├──► User fills form normally
             │      └──► All responses stored in component state
             │
             ├──► Auto-save to AsyncStorage every 5 seconds
             │      AsyncStorage.setItem('audit_draft_new', JSON.stringify({
             │        templateId,
             │        items: [responses],
             │        location,
             │        notes,
             │        timestamp
             │      }))
             │
             ├──► Photos stored locally in AsyncStorage
             │      (base64 encoded or file URI)
             │
             └──► User taps "Submit"
                    │
                    ├──► Check if online → Still offline
                    │
                    ├──► Add to sync queue
                    │      AsyncStorage.setItem('sync_queue', JSON.stringify([
                    │        {
                    │          id: 'sync_1',
                    │          type: 'CREATE_AUDIT',
                    │          payload: { audit data },
                    │          timestamp: Date.now(),
                    │          status: 'pending',
                    │          retries: 0
                    │        }
                    │      ]))
                    │
                    ├──► Show success message
                    │      "Audit saved locally. Will sync when online."
                    │
                    └──► Navigate to AuditHistory
                           (Shows audit with "Pending Sync" badge)
                           
┌────────────────────────────────────────────────────────────────┐
│                USER COMES BACK ONLINE                          │
└────────────┬───────────────────────────────────────────────────┘
             │
             ├──► NetworkContext detects online
             │      isOnline = true
             │
             ├──► OfflineBanner disappears
             │
             ├──► OfflineContext triggers auto-sync
             │
             └──► Process sync queue
                    │
                    ├──► For each item in queue:
                    │      │
                    │      ├──► Execute API call
                    │      │      POST /audits with payload
                    │      │
                    │      ├──► On success:
                    │      │      ├──► Remove from queue
                    │      │      ├──► Clear local draft
                    │      │      └──► Update audit with server ID
                    │      │
                    │      └──► On failure:
                    │             ├──► Increment retries
                    │             ├──► If retries < 3:
                    │             │      Wait (exponential backoff)
                    │             │      Retry
                    │             └──► If retries >= 3:
                    │                    Mark for manual review
                    │
                    └──► Show sync completion notification
                           "✅ 1 audit synced successfully"
```

---

### 4. Navigation Flow (Complete App)

```
                            ┌─────────────┐
                            │   App.js    │
                            └──────┬──────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
          NOT AUTHENTICATED              AUTHENTICATED
                    │                             │
            ┌───────▼────────┐           ┌────────▼────────┐
            │   AuthStack    │           │    AppStack     │
            │                │           │  (Bottom Tabs)  │
            └───┬────────────┘           └────────┬────────┘
                │                                  │
        ┌───────┼────────┐                        │
        │       │        │                        │
    ┌───▼──┐ ┌─▼──┐ ┌───▼────┐          ┌───────┼──────────────────┐
    │Login │ │Reg-│ │Forgot  │          │       │                  │
    │      │ │ister│ │Password│          │       │                  │
    └──────┘ └────┘ └────────┘          │       │                  │
                                    ┌────▼────┐  ├─────┐  ┌───────┐│
                                    │Dashboard│  │Check│  │History││
                                    │  Tab    │  │lists│  │  Tab  ││
                                    └────┬────┘  │ Tab │  └───┬───┘│
                                         │       └──┬──┘      │    │
                                    ┌────▼────┐    │    ┌────▼────┐│
                                    │Dashboard│    │    │History  ││
                                    │  Stack  │    │    │ Stack   ││
                                    └────┬────┘    │    └────┬────┘│
                                         │         │         │     │
                        ┌────────────────┼─────────┼─────────┼─────┤
                        │                │         │         │     │
                  ┌─────▼──────┐  ┌──────▼──┐ ┌───▼────┐ ┌──▼──┐ │
                  │Dashboard   │  │Scheduled│ │Checklists│ │Audit│ │
                  │Main        │  │ Audits  │ │List    │ │Detail│ │
                  └─────┬──────┘  └──────┬──┘ └───┬────┘ └──┬──┘ │
                        │                │        │          │    │
                        └────────────────┴────────┴──────────┤    │
                                         │                   │    │
                                    ┌────▼────┐              │    │
                                    │  Audit  │◄─────────────┘    │
                                    │  Form   │                   │
                                    └────┬────┘                   │
                                         │                        │
                                    ┌────▼────┐                   │
                                    │  Audit  │◄──────────────────┘
                                    │ Detail  │
                                    └─────────┘
                                         │
                        ┌────────────────┴──────────────┐
                        │                               │
                   ┌────▼─────┐                  ┌─────▼────┐
                   │Continue  │                  │  Share   │
                   │→AuditForm│                  │  Export  │
                   └──────────┘                  └──────────┘
```

---

## Summary

### Key User Journeys

**1. First-Time User:**
```
Install App → Register → Login → Dashboard → 
View Templates → Select Template → Fill Audit → Submit → 
View in History
```

**2. Daily Auditor:**
```
Open App → Biometric Login → Dashboard → 
Scheduled Audits → Start Scheduled Audit → 
Fill Form → Submit → Next Scheduled Audit
```

**3. Field Worker (Offline):**
```
Open App (Offline) → Use cached templates → 
Fill audit offline → Auto-save drafts → 
Come online → Auto-sync → View synced audit
```

**4. Manager:**
```
Login → Dashboard → View Analytics → 
Check Schedule Adherence → Review recent audits → 
View action items → Assign tasks
```

---

### Critical Flows

**Most Important Flows to Test:**
1. ✅ Template Selection → Audit Creation
2. ✅ Scheduled Audit Start → Completion
3. ✅ Draft Auto-Save → Recovery
4. ✅ Offline Audit → Online Sync
5. ✅ Audit History → Detail View
6. ✅ Permission-Based Access Control

---

### Performance Considerations

**Screen Load Times:**
- Dashboard: ~1-2s (parallel API calls)
- Template List: ~500ms-1s
- Audit Form: ~2-3s (template fetch + initialization)
- Audit Detail: ~1-2s
- History List: ~1-2s

**Auto-Refresh Intervals:**
- Dashboard: On focus (throttled to 3s)
- Scheduled Audits: Every 60s while focused
- Audit History: Every 60s while focused

**Caching Strategy:**
- Templates: Cache for 5 minutes
- Audit List: Cache for 1 minute
- Audit Details: No cache (always fresh)

---

### Mobile-Specific Features

**Platform Optimizations:**
- iOS: Face ID / Touch ID support
- Android: Fingerprint authentication
- Both: Location services, Push notifications, Camera access

**Native Integrations:**
- Expo Camera for photo capture
- Expo Location for GPS
- Expo Notifications for push
- AsyncStorage for persistence
- NetInfo for network status

---

**Document Version:** 1.0  
**Last Updated:** February 18, 2026  
**Next Review:** Monthly or on major feature changes
