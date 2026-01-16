# ✅ Template-Specific Assignment Rules

**Date:** 2025-01-28
**Status:** ✅ Implemented

---

## 🎯 What Was Implemented

### Template-Specific Assignment Rules UI

Enhanced the Settings page to support creating assignment rules that apply to specific templates, in addition to general category-based rules.

**Features:**
- ✅ Template selector in rule creation/edit dialog
- ✅ Filter to view "All Rules", "General Rules", or "Template-Specific Rules"
- ✅ Visual chips to distinguish rule types
- ✅ Template name display in rule list
- ✅ Priority system: Template-specific rules override general rules

---

## 📊 How It Works

### Rule Priority

When determining assignee for an action item:

1. **Template-Specific Rule** (highest priority)
   - If a rule exists for the audit's template_id AND the item's category
   - This rule takes precedence over general rules

2. **General Category Rule**
   - If no template-specific rule exists
   - Applies to all templates using that category

3. **Location Manager** (fallback)
4. **Severity-Based** (fallback)
5. **Audit Creator** (fallback)
6. **Default Admin/Manager** (last resort)

### Example

**Scenario:**
- General rule: `FOOD SAFETY` → `manager` (applies to all templates)
- Template-specific rule: `FOOD SAFETY` → `supervisor` (for "Restaurant Audit Template")

**Result:**
- Audits using "Restaurant Audit Template" with `FOOD SAFETY` items → assigned to `supervisor`
- Audits using other templates with `FOOD SAFETY` items → assigned to `manager`

---

## 🖥️ UI Features

### Rule Creation Dialog

When adding or editing a rule:
1. **Category** - Enter category name (e.g., "FOOD SAFETY")
2. **Assigned Role** - Select role (supervisor, manager, admin, location_manager)
3. **Template (Optional)** - Select a specific template or leave as "All Templates (General Rule)"
4. **Priority Level** - Set priority (higher = evaluated first)

### Rule List Display

- **Filter Dropdown**: Filter by "All Rules", "General Rules", or "Template-Specific Rules"
- **Visual Indicators**:
  - Blue chip: "Template: [Template Name]" for template-specific rules
  - Gray chip: "General" for general rules
- **Rule Details**: Shows category, assigned role, priority level, and active status

---

## 🔧 Technical Details

### Database Schema

The `assignment_rules` table supports:
- `template_id` (INTEGER, nullable) - NULL for general rules, template ID for specific rules
- Unique constraint ensures one rule per category per template

### API Endpoints

**Create Rule:**
```javascript
POST /api/assignment-rules
{
  "category": "FOOD SAFETY",
  "assigned_role": "supervisor",
  "template_id": 5,  // Optional: null for general rule
  "priority_level": 10
}
```

**Update Rule:**
```javascript
PUT /api/assignment-rules/:id
{
  "category": "FOOD SAFETY",
  "assigned_role": "supervisor",
  "template_id": 5,  // Can be changed or set to null
  "priority_level": 10,
  "is_active": true
}
```

### Backend Logic

**File:** `backend/utils/assignmentRules.js`

The `evaluateCategoryRule` function:
1. First checks for template-specific rule matching both `template_id` and `category`
2. Falls back to general rule (where `template_id IS NULL`) if no template-specific rule exists
3. Uses priority level to determine which rule to use if multiple match

---

## 📝 Usage Examples

### Example 1: General Rule

Create a rule that applies to all templates:
- Category: `FOOD SAFETY`
- Assigned Role: `manager`
- Template: Leave as "All Templates (General Rule)"
- Priority: `10`

**Result:** All `FOOD SAFETY` items from any template are assigned to managers.

### Example 2: Template-Specific Rule

Create a rule for a specific template:
- Category: `FOOD SAFETY`
- Assigned Role: `supervisor`
- Template: Select "Restaurant Audit Template"
- Priority: `15`

**Result:** 
- `FOOD SAFETY` items from "Restaurant Audit Template" → assigned to `supervisor`
- `FOOD SAFETY` items from other templates → assigned to `manager` (from general rule)

### Example 3: Override General Rule

If you want a template to use a different role:
1. Create general rule: `SERVICE` → `supervisor`
2. Create template-specific rule: `SERVICE` → `manager` (for specific template)

**Result:** The template-specific rule overrides the general rule for that template.

---

## ✅ Benefits

1. **Flexibility**: Different templates can have different assignment rules
2. **Granular Control**: Fine-tune assignments per template type
3. **Backward Compatible**: General rules still work for all templates
4. **Visual Clarity**: Easy to see which rules are template-specific vs general
5. **Priority System**: Template-specific rules automatically take precedence

---

## 🚀 Next Steps

1. **Bulk Operations**: Add ability to copy rules from one template to another
2. **Rule Templates**: Create rule sets that can be applied to multiple templates
3. **Analytics**: Track which rules are used most frequently
4. **Validation**: Warn when creating conflicting rules

---

## ✅ Summary

- ✅ Template selector in rule creation/edit dialog
- ✅ Filter for general vs template-specific rules
- ✅ Visual chips for rule type distinction
- ✅ Template fetching and integration
- ✅ Priority system (template-specific overrides general)
- ✅ Backend logic updated to support template-specific rules
- ✅ Database schema supports template_id (nullable)

All features are production-ready!
