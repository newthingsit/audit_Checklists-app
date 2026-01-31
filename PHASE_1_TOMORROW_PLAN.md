# Phase 1 TOMORROW - ACTION PLAN

**Timeline**: 8-10 hours focused work
**Goal**: Complete Phase 1 component integration by EOD
**Success**: Both platforms build without errors, 50%+ code reduction

---

## TASK 1: Web Component Integration (3-4 hours)

### 1.1 Refactor AuditForm.js Header
**File**: `web/src/pages/AuditForm.js`

**Step 1**: Add imports (Lines 1-20)
```javascript
// Add these imports
import AuditInfoForm from '../components/AuditInfoForm';
import CategoryTabs from '../components/CategoryTabs';
import FormStepperHeader from '../components/FormStepperHeader';
import FormSectionRenderer from '../components/FormSectionRenderer';

import { useAuditFormState } from '../hooks/useAuditFormState';
import { useCategoryCompletion } from '../hooks/useCategoryCompletion';
import { useFormValidation } from '../hooks/useFormValidation';

import { calculateCategoryCompletionStatus } from '@shared/utils/auditHelpers';
```

**Step 2**: Replace state variables (~50 lines → 10 lines)
**FIND**: All `const [responses, setResponses]` and similar state declarations (Lines ~30-100)
**REPLACE WITH**:
```javascript
const formState = useAuditFormState();
const { categoryStatus, isFormComplete } = useCategoryCompletion(
  items,
  categories,
  formState
);
const { errors, validateField, validateForm } = useFormValidation();
```

**Step 3**: Replace render JSX for step 0 (Info) - ~50 lines
**FIND**: Lines with `activeStep === 0` rendering
**REPLACE WITH**:
```javascript
{activeStep === 0 && (
  <AuditInfoForm
    notes={formState.notes}
    onNotesChange={formState.setNotes}
    auditId={auditId}
    selectedLocation={selectedLocation}
  />
)}
```

**Step 4**: Replace category tabs - ~30 lines
**FIND**: Manual category map/render
**REPLACE WITH**:
```javascript
{activeStep === 1 && (
  <CategoryTabs
    categories={categories}
    categoryStatus={categoryStatus}
    activeStep={activeCategoryIndex}
    onCategoryChange={setActiveCategoryIndex}
  />
)}
```

**Step 5**: Replace form items rendering - ~100 lines
**FIND**: Large form item map/render loop
**REPLACE WITH**:
```javascript
{activeStep === 2 && (
  <FormSectionRenderer
    items={filteredItems}
    formState={formState}
    handlers={{
      updateSelectedOption: formState.updateSelectedOption,
      updateMultipleSelection: formState.updateMultipleSelection,
      updateInputValue: formState.updateInputValue,
      updateComment: formState.updateComment,
    }}
  />
)}
```

**Expected Result**: Web file reduced from 2836 → 1500-1700 lines

---

## TASK 2: Mobile Component Integration (3-4 hours)

### 2.1 Refactor AuditFormScreen.js Header
**File**: `mobile/src/screens/AuditFormScreen.js`

**Step 1**: Add imports (Lines 1-30)
```javascript
import CategorySelector from '../components/CategorySelector';
import ChecklistItemsList from '../components/ChecklistItemsList';
import FormActionButtons from '../components/FormActionButtons';
import LocationCapture from '../components/LocationCapture';
import PhotoUpload from '../components/PhotoUpload';
import StepIndicator from '../components/StepIndicator';
import SignatureCapture from '../components/SignatureCapture';

import { useCategoryNavigation } from '../hooks/useCategoryNavigation';
import { useAuditData } from '../hooks/useAuditData';
```

**Step 2**: Replace state management (~100+ lines → 20 lines)
**FIND**: All state variable declarations (Lines ~30-130)
**REPLACE WITH**:
```javascript
const categoryNav = useCategoryNavigation(categories, items, formData);
const auditData = useAuditData(auditId, categoryNav.getSelectedCategory());
const formState = useAuditFormState();
```

**Step 3**: Replace render JSX for each step

**Step 0 (Info)**:
```javascript
{currentStep === 0 && (
  <AuditInfoForm
    notes={formState.notes}
    onNotesChange={formState.setNotes}
    location={selectedLocation}
  />
)}
```

**Step 1 (Categories)**:
```javascript
{currentStep === 1 && (
  <CategorySelector
    categories={categories}
    selectedCategory={categoryNav.getSelectedCategory()}
    onSelectCategory={categoryNav.selectCategory}
    categoryStatus={categoryStatus}
  />
)}
```

**Step 2 (Checklist)**:
```javascript
{currentStep === 2 && (
  <ChecklistItemsList
    items={auditData.items}
    responses={formState.responses}
    onUpdateResponse={formState.updateResponse}
    loading={auditData.loading}
  />
)}
```

**Step 4**: Add components at bottom
```javascript
<LocationCapture onLocationCapture={handleLocationCapture} />
<PhotoUpload onPhotoCapture={handlePhotoCapture} />
<SignatureCapture visible={showSignature} onClose={() => setShowSignature(false)} />

<StepIndicator
  currentStep={currentStep}
  stepStatus={{0: {isComplete: true}, 1: {...}, 2: {...}}}
/>

<FormActionButtons
  currentStep={currentStep}
  isLastStep={currentStep === 2}
  isFormValid={isFormComplete}
  onPrevious={categoryNav.previousStep}
  onContinue={categoryNav.nextStep}
  onSubmit={handleSubmit}
  loading={submitting}
/>
```

**Expected Result**: Mobile file reduced from 5110 → 2500-2800 lines

---

## TASK 3: Create Remaining Mobile Hooks (1-2 hours)

### 3.1 Create useLocationTracking.js
**File**: `mobile/src/hooks/useLocationTracking.js`

Extract GPS tracking logic from AuditFormScreen
- useForegroundSubscription
- useBackgroundSubscription
- Distance calculation
- Geofencing validation

### 3.2 Create usePhotoCapture.js
**File**: `mobile/src/hooks/usePhotoCapture.js`

Extract photo management:
- Photo compression
- Storage management
- Permission handling
- Cache cleanup

---

## TASK 4: Testing & Verification (1-2 hours)

### 4.1 Test Component Imports
```bash
cd web && npm run build 2>&1 | grep -i error
cd mobile && eas build --platform ios 2>&1 | grep -i error
```

### 4.2 Verify No Broken Imports
```bash
grep -r "Cannot find module" web/build/ mobile/build/
```

### 4.3 Manual Testing
- [ ] Web: Load each step, verify rendering
- [ ] Mobile: Load each step, verify rendering
- [ ] Web: Test form submission
- [ ] Mobile: Test form submission

---

## TASK 5: File Size Verification (30 min)

### Before
- Web AuditForm.js: 2836 lines
- Mobile AuditFormScreen.js: 5110 lines

### After (Target)
- Web AuditForm.js: 1400-1600 lines (50%+ reduction)
- Mobile AuditFormScreen.js: 2500-2800 lines (51%+ reduction)

### Verify
```bash
wc -l web/src/pages/AuditForm.js
wc -l mobile/src/screens/AuditFormScreen.js
```

---

## TASK 6: Git Commit & Push (30 min)

```bash
git add -A
git commit -m "feat: Phase 1 integration - Refactor monolithic screens with components

BREAKING: AuditForm.js and AuditFormScreen.js are now component-based

CHANGES:
- Web: Integrated 4 components + 3 hooks, reduced 2836→~1500 lines (47%)
- Mobile: Integrated 7 components + 2 hooks, reduced 5110→~2600 lines (49%)
- Code duplication: Reduced from 40% to <10%
- All imports from @shared/* for cross-platform consistency

IMPROVEMENTS:
- Testability: Each component independently testable
- Maintainability: Smaller, focused components
- Reusability: 11+ components shared across platforms
- Performance: Lazy loading potential

NEXT: Phase 2 - TypeScript migration and testing setup

✅ Phase 1 COMPLETE"
git push origin master
```

---

## Priority Checklist

**MUST DO TODAY**:
- [ ] Integrate 4 web components
- [ ] Integrate 7 mobile components
- [ ] All imports working
- [ ] No TypeScript errors
- [ ] Web builds successfully
- [ ] Mobile builds successfully
- [ ] Code reduction verified
- [ ] Git commit & push

**NICE TO HAVE**:
- [ ] Create useLocationTracking.js
- [ ] Create usePhotoCapture.js
- [ ] Write component tests
- [ ] Update documentation

---

## Time Boxing

| Task | Est. Time | Actual |
|------|-----------|--------|
| Web Integration | 3-4 hrs | |
| Mobile Integration | 3-4 hrs | |
| Mobile Hooks | 1-2 hrs | |
| Testing & Verification | 1-2 hrs | |
| File Size Check | 0.5 hrs | |
| Git Commit & Push | 0.5 hrs | |
| **TOTAL** | **9-18 hrs** | |

**Target: Complete all by EOD tomorrow** ✅

---

## Success Criteria

✅ ALL MUST BE MET:

1. **Code Reduction**
   - [ ] Web: 2836 → <1600 lines (43%+ reduction)
   - [ ] Mobile: 5110 → <2800 lines (45%+ reduction)

2. **Component Integration**
   - [ ] All 18 components used
   - [ ] All 5 hooks integrated
   - [ ] Zero unused state variables in main screens

3. **Build Success**
   - [ ] `npm run build` completes for web
   - [ ] `eas build` completes for mobile
   - [ ] Zero import errors
   - [ ] Zero TypeScript errors

4. **Functionality**
   - [ ] All form steps render correctly
   - [ ] Form submission works
   - [ ] Category navigation works
   - [ ] No console errors

5. **Git Status**
   - [ ] Commit created with descriptive message
   - [ ] Pushed to origin/master
   - [ ] CI/CD passes (if configured)

---

## Rollback Plan (If Needed)

```bash
# Rollback to c347009 (component scaffolding)
git reset --hard c347009
git push -f origin master

# Or rollback to d14966e (production code)
git reset --hard d14966e
git push -f origin master
```

---

**Phase 1 = Component Extraction Foundation**

After tomorrow, you'll have:
- ✅ Cleaner codebase (50%+ smaller screens)
- ✅ Reusable components (11+ across platforms)
- ✅ Shared utilities (987 lines of DRY code)
- ✅ Foundation for TypeScript migration (Phase 2)
- ✅ Ready for testing setup (Phase 2)

**Your expert is ready. Let's crush Phase 1 tomorrow! 🚀**

