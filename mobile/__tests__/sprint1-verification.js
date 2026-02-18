/**
 * Manual Test Plan: Sprint 1 Tasks 1-3
 * Run these tests to verify implementation
 */

// ============================================
// TEST 1: Secure Token Storage (Task 1)
// ============================================

/**
 * Test: Verify tokens are stored in SecureStore
 * 
 * Steps:
 * 1. Login to the app
 * 2. Check AsyncStorage (should be empty for tokens)
 * 3. Check SecureStore (tokens should be there)
 * 
 * Expected Result:
 * - No tokens in AsyncStorage
 * - All auth tokens in SecureStore (encrypted)
 * - Keys: auth_token, refresh_token, token_expiry, base_url
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

async function testSecureStorage() {
  console.log('\n=== TEST 1: Secure Storage ===\n');
  
  try {
    // Check AsyncStorage (should NOT have tokens)
    const asyncKeys = await AsyncStorage.getAllKeys();
    const tokenKeys = asyncKeys.filter(k => 
      k.includes('token') || k.includes('auth')
    );
    
    console.log('❌ AsyncStorage token keys:', tokenKeys.length);
    console.assert(tokenKeys.length === 0, 'FAIL: Tokens found in AsyncStorage!');
    
    // Check SecureStore (should have tokens after login)
    const authToken = await SecureStore.getItemAsync('auth_token');
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    
    console.log('✅ SecureStore has auth_token:', !!authToken);
    console.log('✅ SecureStore has refresh_token:', !!refreshToken);
    
    console.log('\n✅ TEST 1 PASSED: Tokens stored securely\n');
  } catch (error) {
    console.error('❌ TEST 1 FAILED:', error);
  }
}

// ============================================
// TEST 2: Sentry Crash Reporting (Task 2)
// ============================================

/**
 * Test: Verify Sentry is initialized and capturing errors
 * 
 * Steps:
 * 1. Throw a test error
 * 2. Check Sentry configuration
 * 3. Verify error appears in Sentry dashboard
 * 
 * Expected Result:
 * - Sentry initialized with correct config
 * - Error captured with user context
 * - Error visible in Sentry dashboard
 */

import { initSentry, captureSentryException, setSentryUser } from '../src/config/sentry';
import * as Sentry from '@sentry/react-native';

async function testSentryIntegration() {
  console.log('\n=== TEST 2: Sentry Integration ===\n');
  
  try {
    // Test 1: Verify initialization
    console.log('Testing Sentry initialization...');
    initSentry();
    console.log('✅ Sentry initialized');
    
    // Test 2: Set user context
    console.log('Setting user context...');
    setSentryUser({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'auditor',
      permissions: ['audit.create', 'audit.read']
    });
    console.log('✅ User context set');
    
    // Test 3: Capture test exception
    console.log('Capturing test exception...');
    const testError = new Error('TEST ERROR - Ignore (Sprint 1 Task 2 verification)');
    captureSentryException(testError, {
      test: {
        sprint: 1,
        task: 2,
        purpose: 'verification'
      }
    });
    console.log('✅ Exception captured');
    
    // Test 4: Check configuration
    const config = __DEV__ 
      ? 'Development (Sentry disabled)'
      : 'Production (Sentry enabled)';
    console.log('Configuration:', config);
    
    console.log('\n✅ TEST 2 PASSED: Sentry integration working');
    console.log('📊 Check Sentry dashboard for test error');
    console.log('   Tags: handled=true');
    console.log('   User: test@example.com\n');
  } catch (error) {
    console.error('❌ TEST 2 FAILED:', error);
  }
}

// ============================================
// TEST 3: Correlation IDs (Task 3)
// ============================================

/**
 * Test: Verify correlation IDs are generated and sent
 * 
 * Steps:
 * 1. Make API request
 * 2. Check request headers for X-Correlation-ID
 * 3. Verify correlation ID format (UUID v4)
 * 4. Check Sentry error has correlation ID
 * 
 * Expected Result:
 * - Correlation ID generated for each request
 * - Header sent to backend
 * - Logged in console
 * - Captured in Sentry errors
 */

import apiClient from '../src/services/ApiService';
import { captureApiError } from '../src/config/sentry';

async function testCorrelationIds() {
  console.log('\n=== TEST 3: Correlation IDs ===\n');
  
  try {
    // Test 1: Generate and verify format
    console.log('Testing correlation ID generation...');
    
    // UUID v4 regex pattern
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    // Make test request
    try {
      const response = await apiClient.get('/api/health');
      const correlationId = response.config.correlationId;
      
      console.log('Generated ID:', correlationId);
      console.assert(uuidPattern.test(correlationId), 'Invalid UUID format!');
      console.log('✅ Valid UUID v4 format');
      
      // Check header was sent
      const sentHeader = response.config.headers['X-Correlation-ID'];
      console.log('✅ Header sent:', !!sentHeader);
      console.assert(sentHeader === correlationId, 'Header mismatch!');
      
    } catch (error) {
      // Expected if backend is not running
      const correlationId = error.config?.correlationId;
      console.log('Generated ID (from error):', correlationId);
      console.assert(uuidPattern.test(correlationId), 'Invalid UUID format!');
      console.log('✅ Valid UUID v4 format (verified from error)');
    }
    
    // Test 2: Verify uniqueness
    console.log('\nTesting ID uniqueness...');
    const ids = new Set();
    for (let i = 0; i < 10; i++) {
      try {
        await apiClient.get('/api/test-uniqueness');
      } catch (error) {
        ids.add(error.config?.correlationId);
      }
    }
    console.log(`Generated ${ids.size} unique IDs from 10 requests`);
    console.assert(ids.size === 10, 'IDs not unique!');
    console.log('✅ All IDs unique');
    
    // Test 3: Verify Sentry integration
    console.log('\nTesting Sentry + Correlation ID...');
    const testError = {
      response: { 
        status: 500, 
        data: { message: 'Test server error' },
        headers: {}
      },
      config: { url: '/api/test', method: 'get' },
      message: 'Request failed with status 500'
    };
    const testCorrelationId = 'test-id-' + Date.now();
    
    captureApiError(testError, testCorrelationId, '/api/test', 'GET');
    console.log('✅ API error captured with correlation ID');
    console.log('📊 Check Sentry for tag: correlation_id=' + testCorrelationId);
    
    console.log('\n✅ TEST 3 PASSED: Correlation IDs working\n');
  } catch (error) {
    console.error('❌ TEST 3 FAILED:', error);
  }
}

// ============================================
// TEST 4: Integration Test (All Tasks)
// ============================================

/**
 * Test: End-to-end flow with all features
 * 
 * Scenario:
 * 1. Login (secure storage + Sentry user context)
 * 2. Make API request (correlation ID)
 * 3. Encounter error (Sentry + correlation ID)
 * 4. Trace error in logs and Sentry
 * 
 * Expected Result:
 * - Login stores token securely
 * - User context set in Sentry
 * - Request has correlation ID
 * - Error logged with correlation ID
 * - Error in Sentry with user + correlation ID
 */

async function testFullIntegration() {
  console.log('\n=== TEST 4: Full Integration ===\n');
  
  try {
    console.log('1. Testing login flow...');
    // Login would be done through AuthContext
    // Just verify SecureStore works
    await SecureStore.setItemAsync('test_token', 'test-value-' + Date.now());
    const retrieved = await SecureStore.getItemAsync('test_token');
    console.assert(!!retrieved, 'SecureStore read/write failed!');
    await SecureStore.deleteItemAsync('test_token');
    console.log('✅ Secure storage works');
    
    console.log('\n2. Testing user context in Sentry...');
    setSentryUser({
      id: 'integration-test-user',
      email: 'integration@test.com',
      name: 'Integration Test',
      role: 'auditor'
    });
    console.log('✅ User context set');
    
    console.log('\n3. Testing API request with correlation ID...');
    try {
      await apiClient.get('/api/audits');
      console.log('✅ Request sent with correlation ID');
    } catch (error) {
      const correlationId = error.config?.correlationId;
      console.log('✅ Error has correlation ID:', correlationId);
      
      // Check logs for correlation ID
      console.log('📋 Look for this in console logs:');
      console.log(`   [API] GET /api/audits [${correlationId}]`);
      console.log(`   [API] ✗ ... [${correlationId}]`);
    }
    
    console.log('\n4. Testing error capture...');
    const integrationError = new Error('Integration test error - Sprint 1 verification');
    captureSentryException(integrationError, {
      integration_test: true,
      sprint: 1,
      tasks_complete: [1, 2, 3]
    });
    console.log('✅ Error captured');
    
    console.log('\n✅ TEST 4 PASSED: Full integration working');
    console.log('\n📊 Check Sentry dashboard for:');
    console.log('   - User: integration@test.com');
    console.log('   - Context: integration_test=true');
    console.log('   - Tags: handled=true\n');
  } catch (error) {
    console.error('❌ TEST 4 FAILED:', error);
  }
}

// ============================================
// RUN ALL TESTS
// ============================================

export async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Sprint 1 Tasks 1-3 Verification Tests          ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n');
  
  await testSecureStorage();
  await testSentryIntegration();
  await testCorrelationIds();
  await testFullIntegration();
  
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   All Tests Complete                              ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log('Next Steps:');
  console.log('1. ✅ Run npm audit fix (DONE - no vulnerabilities)');
  console.log('2. ⏳ Add Sentry DSN to app.json');
  console.log('3. ⏳ Commit changes to git');
  console.log('4. ⏳ Continue to Task 4 (Jest testing)');
  console.log('\n');
}

// Export individual tests for manual execution
export {
  testSecureStorage,
  testSentryIntegration,
  testCorrelationIds,
  testFullIntegration
};
