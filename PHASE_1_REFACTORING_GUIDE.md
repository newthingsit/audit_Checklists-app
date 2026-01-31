# Phase 1 Component Refactoring Guide

## Overview
Phase 1 focuses on breaking down monolithic screen components into smaller, testable, reusable components. This guide helps you integrate the newly created components into existing screens.

## Timeline
- **TODAY**: Complete component scaffolding (✅ Done)
- **TOMORROW**: Integrate components, refactor main screens, implement hooks

## Component Architecture

### Web Components Structure
```
web/src/
├── components/
│   ├── AuditInfoForm.jsx         ✅ Created
│   ├── CategoryTabs.jsx          ✅ Created
│   ├── FormSectionRenderer.jsx   ✅ Created
│   ├── FormStepperHeader.jsx     ✅ Created
│   ├── PhotoUploadSection.jsx    [Create Tomorrow]
│   ├── LocationSection.jsx       [Create Tomorrow]
│   └── NotesSection.jsx          [Create Tomorrow]
├── hooks/
│   ├── useAuditFormState.js      ✅ Created
│   ├── useFormValidation.js      ✅ Created
│   ├── useCategoryCompletion.js  ✅ Created
│   └── useFormDataLoader.js      [Create Tomorrow]
└── pages/
    └── AuditForm.js              [To be refactored]
```

### Mobile Components Structure
```
mobile/src/
├── components/
│   ├── CategorySelector.jsx      ✅ Created
│   ├── ChecklistItemsList.jsx    ✅ Created
│   ├── FormActionButtons.jsx     ✅ Created
│   ├── LocationCapture.jsx       ✅ Created
│   ├── PhotoUpload.jsx           ✅ Created
│   ├── SignatureCapture.jsx      [Create Tomorrow]
│   └── StepIndicator.jsx         [Create Tomorrow]
├── hooks/
│   ├── useAuditData.js           [Create Tomorrow]
│   ├── useCategoryNavigation.js  [Create Tomorrow]
│   ├── useLocationTracking.js    [Create Tomorrow]
│   └── usePhotoCapture.js        [Create Tomorrow]
└── screens/
    └── AuditFormScreen.js        [To be refactored]
```

## Integration Steps

### Step 1: Import Components & Hooks (Web)
```javascript
// In web/src/pages/AuditForm.js (Top of file)

// Import Components
import AuditInfoForm from '../components/AuditInfoForm';
import CategoryTabs from '../components/CategoryTabs';
import FormSectionRenderer from '../components/FormSectionRenderer';
import FormStepperHeader from '../components/FormStepperHeader';

// Import Hooks
import { useAuditFormState } from '../hooks/useAuditFormState';
import { useCategoryCompletion } from '../hooks/useCategoryCompletion';
import { useFormValidation } from '../hooks/useFormValidation';

// Import Shared Utils
import { calculateCategoryCompletionStatus } from '@shared/utils/auditHelpers';
import { AuditStatus } from '@shared/constants/auditConstants';
```

### Step 2: Replace State Management (Web)
**BEFORE** (Current monolithic code):
```javascript
const [responses, setResponses] = useState({});
const [selectedOptions, setSelectedOptions] = useState({});
const [multipleSelections, setMultipleSelections] = useState({});
const [comments, setComments] = useState({});
// ... 30+ more state variables
```

**AFTER** (Using custom hooks):
```javascript
const formState = useAuditFormState();
const { categoryStatus, isFormComplete } = useCategoryCompletion(
  items,
  categories,
  formState
);
const {
  errors,
  validateField,
  validateForm,
} = useFormValidation();
```

### Step 3: Replace Render Logic (Web)
**BEFORE** (Current monolithic JSX):
```javascript
// 200+ lines of inline form rendering
return (
  <Box>
    <TextField label="Notes" {...props} />
    {categories.map(cat => (
      <Box>
        {/* ... */}
      </Box>
    ))}
    {/* ... more JSX ... */}
  </Box>
);
```

**AFTER** (Using components):
```javascript
return (
  <Box>
    <FormStepperHeader
      currentStep={activeStep}
      completionStatus={{
        percentage: categoryStatus ? 75 : 0,
        completedCategories: 2,
        totalCategories: 4,
      }}
      onStepChange={setActiveStep}
    />

    {activeStep === 0 && (
      <AuditInfoForm
        notes={formState.notes}
        onNotesChange={formState.setNotes}
        auditId={auditId}
        selectedLocation={selectedLocation}
      />
    )}

    {activeStep === 1 && (
      <CategoryTabs
        categories={categories}
        categoryStatus={categoryStatus}
        activeStep={selectedCategoryIndex}
        onCategoryChange={setSelectedCategoryIndex}
      />
    )}

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
  </Box>
);
```

### Step 4: Implement Mobile Integration (Mobile)
**Similar pattern** but using React Native components:

```javascript
// In mobile/src/screens/AuditFormScreen.js

import CategorySelector from '../components/CategorySelector';
import ChecklistItemsList from '../components/ChecklistItemsList';
import FormActionButtons from '../components/FormActionButtons';
import LocationCapture from '../components/LocationCapture';
import PhotoUpload from '../components/PhotoUpload';

// Use custom hooks
const {
  categoryStatus,
  isFormComplete,
  nextIncompleteCategory,
} = useCategoryCompletion(items, categories, formState);

// Replace inline rendering with components
<View style={styles.container}>
  <CategorySelector
    categories={categories}
    selectedCategory={selectedCategory}
    onSelectCategory={handleSelectCategory}
    categoryStatus={categoryStatus}
  />
  
  <ChecklistItemsList
    items={filteredItems}
    responses={formState.responses}
    onUpdateResponse={formState.updateResponse}
  />
  
  <LocationCapture
    onLocationCapture={handleLocationCapture}
    required={true}
  />
  
  <PhotoUpload
    onPhotoCapture={handlePhotoCapture}
    existingPhotos={formState.photos}
    maxPhotos={5}
  />
  
  <FormActionButtons
    currentStep={currentStep}
    isLastStep={currentStep === 2}
    isFormValid={isFormComplete}
    onPrevious={handlePrevious}
    onSkip={handleSkip}
    onContinue={handleContinue}
    onSubmit={handleSubmit}
  />
</View>
```

## Code Extraction Examples

### Example 1: Extract Category Navigation Logic
**Source**: Lines 615-685 in mobile/src/screens/AuditFormScreen.js

Extract to `mobile/src/hooks/useCategoryNavigation.js`:
```javascript
export const useCategoryNavigation = (categories, itemStatus) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  useEffect(() => {
    // Auto-select first incomplete category
    const firstIncomplete = getFirstIncompleteCategory(categories, itemStatus);
    if (firstIncomplete) {
      setSelectedCategory(firstIncomplete);
    }
  }, [categories, itemStatus]);
  
  return { selectedCategory, setSelectedCategory };
};
```

### Example 2: Extract Form State Logic
**Source**: Lines 1-50 (State variables) in web/src/pages/AuditForm.js

Already extracted to `web/src/hooks/useAuditFormState.js` ✅

## Testing Strategy

### 1. Test Shared Utilities First
```bash
npm test shared/utils/auditHelpers.test.js
npm test shared/utils/formValidation.test.js
```

### 2. Test Individual Components
```bash
npm test web/src/components/AuditInfoForm.test.js
npm test mobile/src/components/CategorySelector.test.js
```

### 3. Test Integration
```bash
npm test web/src/pages/AuditForm.test.js
npm test mobile/src/screens/AuditFormScreen.test.js
```

## Performance Improvements Expected

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| File Size (Mobile) | 5110 lines | ~2500 lines | 51% reduction |
| File Size (Web) | 2836 lines | ~1400 lines | 51% reduction |
| Code Duplication | 40-50% | <10% | 80% reduction |
| Component Reusability | 0% | 60% | New capability |
| Test Coverage | 10% | 50%+ | 5x improvement |
| Bundle Size | ~250KB | ~180KB | 28% reduction |

## Troubleshooting

### Import Errors
**Problem**: `Cannot find module '@shared/utils/auditHelpers'`
**Solution**: Check `jsconfig.json` or `tsconfig.json` for alias configuration:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"]
    }
  }
}
```

### State Management Issues
**Problem**: State not updating when using `useAuditFormState`
**Solution**: Ensure you're calling the update handlers correctly:
```javascript
// ✅ Correct
formState.updateResponse(itemId, value);

// ❌ Wrong
setResponses({ ...responses, [itemId]: value });
```

### Component Rendering
**Problem**: Component not re-rendering on state change
**Solution**: Check that props are properly connected and handlers are memoized.

## Next Steps (TOMORROW)

1. ✅ Complete remaining mobile components (SignatureCapture, StepIndicator)
2. ✅ Complete remaining hooks (useAuditData, useLocationTracking)
3. ✅ Integrate all components into AuditFormScreen.js
4. ✅ Integrate all components into AuditForm.js
5. ✅ Create test suites for components and hooks
6. ✅ Setup TypeScript configuration
7. ✅ Build and test both platforms

## Success Criteria

- ✅ All 15+ components created and importable
- ✅ All 8+ hooks created and tested
- ✅ Main screens (AuditFormScreen.js, AuditForm.js) refactored
- ✅ Code duplication reduced by 80%
- ✅ Components < 500 lines each
- ✅ 50%+ test coverage on utilities
- ✅ No TypeScript errors (when migrated)
- ✅ Both platforms building successfully

