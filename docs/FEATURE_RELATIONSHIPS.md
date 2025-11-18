# Feature Relationships & Linkup

This document explains how the core features of the Audit & Checklist App are interconnected and work together.

## 🔗 Feature Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHECKLIST TEMPLATES                          │
│  (Base structure - defines what to audit)                       │
│  - Contains checklist_items                                     │
│  - Reusable across multiple audits                              │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ template_id (FOREIGN KEY)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEDULED AUDITS                            │
│  (Future audit planning)                                        │
│  - References: template_id, location_id, assigned_to            │
│  - Can be: once, daily, weekly, monthly                         │
│  - Creates actual audits when due                               │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ When scheduled date arrives
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AUDITS                                     │
│  (Actual audit execution)                                       │
│  - References: template_id, user_id, location_id, team_id        │
│  - Contains: audit_items (responses to checklist items)         │
│  - Status: in_progress → completed                              │
│  - Score calculated from audit_items                            │
└───────────────┬───────────────────────┬─────────────────────────┘
                │                       │
                │ audit_id              │ audit_id
                │                       │
                ▼                       ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│      ACTION ITEMS             │  │         TASKS                 │
│  (Corrective actions)        │  │  (Workflow management)        │
│  - Created from failed/      │  │  - Can be linked to audits    │
│    warning audit items       │  │  - Can be linked to actions    │
│  - References: audit_id,     │  │  - Supports dependencies      │
│    item_id, assigned_to      │  │  - References: audit_id,       │
│  - Tracks: priority, due_date│  │    location_id, team_id        │
│  - Status: pending → completed│  │  - Status: pending → completed│
└──────────────────────────────┘  └──────────────────────────────┘
```

## 📊 Database Relationships

### 1. **Checklist Templates → Audits**
- **Relationship**: One-to-Many
- **Foreign Key**: `audits.template_id` → `checklist_templates.id`
- **Purpose**: Every audit uses a template to define what items to check
- **Flow**: 
  ```
  Template Created → Scheduled Audit Created → Actual Audit Created
  ```

### 2. **Scheduled Audits → Audits**
- **Relationship**: One-to-Many (when recurring)
- **Foreign Key**: `scheduled_audits.template_id` → `checklist_templates.id`
- **Purpose**: Automatically create audits based on schedule
- **Flow**:
  ```
  Scheduled Audit (daily/weekly/monthly) → Auto-creates Audit when due
  ```

### 3. **Audits → Action Items**
- **Relationship**: One-to-Many
- **Foreign Key**: `action_items.audit_id` → `audits.id`
- **Additional**: `action_items.item_id` → `checklist_items.id`
- **Purpose**: Create corrective actions from failed audit findings
- **Flow**:
  ```
  Audit Completed → Failed Items Identified → Action Items Created
  ```

### 4. **Audits → Tasks**
- **Relationship**: One-to-Many (optional)
- **Foreign Key**: `tasks.audit_id` → `audits.id`
- **Purpose**: Create workflow tasks related to audit follow-up
- **Flow**:
  ```
  Audit Completed → Tasks Created for Follow-up Actions
  ```

### 5. **Action Items → Tasks** (Potential Link)
- **Relationship**: Can be linked via `tasks.metadata` or `tasks.audit_id`
- **Purpose**: Convert action items into trackable tasks
- **Flow**:
  ```
  Action Item Created → Task Created for Tracking
  ```

## 🔄 Complete Workflow Example

### Scenario: Monthly Restaurant Audit

1. **Setup Phase**:
   ```
   Admin creates "Monthly Restaurant Audit" Template
   ├── Defines checklist items (Food Safety, Cleanliness, etc.)
   └── Template saved in checklist_templates
   ```

2. **Scheduling Phase**:
   ```
   Manager creates Scheduled Audit
   ├── Selects "Monthly Restaurant Audit" template
   ├── Sets location: "Downtown Branch"
   ├── Sets frequency: "monthly"
   ├── Assigns to: "John (Auditor)"
   └── Scheduled audit saved in scheduled_audits
   ```

3. **Execution Phase** (When scheduled date arrives):
   ```
   System/User creates Audit from Scheduled Audit
   ├── Uses template to create audit
   ├── Auditor fills in audit_items (responses)
   ├── System calculates score
   └── Audit marked as "completed"
   ```

4. **Action Phase** (After audit completion):
   ```
   Manager reviews completed audit
   ├── Finds failed items (e.g., "Kitchen temperature too high")
   ├── Creates Action Item
   │   ├── Links to audit_id and item_id
   │   ├── Assigns to: "Kitchen Manager"
   │   ├── Sets priority: "high"
   │   └── Sets due_date: "2025-01-15"
   └── Action item saved in action_items
   ```

5. **Task Management Phase** (Optional):
   ```
   Manager creates Task for follow-up
   ├── Links to audit_id
   ├── Title: "Follow up on kitchen temperature issue"
   ├── Assigns to: "Kitchen Manager"
   ├── Sets reminder_date
   └── Task saved in tasks
   ```

6. **Completion Phase**:
   ```
   Kitchen Manager completes action
   ├── Updates action_item status to "completed"
   ├── Updates task status to "completed"
   └── System can create notification
   ```

## 📋 Key Database Tables & Their Links

| Table | Primary Links | Purpose |
|-------|--------------|---------|
| `checklist_templates` | - | Base template structure |
| `checklist_items` | `template_id` → templates | Items in a template |
| `scheduled_audits` | `template_id` → templates<br>`location_id` → locations<br>`assigned_to` → users | Future audit planning |
| `audits` | `template_id` → templates<br>`user_id` → users<br>`location_id` → locations<br>`team_id` → teams | Actual audit execution |
| `audit_items` | `audit_id` → audits<br>`item_id` → checklist_items | Individual item responses |
| `action_items` | `audit_id` → audits<br>`item_id` → checklist_items<br>`assigned_to` → users | Corrective actions |
| `tasks` | `audit_id` → audits (optional)<br>`location_id` → locations<br>`team_id` → teams<br>`assigned_to` → users | Workflow management |

## 🎯 Use Cases

### Use Case 1: Template-Based Audit Workflow
```
Template → Scheduled Audit → Actual Audit → Action Items → Tasks
```

### Use Case 2: Standalone Action Items
```
Audit → Failed Items → Action Items (standalone, not linked to tasks)
```

### Use Case 3: Task-Only Workflow
```
Tasks created independently (not from audits)
├── Can link to location_id
├── Can link to team_id
└── Can have dependencies (task_dependencies)
```

### Use Case 4: Scheduled Recurring Audits
```
Scheduled Audit (monthly) → Auto-creates Audit each month → Action Items → Tasks
```

## 🔑 Key Points

1. **Templates are the foundation** - Everything starts with a checklist template
2. **Scheduled Audits plan ahead** - They reference templates and create audits when due
3. **Audits execute the plan** - They use templates and create audit_items
4. **Action Items fix problems** - Created from failed audit findings
5. **Tasks manage workflows** - Can be linked to audits or standalone
6. **All features are interconnected** - They work together to create a complete audit management system

## 💡 Integration Benefits

- **Traceability**: Track from template → audit → action → task
- **Automation**: Scheduled audits auto-create audits
- **Accountability**: Link actions to specific audit findings
- **Workflow Management**: Tasks can depend on each other
- **Team Collaboration**: All features support team assignments
- **Location Management**: All features can be location-specific

