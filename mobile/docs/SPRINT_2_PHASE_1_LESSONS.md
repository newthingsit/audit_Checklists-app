# Sprint 2 Phase 1: Context Testing Lessons Learned

**Date**: February 18, 2026  
**Status**: Attempted - Needs Different Approach  
**Duration**: ~3 hours of development and debugging

## Attempted Work

Created comprehensive test suites for three critical context files:

### 1. LocationContext Tests (28 tests created)
- **Coverage Goals**: Location permissions, GPS tracking, verification, audit location capture
- **Test Areas**: Initialization, permissions, location retrieval, watching, verification, maps, settings
- **Complexity**: Medium-High (platform-specific behavior, GPS hardware mocking)

### 2. NotificationContext Tests (26 tests created)
- **Coverage Goals**: Push notifications, scheduling, preferences, badge management  
- **Test Areas**: Initialization, handlers, preferences, scheduling, sending, canceling, badges
- **Complexity**: Medium (service initialization, async handlers)

### 3. OfflineContext Tests (34 tests created)
- **Coverage Goals**: Offline-first architecture, sync management, auto-sync triggers
- **Test Areas**: Stats loading, 10 sync event types, auto-sync, manual sync, cache operations
- **Complexity**: High (complex state machine, event-driven, cross-context dependencies)

**Total**: 88 tests created, ~1,200 lines of test code

## Issues Encountered

### 1. **Async Timing Issues** (Primary Blocker)
- **Problem**: React hooks (`useEffect`) not completing before test assertions
- **Symptoms**: 
  - `expect(mock).toHaveBeenCalled()` failing with 0 calls when hooks haven't run yet
  - State not updating in time for assertions
  - Event listeners not being registered before tests try to trigger them
- **Root Cause**: Jest renderHook with React Test Renderer has complex async behavior that requires precise `waitFor` timing
- **Impact**: ~40% of tests failing due to timing

### 2. **Mock Complexity** (Secondary Issue)
- **Problem**: Multiple layers of mocking (services, contexts, React Native modules) creating brittle tests
- **Examples**:
  - AppState addEventListener requiring complex spy setup
  - NetworkContext useNetwork mock needing to be updated between tests
  - Service mocks (offlineStorage, syncManager) with event emitters
- **Impact**: Tests became fragile and hard to maintain

### 3. **Expo Module Resolution** (Dependency Issue)
- **Problem**: NotificationContext imports expo-device which requires native module setup
- **Error**: `Cannot find module './sweet/setUpJsLogger.fx'`
- **Impact**: Entire NotificationContext test suite failed to load

### 4. **Test Isolation Challenges**
- **Problem**: Context providers wrapping hooks making it hard to test in isolation
- **Symptoms**: Tests affecting each other through shared mock state
- **Impact**: Flaky tests, order-dependent failures

## Why This Approach Failed

### 1. **Too Much Integration at Once**
- Tried to test contexts WITH their dependencies (NetworkContext, offlineStorage, syncManager)
- Should have tested contexts in isolation first, then integration separately

### 2. **Complex Async Behavior**
- React hooks + async service calls + event emitters = timing complexity
- Jest's async utilities (`waitFor`, `act`) require expert-level understanding

### 3. **Mocking Strategy Too Brittle**
- Created complex mock implementations that mirror production code
- Should have used simpler mocks and tested smaller units

### 4. **Test-Driven Development in Reverse**
- Wrote all tests at once without iterating on simple cases first
- Should have started with 5-10 simple passing tests, then expanded

## Coverage Impact

| Metric | Before | After Cleanup | Change |
|--------|--------|---------------|--------|
| Total Tests | 161 | 161 | ±0 |
| Passing Tests | 161 | 161 | ±0 |
| Coverage (Lines) | 7.13% | 7.13% | ±0% |
| Time Spent | - | ~3 hours | - |

**Result**: No coverage improvement, significant time investment

## Recommendations for Sprint 2 Revision

### Immediate Actions (Next 1-2 Days)

#### 1. **Focus on Utilities First** (Easiest Wins)
Target files with minimal dependencies:
- `requestThrottle.js` - 23% → 80% coverage (Est: 15 tests, 1 hour)
- `dateHelpers.js` - Not yet tested (Est: 20 tests, 1.5 hours)
- `formatters.js` - Not yet tested (Est: 15 tests, 1 hour)

**Expected Gain**: +5-7 percentage points coverage

#### 2. **Expand API Config Coverage** (Medium Difficulty)
- `api.js` - 19% → 70% coverage
- Focus on: `setApiUrl`, `getApiUrl`, error handling, environment switching
- **Avoid**: Complex interceptor logic, network calls

**Expected Gain**: +3-4 percentage points coverage

#### 3. **Simple Service Tests** (Higher Value)
Instead of full context integration, test service methods in isolation:

**ApiService.js** (45% → 65%):
- Test cache key generation separately
- Test cache expiration logic
- Test request deduplication
- Avoid testing interceptors

**LocationService.js**:
- Test coordinate formatting
- Test distance calculation  
- Test settings persistence
- Avoid GPS hardware interactions

**Expected Gain**: +6-8 percentage points coverage

### Medium-term Strategy (1-2 Weeks)

#### 4. **Component Prop Testing** (Quick Wins)
Test component logic without rendering:
- ChecklistItem: Status calculations, badge logic
- AuditCard: Date formatting, status display
- PhotoThumbnail: Image URI handling

**Expected Gain**: +4-6 percentage points coverage

#### 5. **Screen Business Logic** (High Impact)
Extract and test business logic from screens:
- LoginScreen: Validation functions
- AuditFormScreen: Form validation helpers
- ChecklistsScreen: Filter/sort functions

**Expected Gain**: +8-12 percentage points coverage

### Coverage Milestone Path

| Phase | Target | Strategy | Est. Time |
|-------|--------|----------|-----------|
| Current | 7.13% | - | - |
| Phase A | 15% | Utilities + API Config | 3-4 hours |
| Phase B | 25% | Service methods + Components | 1 week |
| Phase C | 40% | Screen logic + More services | 1.5 weeks |
| Phase D | 50% | Integration tests (careful!) | 2 weeks |

**Total Estimated**: 4-5 weeks to 50% coverage with revised approach

## Key Lessons

### ✅ What Worked Well
1. **Test structure and organization** - Clear describe blocks, good test names
2. **Comprehensive coverage intent** - Thought through all scenarios
3. **Mock setup patterns** - BeforeEach setup was clean
4. **Documentation** - Good inline comments explaining test goals

### ❌ What Didn't Work
1. **Trying to test everything at once** - Too ambitious
2. **Complex integration testing early** - Should build foundation first
3. **Not iterating on simple cases** - Wrote all tests without validation
4. **Underestimating async complexity** - React hooks + Jest is tricky

### 📚 Technical Insights

#### Testing React Context is Hard Because:
1. Contexts have dependencies on other contexts (NetworkContext → OfflineContext)
2. useEffect hooks run asynchronously after render
3. Service mocks need to match exact call signatures
4. Event listeners require careful lifecycle management
5. React Test Renderer has different timing than actual app

#### Better Approach:
1. Test pure functions first (utilities, helpers, formatters)
2. Test service methods in isolation (mock minimal dependencies)
3. Test components with simple props (avoid context providers)
4. Test business logic extracted from screens
5. Save context integration tests for last (when you understand patterns)

## Alternative Approaches to Consider

### Option 1: Snapshot Testing (Quick Coverage Boost)
- Add snapshot tests for components
- Easy to write, catches regressions
- Doesn't test logic deeply but improves coverage metrics
- **Estimated**: +10-15 percentage points in 1-2 days

### Option 2: E2E Testing Instead
- Skip unit tests for contexts
- Focus on E2E tests with Detox (Sprint 2 Task 3)
- Tests real user flows, catches integration issues
- May satisfy coverage goals differently

### Option 3: TypeScript + Type Tests
- Introduce TypeScript (Sprint 2 Task 6)
- Type definitions provide compile-time "tests"  
- Reduces need for some unit tests
- Improves code quality simultaneously

## Next Immediate Steps

### Recommended: Focus on Quick Wins (Today)

1. **Create requestThrottle.test.js** (~1 hour)
   - Simple utility, no dependencies
   - Clear success criteria
   - Builds confidence

2. **Expand api.test.js** (~1 hour)
   - Already at 19%, push to 50%
   - Test config functions
   - Avoid complex logic

3. **Create dateHelpers.test.js** (~1 hour)
   - Date formatting and parsing
   - No async, no mocks
   - High-value business logic

**Goal for Today**: +3-5 percentage points coverage, 100% passing tests

### This Week: Build Momentum

4. **Service method tests** (Days 2-3)
   - LocationService utilities
   - OfflineStorage helpers
   - Avoid complex integration

5. **Component prop tests** (Days 4-5)
   - ErrorBoundary is already at 92%, replicate that success
   - Simple components first

**Goal for Week**: 15-20% coverage, solid foundation

## Conclusion

The context testing attempt was valuable for:
- ✅ Learning what doesn't work well in Jest
- ✅ Understanding testing complexity levels
- ✅ Identifying simpler paths forward
- ✅ Creating reusable test patterns (even if tests failed)

The revised strategy focuses on:
- ✅ Quick wins to build momentum
- ✅ Simple tests before complex ones
- ✅ Isolated units before integration
- ✅ Pragmatic coverage growth

**Sprint 2 is still achievable** - we just need to adjust our approach to focus on what works well in Jest and build complexity gradually.

---

**Status**: Back to baseline (161 tests, 7.13% coverage)  
**Next Action**: Start with requestThrottle.test.js  
**Updated Timeline**: 4-5 weeks to 50% coverage (was 2-3 weeks)  
**Confidence**: High (with revised approach)
