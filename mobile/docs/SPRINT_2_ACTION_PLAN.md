# Sprint 2 Immediate Action Plan
**Date**: February 18, 2026  
**Current Status**: 161 tests passing, 7.13% coverage  
**Next Target**: 15% coverage (Phase A complete)  
**Estimated Time**: 3-4 hours

## 🎯 Today's Goals (Phase A Start)

### 1. requestThrottle.test.js (1 hour) ⏱️
**Priority**: HIGHEST - Quick win, builds confidence

**File to Test**: `mobile/src/utils/requestThrottle.js`  
**Current Coverage**: 23%  
**Target Coverage**: 80%+  
**Estimated Tests**: 15 tests

**Test Scenarios**:
```javascript
describe('requestThrottle', () => {
  describe('Basic Throttling', () => {
    it('should execute immediately on first call')
    it('should throttle rapid successive calls')
    it('should execute after wait period')
    it('should return last call\'s arguments')
  })
  
  describe('Multiple Throttled Functions', () => {
    it('should handle multiple throttled functions independently')
    it('should not interfere with other throttled functions')
  })
  
  describe('Edge Cases', () => {
    it('should handle null/undefined callbacks')
    it('should handle different wait times')
    it('should handle immediate option')
    it('should handle trailing option')
  })
  
  describe('Cleanup', () => {
    it('should clear pending throttled call')
    it('should not execute after cancel')
  })
})
```

**Success Criteria**:
- ✅ All tests passing
- ✅ Coverage >80%
- ✅ No async timing issues (simple utility)
- ✅ Builds confidence for next tests

---

### 2. dateHelpers.test.js (1.5 hours) ⏱️
**Priority**: HIGH - High-value business logic

**File to Test**: `mobile/src/utils/dateHelpers.js` (create if doesn't exist)  
**Current Coverage**: 0%  
**Target Coverage**: 80%+  
**Estimated Tests**: 20 tests

**Test Scenarios**:
```javascript
describe('dateHelpers', () => {
  describe('formatDate', () => {
    it('should format date to ISO string')
    it('should format with custom pattern')
    it('should handle invalid dates')
    it('should handle null/undefined')
  })
  
  describe('parseDate', () => {
    it('should parse ISO string')
    it('should parse custom formats')
    it('should return null for invalid')
  })
  
  describe('getRelativeTime', () => {
    it('should return "just now" for recent')
    it('should return "X minutes ago"')
    it('should return "X hours ago"')
    it('should return "X days ago"')
  })
  
  describe('isOverdue', () => {
    it('should detect overdue dates')
    it('should handle future dates')
    it('should handle null dates')
  })
  
  describe('addDays/subtractDays', () => {
    it('should add days correctly')
    it('should subtract days correctly')
    it('should handle edge of month')
  })
})
```

**Success Criteria**:
- ✅ All date operations tested
- ✅ Edge cases covered
- ✅ Pure functions, no mocks needed
- ✅ High business value

---

### 3. api.test.js Expansion (1 hour) ⏱️
**Priority**: MEDIUM - Expand existing coverage

**File to Test**: `mobile/src/config/api.js`  
**Current Coverage**: 19%  
**Target Coverage**: 70%+  
**Existing Tests**: Some  
**Additional Tests**: ~20 tests

**Test Scenarios** (Add to existing):
```javascript
describe('API Configuration (Expanded)', () => {
  describe('setApiUrl', () => {
    it('should update API URL')
    it('should validate URL format')
    it('should trigger event listeners')
    it('should persist to storage')
  })
  
  describe('getApiUrl', () => {
    it('should return current URL')
    it('should fall back to default')
  })
  
  describe('getFullUrl', () => {
    it('should construct full URL with path')
    it('should handle leading slashes')
    it('should handle query params')
  })
  
  describe('Error Handling', () => {
    it('should handle storage errors')
    it('should handle invalid URLs')
    it('should log errors appropriately')
  })
  
  describe('Environment Detection', () => {
    it('should detect development mode')
    it('should use correct default URLs')
  })
})
```

**Success Criteria**:
- ✅ Core config functions tested
- ✅ Avoid axios interceptor complexity
- ✅ Focus on pure config logic
- ✅ 70%+ coverage

---

## 📊 Expected Outcomes

### After Phase A Completion (3-4 hours):

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Total Tests | 161 | ~200-210 | +40-50 tests |
| Coverage | 7.13% | ~15% | +7-8 percentage points |
| Test Execution | 11.6s | ~15s | +3-4s |
| 100% Coverage Files | 5 | 7-8 | +2-3 files |

### Files at High Coverage:
1. NetworkContext.js - 100% ✅
2. auditHelpers.js - 100% ✅
3. permissions.js - 100% ✅
4. **requestThrottle.js - 80%+** 🆕
5. **dateHelpers.js - 80%+** 🆕
6. api.js - 70%+ ⬆️

---

## ✅ How to Execute This Plan

### Step 1: Create requestThrottle.test.js
```bash
cd mobile/__tests__/utils
# Create requestThrottle.test.js
# Run: npm test -- requestThrottle
# Fix any issues, iterate until 100% passing
```

### Step 2: Create dateHelpers.test.js
```bash
# Check if dateHelpers.js exists, if not create it
# Create dateHelpers.test.js  
# Run: npm test -- dateHelpers
# Fix any issues, iterate until 100% passing
```

### Step 3: Expand api.test.js
```bash
cd mobile/__tests__/config
# Add more tests to existing api.test.js
# Run: npm test -- api
# Fix any issues, iterate until 100% passing
```

### Step 4: Verify Overall Coverage
```bash
cd mobile
npm test
# Confirm: 15% coverage, all tests passing
```

### Step 5: Commit & Document
```bash
git add .
git commit -m "feat(mobile): Phase A testing complete - Utils & Config at 15% coverage

- Add requestThrottle tests (80% coverage)
- Add dateHelpers tests (80% coverage)  
- Expand api.js tests (70% coverage)
- Total: +40-50 tests, 7.13% → 15% coverage

Sprint 2 Progress: Phase A Complete ✅"
```

---

## 🎯 Success Criteria for "Continue"

Before saying "continue" again, verify:
1. ✅ All new tests passing (0 failures)
2. ✅ Coverage improved to 15%+
3. ✅ CI/CD pipeline passing
4. ✅ No regression in existing tests
5. ✅ Code quality maintained (linting passing)

Ready to proceed to ** Phase B** (Services & Components) after Phase A success!

---

## 🚨 If Blocked

**If a test file is too complex**:
- Start with 5 simplest tests
- Get those passing
- Add complexity gradually
- Document what works

**If coverage isn't improving**:
- Check file paths in jest coverage config
- Ensure tests are importing correct files
- Run coverage with `--verbose` flag

**If async issues arise**:
- Keep tests synchronous (skip complex async)
- Use simple mocks
- Test pure functions only
- Defer complex integration tests

---

## 📚 Reference Documentation

- [Sprint 2 Testing Progress](./SPRINT_2_TESTING_PROGRESS.md)
- [Phase 1 Lessons Learned](./SPRINT_2_PHASE_1_LESSONS.md)
- [Sprint 1 Completion Summary](./SPRINT_1_COMPLETION.md)

---

**Ready to Start**: Begin with requestThrottle.test.js now! 🚀
