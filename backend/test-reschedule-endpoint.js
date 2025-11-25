/**
 * Quick test script to verify the reschedule-count endpoint
 * Run this after restarting the server to verify it's working
 * 
 * Usage: node test-reschedule-endpoint.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

async function testEndpoint() {
  console.log('Testing /api/scheduled-audits/reschedule-count endpoint...\n');
  
  try {
    // Test without token (should return 200 with defaults)
    console.log('1. Testing without token...');
    const response1 = await axios.get(`${API_BASE_URL}/scheduled-audits/reschedule-count`);
    console.log('   Status:', response1.status);
    console.log('   Response:', JSON.stringify(response1.data, null, 2));
    console.log('   ✓ Should return 200 OK\n');
  } catch (error) {
    console.error('   ✗ FAILED - Status:', error.response?.status);
    console.error('   Error:', error.message);
    if (error.response?.status === 500) {
      console.error('   ⚠️  Server is still running OLD code! Restart the backend server.');
    }
    return;
  }

  // Test with invalid token (should return 200 with defaults)
  try {
    console.log('2. Testing with invalid token...');
    const response2 = await axios.get(`${API_BASE_URL}/scheduled-audits/reschedule-count`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    console.log('   Status:', response2.status);
    console.log('   Response:', JSON.stringify(response2.data, null, 2));
    console.log('   ✓ Should return 200 OK (not 401)\n');
  } catch (error) {
    if (error.response?.status === 500) {
      console.error('   ✗ FAILED - Got 500 error');
      console.error('   ⚠️  Server is still running OLD code! Restart the backend server.');
    } else {
      console.log('   Status:', error.response?.status);
      console.log('   Response:', JSON.stringify(error.response?.data, null, 2));
    }
  }

  console.log('\n✅ If both tests returned 200 OK, the endpoint is working correctly!');
  console.log('⚠️  If you see 500 errors, the server needs to be restarted.');
}

testEndpoint().catch(console.error);

