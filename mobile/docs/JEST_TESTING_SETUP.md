# Jest Testing Framework Setup Guide

## Overview

Jest is now configured for testing React Native components, services, contexts, and utilities. The framework includes React Native Testing Library for component testing and comprehensive mocks for Expo modules.

## Configuration

### Files Created

1. **jest.config.js** - Main Jest configuration
2. **jest.setup.js** - Test environment setup and mocks
3. **__mocks__/fileMock.js** - Mock for static assets
4. **__tests__/jest-setup.test.js** - Configuration verification tests

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## Running Tests

### Run All Tests with Coverage
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm test -- MyComponent.test.js
```

###Run Tests Without Coverage
```bash
npm test -- --no-coverage
```

### Run Tests in CI Mode
```bash
npm run test:ci
```

## Writing Tests

### Component Test Example

```javascript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MyComponent from '../src/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { getByText } = render(<MyComponent />);
    expect(getByText('Hello World')).toBeTruthy();
  });

  it('handles button press', async () => {
    const onPress = jest.fn();
    const { getByText } = render(<MyComponent onPress={onPress} />);
    
    fireEvent.press(getByText('Click Me'));
    
    await waitFor(() => {
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Context Test Example

```javascript
import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login successfully', async () => {
    SecureStore.setItemAsync.mockResolvedValue();
    
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });
    
    expect(result.current.isAuthenticated).toBe(true);
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });
});
```

### Service Test Example

```javascript
import apiClient from '../src/services/ApiService';
import axios from 'axios';

jest.mock('axios');

describe('ApiService', () => {
  it('should generate correlation ID for requests', async () => {
    const mockResponse = { data: { success: true } };
    axios.create.mockReturnValue({
      get: jest.fn().mockResolvedValue(mockResponse),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    });

    const response = await apiClient.get('/api/test');
    
    expect(response.config.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
```

### Utility Test Example

```javascript
import { formatDate, validateEmail } from '../src/utils/helpers';

describe('Utility Functions', () => {
  describe('formatDate', () => {
    it('formats date correctly', () => {
      const date = new Date('2026-02-18');
      expect(formatDate(date)).toBe('Feb 18, 2026');
    });
  });

  describe('validateEmail', () => {
    it('validates correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});
```

## Available Mocks

### Expo Modules

The following Expo modules are automatically mocked in `jest.setup.js`:

- **expo-secure-store** - Secure storage
- **expo-notifications** - Push notifications
- **expo-location** - Geolocation
- **expo-local-authentication** - Biometric auth
- **expo-image-picker** - Camera/gallery
- **expo-constants** - App configuration

### Third-Party Libraries

- **@react-native-community/netinfo** - Network connectivity
- **@sentry/react-native** - Error tracking
- **@react-native-async-storage/async-storage** - Async storage
- **axios** - HTTP client

### React Native Modules

- Console methods are mocked to reduce noise in tests
- Static assets (images, fonts) are mocked

## Custom Mocks

### Creating a Mock

Create a file in `__mocks__` directory:

```javascript
// __mocks__/MyModule.js
module.exports = {
  myFunction: jest.fn(),
  MY_CONSTANT: 'mocked-value',
};
```

### Using the Mock

```javascript
jest.mock('../src/utils/MyModule');
import { myFunction } from '../src/utils/MyModule';

// Now myFunction is a Jest mock
expect(myFunction).toHaveBeenCalled();
```

## Coverage

### Coverage Thresholds

Currently set to 50% for all metrics:

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

### Viewing Coverage

After running `npm test`, open:
```
mobile/coverage/lcov-report/index.html
```

### Coverage Reports

- **Terminal**: Summary displayed after test run
- **HTML**: Detailed report in `coverage/lcov-report/`
- **LCOV**: Machine-readable format in `coverage/lcov.info`

## Best Practices

### 1. Organize Tests by Feature

```
__tests__/
  ├── components/
  │   ├── Button.test.js
  │   └── ErrorBoundary.test.js
  ├── contexts/
  │   └── AuthContext.test.js
  ├── services/
  │   └── ApiService.test.js
  └── utils/
      └── helpers.test.js
```

### 2. Use Descriptive Test Names

```javascript
// ✅ Good
it('should display error message when login fails', () => {});

// ❌ Bad
it('test login', () => {});
```

### 3. Test One Thing Per Test

```javascript
// ✅ Good
it('should render title correctly', () => {});
it('should call onPress when button is clicked', () => {});

// ❌ Bad
it('should render and handle click', () => {
  // Tests multiple things
});
```

### 4. Use AAA Pattern

```javascript
it('should increment counter', () => {
  // Arrange
  const { getByText } = render(<Counter />);
  
  // Act
  fireEvent.press(getByText('Increment'));
  
  // Assert
  expect(getByText('Count: 1')).toBeTruthy();
});
```

### 5. Clean Up After Tests

```javascript
describe('MyComponent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('test 1', () => {});
  it('test 2', () => {});
});
```

### 6. Test Error Cases

```javascript
it('should handle API error gracefully', async () => {
  apiService.get.mockRejectedValue(new Error('Network error'));
  
  const { getByText } = render(<MyComponent />);
  
  await waitFor(() => {
    expect(getByText('Error occurred')).toBeTruthy();
  });
});
```

## Common Testing Patterns

### Testing Async Operations

```javascript
it('loads data on mount', async () => {
  const { getByText } = render(<DataComponent />);
  
  await waitFor(() => {
    expect(getByText('Data loaded')).toBeTruthy();
  });
});
```

### Testing with Context Providers

```javascript
const wrapper = ({ children }) => (
  <AuthProvider>
    <NetworkProvider>
      {children}
    </NetworkProvider>
  </AuthProvider>
);

const { result } = renderHook(() => useAuth(), { wrapper });
```

### Testing Navigation

```javascript
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const renderWithNavigation = (component) => {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Test" component={component} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

### Testing Forms

```javascript
it('validates form input', () => {
  const { getByPlaceholderText, getByText } = render(<LoginForm />);
  
  const emailInput = getByPlaceholderText('Email');
  const submitButton = getByText('Submit');
  
  fireEvent.changeText(emailInput, 'invalid-email');
  fireEvent.press(submitButton);
  
  expect(getByText('Invalid email')).toBeTruthy();
});
```

## Troubleshooting

### Tests Not Found

**Problem:** Jest doesn't find your test files

**Solution:** Check test file naming:
- Must be in `__tests__` directory
- Must end with `.test.js` or `.spec.js`

### Module Not Found

**Problem:** `Cannot find module 'MyModule'`

**Solution:** 
1. Check import path is correct
2. Add to `moduleNameMapper` in jest.config.js
3. Create a mock in `__mocks__` directory

### Expo Module Errors

**Problem:** Errors related to Expo modules

**Solution:** Ensure module is mocked in `jest.setup.js`:

```javascript
jest.mock('expo-my-module', () => ({
  myFunction: jest.fn(),
}));
```

### Async Test Timeout

**Problem:** `Exceeded timeout of 5000 ms`

**Solution:** Increase timeout for specific test:

```javascript
it('slow test', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Coverage Not Meeting Threshold

**Problem:** `Jest: "global" coverage threshold not met`

**Solution:**
1. Write more tests to increase coverage
2. Or temporarily lower threshold in jest.config.js

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run mobile tests
  working-directory: ./mobile
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./mobile/coverage/lcov.info
    flags: mobile
```

## Next Steps

1. **Task 5: Write 20+ unit tests**
   - AuthContext tests
   - ApiService tests
   - ErrorBoundary tests
   - Sentry integration tests
   - Component tests

2. **Increase Coverage**
   - Aim for 70%+ coverage
   - Focus on critical paths first

3. **Add E2E Tests**
   - Use Maestro for end-to-end testing
   - Test full user flows

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Expo Testing](https://docs.expo.dev/develop/unit-testing/)

## Summary

✅ Jest configured and working  
✅ React Native Testing Library installed  
✅ Expo modules mocked  
✅ Coverage thresholds set to 50%  
✅ Test scripts added to package.json  
✅ Verification tests passing  

**Status:** Task 4 Complete - Ready for Task 5 (Write Tests)
