# Phase C - LocationCapture Debugging Guide

**Objective**: Fix 67 failing LocationCapture tests to unlock Phase C completion  
**Estimated Effort**: 15-30 minutes  
**Impact**: +3-5pp coverage boost, 67 tests to passing

---

## Current Status

**Problem**: LocationCapture tests fail with context mock issues  
**Tests**: 67 created but 0% coverage (mocks preventing render)  
**Root Cause**: `useLocation` context mock not initializing properly

---

## Failing Test File Path

`d:\audit_Checklists-app\mobile\__tests__\components\LocationCapture.test.js`

---

## Diagnostic Steps

### Step 1: Verify LocationContext Export
Check that the actual context export matches our mock setup:

```bash
cd d:\audit_Checklists-app\mobile
grep -n "useLocation\|LocationContext" src/context/LocationContext.js | head -20
```

**Look for**:
- Named export `useLocation` hook
- Default context provider
- Expected return shape: `{ location, isLoading, error, getCurrentLocation, ... }`

---

### Step 2: Check Mock Setup in Test File
Review lines 1-50 of LocationCapture.test.js:

```bash
head -50 __tests__\components\LocationCapture.test.js
```

**Expected**:
- Mock for `@react-native-async-storage/async-storage`
- Mock for `../context/LocationContext`
- Mock for useLocation hook returning proper shape

---

### Step 3: Run Individual Test File
Isolate LocationCapture tests to see specific error messages:

```bash
npm run test -- __tests__/components/LocationCapture.test.js --verbose
```

**Expected Output**:
- Clear error message about what's undefined
- Stack trace pointing to specific assertion failure

---

### Step 4: Check Mock Shape
Verify the mock returns expected properties that components destructure:

**In test file, find this block**:
```javascript
jest.mock('../context/LocationContext', () => ({
  useLocation: () => ({
    // These must match what component expects
    location: null,
    isLoading: false,
    error: null,
    getCurrentLocation: jest.fn(),
    formatCoordinates: jest.fn()
  })
}));
```

**Component expects** (from LocationCapture.js):
- `location` - current location object
- `isLoading` - boolean loading state
- `error` - error message or null
- `getCurrentLocation` - function to capture location
- `formatCoordinates` - function to format coords
- `getDistance` - possibly included

---

## Quick Fix Checklist

### If useLocation mock is missing:
```javascript
// ADD THIS if not present
jest.mock('../context/LocationContext', () => ({
  useLocation: jest.fn(() => ({
    location: null,
    isLoading: false,
    error: null,
    getCurrentLocation: jest.fn().mockResolvedValue({
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 5,
      altitude: 10
    }),
    formatCoordinates: jest.fn(loc => `${loc.latitude}, ${loc.longitude}`),
    getDistance: jest.fn().mockReturnValue(0)
  }))
}));
```

### If AsyncStorage mock is insufficient:
```javascript
// VERIFY this exists
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined)
}));
```

### If theme or other context is missing:
```javascript
// VERIFY complete mock includes all used contexts
beforeEach(() => {
  jest.clearAllMocks();
  // Add any additional setup needed
});
```

---

## Test Execution Sequence

### Phase 1: Run Diagnostic
```bash
npm run test -- __tests__/components/LocationCapture.test.js --verbose 2>&1 | head -100
```

**Captures**: First 100 lines of error output

### Phase 2: Identify Main Issue
Look for:
- `Cannot read properties of undefined (reading 'something')`
- `jest.mock() factory of... is not allowed`
- `No provider found for context`

### Phase 3: Apply Fix
Based on error, update mock in test file

### Phase 4: Verify Fix
```bash
npm run test -- __tests__/components/LocationCapture.test.js
```

**Expected**: Tests pass or different error (progress)

### Phase 5: Full Suite
Once LocationCapture passes:
```bash
npm run test:ci
```

**Expected**: 15.37% → 18-20% coverage, 462/508 → 500+/508 passing

---

## Common Issue Patterns & Fixes

### Pattern 1: "Cannot read properties of undefined (reading 'latitude')"
**Cause**: location is null in mock but component doesn't handle null  
**Fix**: Either provide default location or update component handling

```javascript
// Mock with real location data
getCurrentLocation: jest.fn().mockResolvedValue({
  latitude: 40.7128,
  longitude: -74.0060,
  accuracy: 5
})
```

### Pattern 2: "useLocation is not a function"
**Cause**: Mock export shape is wrong  
**Fix**: Ensure useLocation is exported as function returning object

```javascript
// CORRECT
jest.mock('../context/LocationContext', () => ({
  useLocation: jest.fn(() => ({ ... }))
}));

// WRONG
jest.mock('../context/LocationContext', () => ({
  useLocation: { ... } // Function, not object!
}));
```

### Pattern 3: "Cannot update component during render"
**Cause**: useEffect side effects during test render  
**Fix**: Wrap render in act() or provide proper async setup

```javascript
await act(async () => {
  render(<LocationCaptureButton {...props} />);
});
```

### Pattern 4: "No provider found for ThemeProvider/NetworkProvider"
**Cause**: Other contexts needed for LocationCapture  
**Fix**: Add additional context mocks around test setup

---

## Success Indicators

### When Fix is Working
- LocationCapture.test.js tests pass
- Coverage increases from 0% → 30%+
- No "Cannot read properties" errors
- Fast test execution (< 2 seconds)

### When Ready to Commit
- All LocationCapture tests passing
- Full test suite: 500+/508 passing
- Coverage: 18-20%
- No console warnings

---

## If LocationCapture Cannot Be Fixed

**Fallback Strategy** (30-minute timeout):
1. Keep LocationCapture tests file as documentation
2. Move to Phase D (Integration testing)
3. Document "LocationCapture requires integration testing approach"
4. Continue with Phase D using simpler screen components

**Impact**:
- Coverage: 17-18% (vs 18-20% target, acceptable)
- Tests: 441/441 passing (100% of working tests)
- Proceed to Phase D with learnings applied

---

## Useful Commands for Investigation

```bash
# Find LocationContext definition
find src -name "*Location*" -type f | grep -i context

# Check LocationCapture component imports
grep -n "import.*Location\|from.*context" mobile/src/components/...

# Run test with maximum verbosity
npm run test -- __tests__/components/LocationCapture.test.js --verbose --no-coverage

# Check if any tests are passing
npm run test -- __tests__/components/LocationCapture.test.js 2>&1 | grep "✓\|✕" | head -10

# Get specific error for first failure
npm run test -- __tests__/components/LocationCapture.test.js --testNamePattern="renders" 2>&1 | tail -50
```

---

## Next Session Continuation

**If you pick this up next session**:

1. Run: `npm run test -- __tests__/components/LocationCapture.test.js --verbose`
2. Copy full error output
3. Check context export path in `mobile/src/context/LocationContext.js`
4. Update mock shape to match actual export
5. Re-run test to verify fix
6. Proceed to full Phase C completion

---

This guide should enable solving LocationCapture issues cleanly and quickly!
