# Version 1.14.0 - CVR 3 (CDR) Plan, CSV Import & CVR/CDR UI (Mobile & Web)

**Release Date:** January 2025  
**Status:** ✅ Complete

## Overview

This version adds the **CVR 3 – (CDR) Plan** checklist (CSV-based), CSV import support for `short_answer` and `signature` input types, and a dedicated **CVR/CDR UI** (dark theme, purple accents, Due pill, Photo/Remarks on option items) on both **mobile** and **web** when the template name contains "CVR" or "CDR Plan".

---

## 1. CVR 3 – (CDR) Plan Checklist & CSV Import

### 1.1 CVR_3_CDR_Plan.csv

- **Location:** Project root `CVR_3_CDR_Plan.csv`
- **Structure:** Same as CVR 2 / `CVR___CDR_checklist (2).csv`, with:
  - **Categories:** QUALITY, SERVICE, HYGIENE AND CLEANLINESS, PROCESSES, ACKNOWLEDGEMENT
  - **Subcategories:** entrance, Restaurant, Accuracy, Delivery Service, Technology, Speed of Service (Trnx-1–4, Avg), Entrance, FOH, Bar and Service area, Restroom / Washroom, Back of the house, tools & tackles, Proper appearance and conduct
  - **Input types:** `auto` (Yes/No/NA), `short_answer`, `number`, `signature`
  - **Acknowledgement (new):**
    - **Manager on Duty** – `short_answer`, placeholder "Type Here"
    - **Signature** – `signature` for "Tap to Sign"

### 1.2 Import

- **Doc:** `docs/CVR_3_IMPORT.md`
- **Web:** Checklists/Templates → **Import CSV** → Template name: `CVR 3 – (CDR) Plan`, upload `CVR_3_CDR_Plan.csv`
- **API:** `POST /api/checklists/import/csv` with `templateName`, `file`
- **Backend:** CSV import already supports `short_answer`, `number`, `signature`; `subcategory` stored for reports.

---

## 2. CVR/CDR UI – Mobile

### 2.1 Theme (`mobile/src/config/theme.js`)

- **`cvrTheme`:** `background.primary` (#19193C), `background.card` (#27274E), `text.primary`/`secondary`/`placeholder`, `accent.purple` (#8A72F6), `accent.purpleGradient`, `accent.green` (#4CAF50), `accent.due` (#EAA000), `input.bg`/`input.border`, `button.next` (gradient), `button.saveDraft`
- **`isCvrTemplate(name)`:** `true` when name contains "CVR" or "CDR Plan"

### 2.2 AuditFormScreen

- **When** `isCvrTemplate(template?.name)`:
  - **Container:** `cvrTheme.background.primary`
  - **Details (Step 0):** "OUTLET (Required)", Search, dark input; **Save Draft** (purple text); **Next** (purple gradient)
  - **Category Selection (Step 1):** Dark CVR-themed category cards; purple progress bars; purple gradient Next button; Save Draft button
  - **Checklist (Step 2):**
    - **Horizontal Category Tabs:** Scrollable tabs at top with "Details" (green checkmark) + category tabs (QUALITY, SERVICE, etc.); purple underline indicator on active tab; green checkmarks for completed categories
    - **Submit** / **Close** (purple gradient); **short_answer**: "Response", "Type Here"; **Photo** on all Yes/No/NA (option) items (purple icon/label); **Remarks** (purple label, dark input); **signature**: existing flow unchanged
  - **Item cards:** Dark card background when CVR

### 2.3 ScheduledAuditsScreen

- **CVR cards:** Dark card, light text, purple icon
- **"Due 11:59 PM"** chip (amber) when: CVR template, `scheduled_date` is today, and user can Start or Continue

---

## 3. CVR/CDR UI – Web

### 3.1 Theme (`web/src/config/theme.js`)

- **`cvrTheme`**, **`isCvrTemplate`** (same semantics as mobile, CSS-friendly values)

### 3.2 AuditForm.js

- **When** `isCvrTemplate(template?.name)`:
  - **Container:** `cvrTheme.background.primary`
  - **Title, Stepper:** Light text
  - **Step 0 (Details):** Paper `cvrTheme.background.card`; "OUTLET (Required)" Autocomplete with dark input; **Save Draft** (purple, toast); **Next** (purple gradient)
  - **Step 1 (Select Category):** Dark CVR-themed category cards and accordions; purple progress bars and accents; purple gradient Next button; Save Draft button
  - **Step 2 (Checklist):**
    - **Horizontal Category Tabs (MUI Tabs):** Scrollable tabs with "Details" (green checkmark) + category tabs; purple underline indicator on active tab; green checkmarks for completed categories; replaces dropdown Select for CVR templates
    - Progress Paper dark; item **Cards** `cvrTheme.background.card`; **Remarks** label and dark input; **Photo** on `image_upload` and on option (Yes/No/NA) items, purple styling; **short_answer** "Response", "Type Here", dark input

### 3.3 ScheduledAudits.js

- **CVR cards:** `cvrTheme.background.card`, purple icon, light text
- **"Due 11:59 PM"** chip when: CVR, due today, and user can Start or Continue

---

## 4. Files Touched

### New

- `CVR_3_CDR_Plan.csv` – CVR 3 checklist
- `docs/CVR_3_IMPORT.md` – Import instructions
- `docs/prd/VERSION_1.14.0.md` – This PRD

### Modified

**Backend**

- (No schema change; import already supports `short_answer`, `signature`; `subcategory` in place)

**Mobile**

- `mobile/src/config/theme.js` – `cvrTheme`, `isCvrTemplate`
- `mobile/src/screens/AuditFormScreen.js` – CVR layout, OUTLET, Save Draft, Next, Photo/Remarks, short_answer, Submit
- `mobile/src/screens/ScheduledAuditsScreen.js` – CVR cards, Due 11:59 PM

**Web**

- `web/src/config/theme.js` – `cvrTheme`, `isCvrTemplate`
- `web/src/pages/AuditForm.js` – CVR layout, OUTLET, Save Draft, Next, Remarks, Photo, short_answer, cards
- `web/src/pages/ScheduledAudits.js` – CVR cards, Due 11:59 PM

---

## 5. How to Use

### CVR 3 checklist

1. **Import:** Web → Checklists (or Templates) → Import CSV → name **CVR 3 – (CDR) Plan**, file `CVR_3_CDR_Plan.csv`
2. **Audits:** Create or schedule audits with template "CVR 3 – (CDR) Plan" (or any name containing "CVR" or "CDR Plan" for CVR UI)

### CVR UI (Mobile & Web)

- **Trigger:** Template name contains **"CVR"** or **"CDR Plan"**
- **Details:** OUTLET (Required), Search, Save Draft, Next (purple)
- **Checklist:** Dark cards, Photo + Remarks on Yes/No/NA items, short_answer "Type Here", purple Submit
- **Acknowledgement:** Manager on Duty (text), Signature (Tap to Sign)
- **Scheduled cards:** Dark CVR card, "Due 11:59 PM" when due today and Start/Continue allowed

---

## 6. Testing (high level)

- [ ] Import `CVR_3_CDR_Plan.csv` as "CVR 3 – (CDR) Plan" (web)
- [ ] Mobile: New audit with CVR 3 → dark screen, OUTLET, Save Draft, Next (gradient)
- [ ] Mobile: Category Selection → dark CVR cards, purple progress bars, Save Draft, purple gradient Next
- [ ] Mobile: Checklist → **Horizontal category tabs** (Details ✓, QUALITY, SERVICE, etc.); tap to switch categories
- [ ] Mobile: Checklist → Photo & Remarks on Yes/No/NA items; short_answer "Type Here"; Manager on Duty, Signature
- [ ] Mobile: Scheduled CVR with due today → "Due 11:59 PM" on card
- [ ] Web: Category Selection → dark CVR cards/accordions, purple progress bars, Save Draft, purple gradient Next
- [ ] Web: Checklist → **Horizontal category tabs** (Details ✓, QUALITY, SERVICE, etc.); click to switch categories
- [ ] Web: Same flows for CVR 3 (dark form, OUTLET, Save Draft, Next, Remarks, Photo, short_answer, CVR cards, Due chip)

---

**Documentation Updated:** January 2025  
**Last Reviewed:** January 2025
