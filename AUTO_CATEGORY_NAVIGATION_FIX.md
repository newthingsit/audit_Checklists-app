# Auto Category Navigation Fix

## Problem
After completing all items in one category, the app was not automatically moving to the next category. Users had to manually tap on the next category tab to continue the audit, which interrupted their workflow.

## Solution
Implemented automatic navigation to the next category when all items in the current category are completed.

## Changes Made

### File: `mobile/src/screens/AuditFormScreen.js`

#### 1. Added `moveToNextCategory` Function
- New helper function that automatically navigates to the next category when the current one is complete
- Includes a 300ms delay for smooth UI transition
- Scrolls to top of the new category for better user experience

```javascript
const moveToNextCategory = useCallback((currentCategory) => {
  const currentIndex = categories.indexOf(currentCategory);
  if (currentIndex >= 0 && currentIndex < categories.length - 1) {
    const nextCategory = categories[currentIndex + 1];
    setTimeout(() => {
      setSelectedCategory(nextCategory);
      if (typeof window !== 'undefined') {
        window.scrollTo?.({ top: 0, behavior: 'smooth' });
      }
    }, 300);
  }
}, [categories]);
```

#### 2. Updated `handleResponseChange`
- Now checks if category is complete after each response
- Auto-navigates to next category when current category is fully completed
- Added `moveToNextCategory` to dependencies

#### 3. Updated `handleOptionChange`
- Same logic as `handleResponseChange`
- Triggers auto-navigation when selecting options completes a category

#### 4. Updated `handlePhotoUpload`
- Now marks items as completed when photos are uploaded
- Recalculates category completion status
- Triggers auto-navigation when photo upload completes a category
- Updated callback dependencies

## User Experience Improvements

### Before
- User completes all items in "TECHNOLOGY" category (e.g., 9/9 items)
- App stays on "TECHNOLOGY" category
- User must manually tap on "HYGIENE: FOH" tab to continue
- This breaks the audit flow

### After
- User completes all items in "TECHNOLOGY" category (e.g., 9/9 items)
- App automatically navigates to "HYGIENE: FOH" category after 300ms
- User can immediately continue with the next category
- Smooth transition with scroll to top
- Natural workflow without manual tab switching

## Testing Recommendations

1. **Single Category Completion**
   - Complete all items in first category (e.g., SPEED OF SERVICE - 4 items)
   - Verify auto-navigation to next category (e.g., ACCURACY)

2. **Multiple Categories**
   - Test with all category types:
     - TECHNOLOGY (9 items)
     - SERVICE (3 items)
     - HYGIENE: FOH (23 items)
     - ACCURACY (20 items)
     - CLEANING SYSTEM (9 items)

3. **Different Response Types**
   - Test with Yes/No/NA responses
   - Test with photo uploads
   - Test with text inputs
   - Test with option selections

4. **Edge Cases**
   - Last category completion (should not navigate further)
   - Partial completion (should not trigger navigation)
   - Going back to previous category (should allow manual navigation)

## Technical Notes

- Navigation only triggers when:
  - All items in current category are completed
  - User is currently viewing that category
  - There is a next category available
  
- Navigation does NOT trigger if:
  - Only some items are completed
  - User has manually switched to a different category
  - Current category is the last one

## Deployment

No additional dependencies or configuration changes required. The fix is contained within the existing `AuditFormScreen.js` file.

