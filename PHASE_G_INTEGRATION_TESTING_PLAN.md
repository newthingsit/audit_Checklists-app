# Phase G - Integration Testing Plan
**Status**: 📋 PLANNING  
**Target**: Increase coverage from 30.48% to 50%  
**Estimated Tests**: 200-300 additional tests  
**Timeline**: Next sprint (2-3 weeks)

---

## Executive Summary

Phase G will transition from unit/component testing to **integration testing**, validating complete user workflows across multiple components, screens, and services. This approach targets the remaining 70% of untested code, particularly:

- **Service integrations** (API calls, data flow)
- **Screen navigation flows** (multi-screen workflows)
- **Context state management** (auth, location, network, notifications)
- **Error recovery paths** (offline mode, 500 errors, timeouts)
- **End-to-end workflows** (login → audit → submit)

### Coverage Growth Path
```
Phase F: 30.48% (units/components isolated)
   ↓
Phase G: 40%+ (integration workflows tested)
   ↓
Phase H: 50%+ (e2e & advanced scenarios)
   ↓
Future: 60%+ (full coverage with refactoring)
```

---

## Phase G Scope

### Test Categories

#### 1. **API Integration Tests** (~40-50 tests)
Test actual API interactions without mocking entire responses

**Focus Areas**:
- Apollo Client queries (if used)
- Error response handling (4xx, 5xx)
- Retry logic validation
- Timeout handling
- Rate limiting behavior
- Authentication token refresh
- Request/response validation

**Example Tests**:
```javascript
// Before (Unit Test): Mock axios response
axios.get.mockResolvedValue({ data: mockAudit });

// After (Integration Test): Mock at adapter level, test real request handling
axios.interceptors.response.use(...)
// Verify actual error structure, retry attempts, etc.
```

#### 2. **Context State Flow Tests** (~50-60 tests)
Test state management across provider/consumer boundaries

**Test Areas**:
- **AuthContext**:
  - Login → Token stored → Protected routes accessible
  - Token expiry → Auto-refresh → Transparent to UI
  - Logout → Token cleared → Redirected to login
  
- **LocationContext**:
  - GPS permission request → Location captured → Used in audit
  - Location verification flow (distance check, retry)
  - Offline fallback location handling
  
- **NotificationContext**:
  - Preference changes → Persisted to storage → Applied on app restart
  - Scheduled notifications → Timer triggered → Alert shown
  - Notification cleared → Not shown again
  
- **NetworkContext**:
  - Online → Offline transition → UI responds
  - Offline → Online transition → Queue synced
  - Background app → Network status checked on resume

#### 3. **Multi-Screen Navigation Flows** (~50-70 tests)
Test complete user workflows across multiple screens

**Core Workflows**:
1. **New Audit Creation Flow**:
   - Dashboard → Select Template → Category Selection → Checklist Form → Submit
   - Verify data flows through each step
   - Test back/forward navigation

2. **Audit Edit Flow**:
   - Dashboard → View Audit → Edit → Save
   - Verify existing data loads
   - Test partial edits

3. **Scheduled Audit Flow**:
   - ScheduledAudits → Start Audit → Complete Form → View Result
   - Verify linked audit creation

4. **Authentication Flow**:
   - Login → Dashboard → Tasks → Profile → Logout
   - Test permission-gated screens

5. **Offline Workflow**:
   - Online actions → Go offline → Last data cached → Go online → Sync
   - Verify data consistency

#### 4. **Service Layer Integration Tests** (~40-50 tests)
Test service methods with real-ish data structures

**Services to Test**:
- **ApiService**: Request building, response handling, retry logic
- **BiometricService**: Device detection, fallback handling
- **OfflineStorage**: Data persistence, sync queue management
- **LocationService**: Permission flow, distance calculation
- **NotificationService**: Schedule setup, cancellation
- **SyncManager**: Queued request processing, conflict resolution

#### 5. **Error Recovery Paths** (~30-40 tests)
Test system behavior under adverse conditions

**Scenarios**:
- Network timeout → Retry → Success
- API returns 500 → Backoff → Retry
- User offline → Cache used → Queued for sync
- Location permission denied → Fallback to zip code
- Biometric unavailable → PIN fallback
- Storage corrupted → Reinitialize

#### 6. **Accessibility Integration** (~20-30 tests)
Test a11y across component interactions

**Areas**:
- Tab navigation through multi-screen workflows
- Screen reader announcements for dynamic updates
- Focus management on errors/modals
- Color contrast in different theme modes

---

## Implementation Strategy

### Phase G Structure (3 weeks)

#### Week 1: API & Context Integration
```
Day 1-2: API Integration Test Suite
  - Set up test infrastructure for service mocking
  - Create reusable fixtures for common API responses
  - Test error handling paths

Day 3-4: Context State Tests
  - AuthContext flow tests
  - LocationContext flow tests
  - Implement shared context test helpers

Day 5: Review + Merge
  - Verify 40+ tests, 95%+ pass rate
  - Update coverage metrics
```

#### Week 2: Navigation & Workflows
```
Day 1-2: Navigation Flow Tests
  - Test core user workflows (5 major flows)
  - Create screen navigation helpers
  - Test with various starting states

Day 3-4: Service Layer Tests
  - ApiService integration tests
  - Background service tests (sync, notifications)
  - Auth token refresh tests

Day 5: Review + Merge
  - Verify 60+ tests, 95%+ pass rate
```

#### Week 3: Error Handling & Polish
```
Day 1-2: Error Recovery Tests
  - Network error scenarios
  - Storage failures
  - Permission denials
  
Day 2-3: Accessibility Tests
  - Integration a11y tests
  - Theme switching tests
  - Dynamic content updates

Day 4-5: Documentation + Refinement
  - Phase G summary
  - Coverage report
  - Identified gaps for Phase H
```

### Test File Organization

```
mobile/__tests__/
├── integration/                      # NEW: Integration tests
│   ├── flows/
│   │   ├── AuditCreationFlow.test.js
│   │   ├── AuditEditFlow.test.js
│   │   ├── AuthenticationFlow.test.js
│   │   ├── OfflineFlow.test.js
│   │   └── ScheduledAuditFlow.test.js
│   ├── services/
│   │   ├── ApiIntegration.test.js
│   │   ├── SyncManager.test.js
│   │   ├── LocationService.test.js
│   │   └── NotificationService.test.js
│   └── contexts/
│       ├── AuthContext.integration.test.js
│       ├── LocationContext.integration.test.js
│       ├── NetworkContext.integration.test.js
│       └── NotificationContext.integration.test.js
├── screens/                         # Existing: Unit tests
├── services/                        # Existing: Unit tests
├── components/                      # Existing: Unit tests
└── utils/                          # Existing: Unit tests
```

---

## Example: API Integration Test

### Current Approach (Unit Test)
```javascript
// Phase F: Mock entire response
axios.get.mockResolvedValue({ 
  data: { audits: mockAudits } 
});
```

### Phase G Approach (Integration Test)
```javascript
describe('ApiService Integration - Audit Fetching', () => {
  let mockAdapter;
  
  beforeEach(() => {
    // Mock at HTTP adapter level, not response level
    mockAdapter = new AxiosHttpAdapter({
      baseURL: API_BASE_URL,
      timeout: 5000,
    });
  });

  it('should retry on network timeout', async () => {
    let attempts = 0;
    mockAdapter.onGet('/audits').reply(() => {
      attempts++;
      if (attempts < 3) {
        // Simulate timeout
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('timeout')), 50);
        });
      }
      return [200, { audits: mockAudits }];
    });

    const result = await fetchAuditsWithRetry();
    
    expect(attempts).toBe(3); // 2 failures, 1 success
    expect(result).toEqual(mockAudits);
  });

  it('should handle 500 server error with backoff', async () => {
    mockAdapter.onGet('/audits')
      .replyOnce(500, { error: 'Server error' })
      .replyOnce(500, { error: 'Server error' })
      .replyOnce(200, { audits: mockAudits });

    const result = await fetchAuditsWithBackoff();
    
    expect(result).toEqual(mockAudits);
    // Verify exponential backoff timing
  });

  it('should refresh token on 401 unauthorized', async () => {
    let tokenRefreshCalled = false;
    mockAdapter.onGet('/audits')
      .replyOnce(401, { error: 'Unauthorized' })
      .reply(() => {
        if (!tokenRefreshCalled) {
          tokenRefreshCalled = true;
          // Simulate token refresh
          updateAuthToken('new-token-123');
          throw new Error('Retry after token refresh');
        }
        return [200, { audits: mockAudits }];
      });

    const result = await fetchAuditsWithAuth();
    
    expect(tokenRefreshCalled).toBe(true);
    expect(result).toEqual(mockAudits);
  });
});
```

---

## Example: Navigation Flow Test

```javascript
describe('Audit Creation Flow Integration', () => {
  it('should complete entire new audit creation workflow', async () => {
    const { findByText, fireEvent, waitFor } = render(
      <NavigationContainer>
        <AppStack initialRouteName="CategorySelection" />
      </NavigationContainer>
    );

    // Step 1: Dashboard → Select Template
    expect(await findByText('Select Template')).toBeTruthy();
    const safetyTemplate = await findByText('Safety Audit');
    fireEvent.press(safetyTemplate);

    // Step 2: Navigate to Category Selection
    await waitFor(() => {
      expect(findByText('Select Category')).toBeTruthy();
    });
    const categoryButton = await findByText('Fire Safety');
    fireEvent.press(categoryButton);

    // Step 3: Navigate to Checklist Form
    await waitFor(() => {
      expect(findByText('Check fire extinguisher')).toBeTruthy();
    });
    const checkBox = screen.getByTestId('item-1-yes');
    fireEvent.press(checkBox);

    // Step 4: Fill form and submit
    const submitButton = await findByText('Complete Audit');
    fireEvent.press(submitButton);

    // Step 5: Verify navigation to dashboard
    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Dashboard');
    });

    // Verify audit was created
    expect(mockApiCall).toHaveBeenCalledWith('/audits', 
      expect.objectContaining({
        template_id: 1,
        category: 'Fire Safety',
        status: 'completed'
      })
    );
  });
});
```

---

## Success Criteria

### Coverage Targets
- **Overall Coverage**: 40%+ (from 30.48%)
- **Services**: 60%+ (from 49%)
- **Screens**: 35%+ (from 22%)
- **Integration Classes**: 70%+

### Test Quality
- **Pass Rate**: 98%+ across all test suites
- **Flakiness**: <1% (no intermittent failures)
- **Execution Time**: <120 seconds full suite
- **Maintainability**: Helper functions reusable, clear test names

### Documentation
- Setup guide for new integration tests
- Common patterns document
- Mock strategy for Phase H

---

## Dependencies & Setup

### New Testing Libraries
- `@react-navigation/native@6.0+` - Already have
- `axios-mock-adapter@1.21+` - For HTTP-level mocking
- `nock@13+` - For network request mocking
- `jest-localstorage-mock` - For AsyncStorage testing

### Test Infrastructure
```javascript
// __tests__/integration/helpers/setupIntegration.js
export const setupApiMocks = () => {
  // Configure axios interceptors
  // Setup storage mocks
  // Configure network mocks
};

export const createMockNavigation = () => {
  // Reusable navigation mock for flows
};

export const mockContextProviders = () => {
  // Render with all necessary contexts
};
```

### CI/CD Integration
- Add integration test step to mobile-ci.yml
- Separate coverage reporting for integration vs unit tests
- Slack notifications for test failures

---

## Known Challenges & Mitigations

### Challenge 1: Test Flakiness
**Issue**: Integration tests can be flaky (timing issues, async operations)  
**Mitigation**:
- Use `waitFor` with explicit conditions, not timeouts
- Mock time with `jest.useFakeTimers()` where appropriate
- Run tests multiple times in CI to catch flakiness

### Challenge 2: Mock Maintenance
**Issue**: Mocks can diverge from actual API  
**Mitigation**:
- Generate mocks from OpenAPI/Swagger spec
- Schedule quarterly mock updates
- Run smoke tests against staging API

### Challenge 3: Performance
**Issue**: Integration tests run slower than unit tests  
**Mitigation**:
- Parallelize test execution
- Cache heavy computations
- Use test matrix for different scenarios

### Challenge 4: State Leakage
**Issue**: Tests can affect each other through shared state  
**Mitigation**:
- Reset all mocks, storage, context in beforeEach
- Use unique test IDs for data
- Isolate each test flow

---

## Recommended Approach: Start with High-Value Flows

Rather than testing everything, prioritize:

### Tier 1: Critical User Paths (Week 1-2)
1. ✅ **Complete Audit Creation** (new checklist → submit)
2. ✅ **Audit Editing** (open existing → modify → save)
3. ✅ **Authentication** (login → token management → logout)
4. ✅ **Offline to Online** (offline mode → sync → verify)

### Tier 2: Service Integration (Week 2-3)
5. **API Retry Logic** (timeout → retry → success)
6. **Location Services** (permission → capture → use)
7. **Notification Flow** (schedule → trigger → display)

### Tier 3: Error Scenarios (Week 3+)
8. **Network Errors** (4xx, 5xx, timeout handling)
9. **Permission Edge Cases** (denied, missing)
10. **Data Conflicts** (offline edits clash with remote)

---

## Post-Phase G: Phase H Planning

**Phase H: End-to-End Testing** (~200+ tests)
- Real device testing (Expo Go)
- Camera/file picker interactions
- Push notification delivery
- Biometric authentication
- Background tasks

**Target**: 50%+ coverage with production-like scenarios

---

## Deliverables

### End of Phase G
✅ Integration test suite (200-300 tests)  
✅ Coverage report (30.48% → 40%+)  
✅ Integration test helpers library  
✅ Phase G summary document  
✅ Phase H recommendations  

### Success Indicators
- GitHub PR with integration tests
- Coverage badge updated to 40%+
- CI/CD pipeline passing with new tests
- Team able to write new integration tests independently

---

## Next Steps

1. **Review & Approve** this plan
2. **Setup Integration Test Infrastructure** (day 1)
3. **Create High-Value Flow Tests** (week 1-2)
4. **Expand Service Integration Tests** (week 2-3)
5. **Document & Deliver** (week 3)

---

**Prepared by**: GitHub Copilot  
**Status**: 📋 Ready for Review  
**Recommended Start**: Next Sprint  
**Estimated Effort**: 2-3 weeks, 1-2 developers  
**Expected ROI**: +10% coverage, production-grade confidence  
