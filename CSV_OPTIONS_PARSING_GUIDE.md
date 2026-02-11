# Complete Options Parsing Guide for CSV Import

## Overview

The CSV import supports **flexible options parsing** with multiple formats and separators. You can use labels only, scores only, or combinations.

---

## 📋 Supported Options Formats

### Format 1: Label with Score (Most Common)

**Format:** `Label:Score|Label:Score|Label:Score`

**Examples:**

```csv
Yes:3|No:0|NA:NA
Pass:1|Fail:0
Excellent:5|Good:4|Fair:2|Poor:0
Available:1|NotAvailable:0
Working:1|Broken:0|Pending:2
```

**Use Case:** When you want both a display label AND a numeric/text score

**Result in App:**

- Displays: "Yes", "No", "NA"
- Stores: 3, 0, "NA"

---

### Format 2: Labels Only (No Scores)

**Format:** `Label|Label|Label`

**Examples:**

```csv
Yes|No|NA
Pass|Fail|Pending
Excellent|Good|Fair|Poor
Available|NotAvailable
Working|Broken|Maintenance
```

**Use Case:** When you only need display labels, no scoring

**Result in App:**

- Displays: "Yes", "No", "NA"
- Stores: "" (empty marks)

---

### Format 3: Numbers Only (No Labels)

**Format:** `5|4|3|2|1|0`

**Examples:**

```csv
5|4|3|2|1|0
10|8|6|4|2|0
100|80|60|40|20|0
1|0
```

**Use Case:** When scores are self-explanatory

**Result in App:**

- Displays: "5", "4", "3", "2", "1", "0"
- Stores: (same values)

---

### Format 4: Mixed Labels and Scores

**Format:** `Label:Score|Label|Score:Value`

**Examples:**

```csv
Excellent:5|Good:4|Fair|Poor:0
Pass:1|Fail
Available:100|NotAvailable:0|Pending
```

**Use Case:** When some options need scores but others don't

**Result in App:**

- Displays: Mix of labels with/without scores
- Stores: Corresponding values

---

## 🔀 Supported Separators

### Primary Separator: Pipe `|` (Recommended)

```csv
Yes:3|No:0|NA:NA
Pass|Fail
```

**Why:** Most standard, widely recognized, works in most systems

### Alternate Separator: Semicolon `;`

```csv
Yes:3;No:0;NA:NA
Pass;Fail;Pending
```

**Use Case:** When pipe character conflicts with other data

**Auto-Detection:** System detects which separator is used based on presence of `|` or `;`

---

## 📊 Real-World Examples

### Example 1: Compliance Check (Yes/No/NA)

```csv
title,category,input_type,options
Temperature Check,Food Safety,option_select,Yes:3|No:0|NA:NA
Cleanliness,Sanitation,option_select,Yes:3|No:0|NA:NA
Equipment,Maintenance,option_select,Yes:3|No:0|NA:NA
```

**Parsing:**

- Label: Yes, Score: 3
- Label: No, Score: 0
- Label: NA, Score: NA

---

### Example 2: Quality Ratings (Excellent to Poor)

```csv
title,category,input_type,options
Service Quality,Customer Service,option_select,Excellent:5|Good:4|Fair:2|Poor:0
Cleanliness,Hygiene,option_select,Excellent:5|Good:4|Fair:2|Poor:0
Food Temperature,Food Safety,option_select,Excellent:5|Good:4|Fair:2|Poor:0
```

**Parsing:**

- Each option gets both display label and numeric score
- Scores 0-5 for rating scale

---

### Example 3: Pass/Fail with Text Scores

```csv
title,category,input_type,options
Certification,Compliance,option_select,Pass:PASS|Fail:FAIL|Pending:PENDING
Approval,Management,option_select,Approved:YES|Rejected:NO|Pending:WAIT
```

**Parsing:**

- Labels: Pass, Fail, Pending
- Scores: PASS, FAIL, PENDING (text)

---

### Example 4: Labels Only (No Scoring)

```csv
title,category,input_type,options
Flavor,Food Quality,option_select,Fresh|Acceptable|Stale
Freshness,Inventory,option_select,NewStock|UsedStock|Expired
Availability,Supplies,option_select,InStock|LowStock|OutOfStock
```

**Parsing:**

- Only labels, no scores
- Useful for descriptive options

---

### Example 5: Mixed Format

```csv
title,category,input_type,options
Condition,Equipment,option_select,Excellent:5|Good:4|Fair|Poor:0
Status,Facility,option_select,Open:1|Closed|Maintenance:0
Compliance,Legal,option_select,Full|Partial:0.5|None:0
```

**Parsing:**

- Some options with scores: "Excellent:5", "Poor:0"
- Some without: "Fair", "Closed"
- Mixed result: Best of both approaches

---

## 🔍 How Parsing Works

### Step 1: Detect Separator

- If CSV contains `|` → Use pipe separator
- Else if CSV contains `;` → Use semicolon separator
- Else → Single option only

### Step 2: Split by Separator

```text
"Yes:3|No:0|NA:NA" → ["Yes:3", "No:0", "NA:NA"]
```

### Step 3: Split Each Option by Colon

```text
"Yes:3" → ["Yes", "3"]
"No:0" → ["No", "0"]
"NA:NA" → ["NA", "NA"]
```

### Step 4: Extract Label and Score

```text
Label: Yes, Score: 3
Label: No, Score: 0
Label: NA, Score: NA
```

### Step 5: Create Option Objects

```javascript
{
  option_text: "Yes",
  mark: "3",
  order_index: 0
}
```

---

## ⚠️ Important Notes

### Quotes and Whitespace

```csv
WORKS:     "Yes:3|No:0|NA:NA"
WORKS:     Yes:3|No:0|NA:NA
WORKS:     Yes : 3 | No : 0 (whitespace trimmed)
NOT NEEDED: \"Yes:3\" (extra quotes removed)
```

### Empty or Missing Scores

```csv
Yes:|No:0    → Yes with empty score, No with 0
Yes|No       → Both with empty scores
:3|:0        → Only scores, no labels (INVALID - labels required)
```

### Special Characters

```csv
WORKS:     Label:Value (colon allowed in text)
WORKS:     A&B:3|C/D:0 (special chars allowed)
WORKS:     Café:5|Naïve:4 (Unicode allowed)
CAUTION:   Use quotes if option contains pipe: "Yes|No:3|Maybe:0|Actually|:This"
```

### Length Limits

- **Label:** Up to 100 characters
- **Score:** Up to 50 characters
- **Total Options:** Up to 100 per item
- **Each Option:** Up to 200 characters

---

## 📝 CSV Column Position

Options can be in any column, but naming matters:

**Works (Auto-Detected):**

```csv
options,title,category          ← "options" column found
answers,title,category          ← "answers" column found
choices,title,category          ← "choices" column found
```

**Columns Checked For:**

- `options`
- `choices`
- `answers`
- Any column containing "option" (case-insensitive)

---

## 🔧 Common Use Cases

### Use Case 1: Restaurant Quality Audit

```csv
title,category,section,input_type,options
Temperature,Food Safety,Kitchen,option_select,Correct:1|Incorrect:0
Cleanliness,Hygiene,FOH,option_select,Excellent:5|Good:4|Fair:2|Poor:0
Equipment,Maintenance,BOH,option_select,Working:1|Broken:0|Maintenance:2
```

**Result:** Scores for tracking quality over time

---

### Use Case 2: Compliance Checklist

```csv
title,category,input_type,options
Certification Current,Compliance,option_select,Yes:1|No:0
Training Complete,Training,option_select,Yes:1|No:0
License Valid,Legal,option_select,Yes:1|No:0
```

**Result:** Pass/fail checklist with scoring

---

### Use Case 3: Performance Assessment

```csv
title,category,section,input_type,options
Staff Courtesy,Service,Front,option_select,Excellent|Good|Fair|Poor
Wait Time,Speed,Front,option_select,Fast|Acceptable|Slow
Food Quality,Quality,Kitchen,option_select,Excellent|Good|Fair|Poor
```

**Result:** Descriptive feedback without scoring

---

### Use Case 4: Mixed Scoring System

```csv
title,category,input_type,options
Overall Satisfaction,Customer,option_select,VeryPoor:1|Poor:2|Fair:3|Good:4|Excellent:5
Recommendation,Business,option_select,Definitely|Probably|Maybe|Probably Not|Definitely Not
Speed of Service,Timing,option_select,Fast:1|OnTime:2|Slow:3
```

**Result:** Flexible scoring with both numbers and descriptive text

---

## 🐛 Troubleshooting

### Issue: Options not showing in app

**Check:**

1. Column named `options`, `choices`, or `answers`?
2. Separator is `|` or `;`?
3. Format correct: `Label:Score|Label:Score`?
4. No extra quotes around entire options string?

**Fix:**

```csv
WRONG:  "Yes:3|No:0"  (quotes included in data)
RIGHT:  Yes:3|No:0
```

---

### Issue: Scores not appearing

**Check:**

1. Using colon `:` between label and score?
2. Score after label, not before?
3. No spaces around colon?

**Fix:**

```csv
WRONG:  Yes : 3
RIGHT:  Yes:3

WRONG:  3:Yes
RIGHT:  Yes:3
```

---

### Issue: Only first option appears

**Check:**

1. Using separator? (`|` or `;`)
2. Separator present between all options?
3. No extra quotes around individual options?

**Fix:**

```csv
WRONG:  Yes:3 No:0 NA:NA
RIGHT:  Yes:3|No:0|NA:NA
```

---

### Issue: Special characters corrupted

**Check:**

1. CSV file encoding (UTF-8 recommended)
2. Quotes around options if special chars present

**Fix:**

```csv
WORKS:   Café:5|Naïve:3
WORKS:   "Café:5|Naïve:3" (if file encoding supports UTF-8)
```

---

## ✅ Verification Checklist

Before importing, verify:

- [ ] Column is named `options`, `choices`, or `answers`
- [ ] Separator is `|` (pipe) or `;` (semicolon)
- [ ] Format: `Label:Score|Label:Score` (or just labels)
- [ ] No extra quotes around entire option string
- [ ] Whitespace allowed but will be trimmed
- [ ] Each option has at least a label
- [ ] Colons `:` separate label from score
- [ ] Pipes `|` or semicolons `;` separate options
- [ ] No commas `,` between options (use pipe instead)
- [ ] CSV shows preview with correct option count

---

## 📚 Complete Examples by Input Type

### option_select (Dropdown)

```csv
title,input_type,options
Question,option_select,Yes:3|No:0|NA:NA
```

### multiple_answer (Checkboxes)

```csv
title,input_type,options
Select All,multiple_answer,Option1|Option2|Option3|Option4
```

### radio_button (Radio Buttons)

```csv
title,input_type,options
Choose One,radio_button,Choice1:1|Choice2:2|Choice3:3
```

### grid (Matrix)

```csv
title,input_type,options
Rate Each,grid,Poor:1|Fair:2|Good:3|Excellent:5
```

---

## 🎯 Best Practices

1. **Use Consistent Format**
   - Stick to one separator (prefer `|`)
   - Consistent label naming
   - Consistent scoring scheme

2. **Clear Labels**
   - Use meaningful names
   - Avoid special characters if possible
   - Keep labels under 20 characters

3. **Logical Scoring**
   - Higher numbers = better results
   - Consistent scale (0-5, 0-10, etc.)
   - Match scoring to reporting needs

4. **Test First**
   - Import with test name first
   - Verify options display correctly
   - Create test audit to verify behavior

---

## Summary

| Format | Separator | Example |
| --- | --- | --- |
| Label:Score | Pipe `\|` | `Yes:3\|No:0` |
| Label Only | Pipe `\|` | `Yes\|No\|NA` |
| Score Only | Pipe `\|` | `5\|4\|3\|2\|1\|0` |
| Mixed | Pipe `\|` | `Yes:3\|No\|NA:NA` |
| Alt Sep | Semicolon `;` | `Yes:3;No:0;NA:NA` |

All formats are supported and will be correctly parsed into the app.
