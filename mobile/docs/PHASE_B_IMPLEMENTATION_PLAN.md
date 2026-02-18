# Phase B Implementation Plan - Services Testing

**Goal**: Increase coverage from 7.86% to 15%+ by comprehensively testing all services  
**Timeline**: 1.5-2 weeks  
**Target Tests**: 100-150 new tests  

## Phase B Structure

### 1. ApiService.integration.test.js (EXPAND)
**Current**: 21 tests, 45.3% coverage  
**Target**: 60-80 new tests, 70%+ coverage  

**What to Add**:
- ✅ Caching mechanism (already has some)
- ✅ Request deduplication (already has some)
- 🔴 Error handling (401, 403, 429, 500, etc.)
- 🔴 Token refresh logic
- 🔴 Retry mechanism with backoff
- 🔴 Correlation ID generation
- 🔴 Cache persistence to AsyncStorage
- 🔴 Each HTTP method (GET, POST, PUT, DELETE)
- 🔴 Auth event listener
- 🔴 Sentry error capture integration

**Complexity**: High (async, promises, mocks)

### 2. LocationService.js Tests (NEW)
**Current**: 0% coverage  
**Target**: 40-50 new tests, 60%+ coverage  

**Key Functions**:
- Location tracking (background, foreground)
- Permission handling
- Accuracy tracking
- Battery optimization
- Error recovery

**Complexity**: Medium-High (native modules, permissions)

### 3. BiometricService.js Tests (NEW)
**Current**: 0% coverage  
**Target**: 20-30 new tests, 50%+ coverage  

**Key Functions**:
- Biometric availability check
- Authentication flow
- Error handling (not available, cancelled, failed)
- Type detection (Face, Fingerprint)

**Complexity**: High (native module, auth flow)

### 4. NotificationService.js Tests (NEW)
**Current**: 0% coverage  
**Target**: 15-20 new tests, 70%+ coverage  

**Key Functions**:
- Request permission
- Schedule notification
- Handle notification response
- Clear notifications

**Complexity**: Medium (native modules, simple logic)

### 5. OfflineStorage.js Tests (NEW)
**Current**: 0% coverage  
**Target**: 15-20 new tests, 60%+ coverage  

**Key Functions**:
- Save offline data
- Load offline data
- Clear storage
- Sync status

**Complexity**: Medium (AsyncStorage, JSON serialization)

### 6. SyncManager.js Tests (NEW)
**Current**: 0% coverage  
**Target**: 20-30 new tests, 65%+ coverage  

**Key Functions**:
- Queue sync operations
- Execute sync
- Handle conflicts
- Track sync status

**Complexity**: Medium-High (complex state, promises)

## Testing Strategy

### Mocking Approach
```javascript
// 1. Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');
jest.mock('react-native-geolocation-service');

// 2. Mock axios/apiClient methods
apiClient.get = jest.fn().mockResolvedValue({...});

// 3. Create helper mocks
const mockGeoLocation = {
  getCurrentPosition: jest.fn(),
  startObserving: jest.fn(),
};
```

### Testing Patterns

**Pattern 1: Success Cases**
```javascript
it('should get location successfully', async () => {
  mockGeoLocation.getCurrentPosition.mockImplementation((cb) => {
    cb({ coords: { latitude: 10, longitude: 20 } });
  });
  
  const location = await getLocation();
  expect(location).toEqual({ latitude: 10, longitude: 20 });
});
```

**Pattern 2: Error Cases**
```javascript
it('should handle permission denied', async () => {
  mockGeoLocation.getCurrentPosition.mockRejectedValue(
    new Error('PERMISSION_DENIED')
  );
  
  await expect(getLocation()).rejects.toThrow('PERMISSION_DENIED');
});
```

**Pattern 3: Async Operations**
```javascript
it('should wait for async operation', async () => {
  const promise = asyncOperation();
  jest.advanceTimersByTime(1000);
  const result = await promise;
  expect(result).toBeDefined();
});
```

## Phase B Breakdown by Session

### Session 4 (Next - 2 hours)
- **Focus**: ApiService comprehensive expansion
- **Target**: 60-80 new tests, reach 12-13% overall coverage
- **Deliverables**: 
  - Error handling tests (401, 403, 429, 500, network errors)
  - Token refresh tests
  - Retry mechanism tests
  - Cache persistence tests

### Session 5 (1.5 hours)
- **Focus**: OfflineStorage & SyncManager basics
- **Target**: 35-40 new tests, reach 13-14% coverage
- **Deliverables**:
  - Basic CRUD operations
  - Error handling
  - Sync queue management

### Session 6 (2 hours)
- **Focus**: LocationService and NotificationService
- **Target**: 50-60 new tests, reach 14-15% coverage
- **Deliverables**:
  - Permission handling
  - Location tracking
  - Notification lifecycle

### Session 7 (1.5 hours)
- **Focus**: BiometricService and edge cases
- **Target**: 20-30 new tests, reach 15%+ coverage
- **Deliverables**:
  - Auth flow testing
  - Type detection
  - Error scenarios

## Expected Coverage Progression

| Stage | Tests | Coverage | Focus |
|-------|-------|----------|-------|
| Phase A End | 228 | 7.86% | Utilities ✅ |
| Session 4 | 288 (+60) | 12-13% | ApiService |
| Session 5 | 323 (+35) | 13-14% | Storage |
| Session 6 | 373 (+50) | 14-15% | Location/Notify |
| Session 7 | 403 (+30) | 15%+ | Biometric/Polish |

## Risk Mitigation

### Challenge 1: Native Module Mocking
**Risk**: Hard to mock Expo modules (geolocation, notifications, etc.)  
**Mitigation**: Mock at interface level, not implementation

### Challenge 2: Async Complexity
**Risk**: Difficult promise/timing patterns  
**Mitigation**: Use real timers, avoid jest.useFakeTimers() where possible

### Challenge 3: Storage State
**Risk**: AsyncStorage state persists between tests  
**Mitigation**: Clear all storage in each beforeEach

### Challenge 4: Auth Flow
**Risk**: Token refresh creates complex async chains  
**Mitigation**: Test single concerns first, then integration

## Success Criteria

- ✅ All Phase B tests passing (0 failures)
- ✅ ApiService coverage ≥ 70%
- ✅ Service Coverage ≥ 50% average
- ✅ Overall coverage ≥ 15%
- ✅ No skipped tests
- ✅ All CI/CD checks passing

## File Changes Expected

 - Enhanced: `mobile/__tests__/services/ApiService.integration.test.js` (+60-80 tests)
 - Created: `mobile/__tests__/services/OfflineStorage.test.js` (+15-20 tests)
 - Created: `mobile/__tests__/services/SyncManager.test.js` (+20-30 tests)
 - Created: `mobile/__tests__/services/LocationService.test.js` (+40-50 tests)
 - Created: `mobile/__tests__/services/NotificationService.test.js` (+15-20 tests)
 - Created: `mobile/__tests__/services/BiometricService.test.js` (+20-30 tests)

---

**Ready to Begin**: Phase B Session 4 starting now with ApiService expansion
