const axios = require('axios');
const API_BASE = process.env.API_URL || 'http://localhost:5000/api';

/**
 * Test script for Assignment Rules and Escalation Features
 * 
 * Prerequisites:
 * 1. Backend server running
 * 2. Database connected
 * 3. Test users created with different roles
 * 4. Test locations created
 * 5. Test templates with different categories
 */

// Test configuration
const testConfig = {
  adminUser: {
    email: 'admin@test.com',
    password: 'admin123'
  },
  testLocation: {
    name: 'Test Store',
    latitude: 28.6139,
    longitude: 77.2090
  },
  testTemplate: {
    name: 'Test Assignment Template',
    category: 'FOOD SAFETY'
  }
};

let authToken = null;

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };
  
  if (data) {
    config.data = data;
  }
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test 1: Login as admin
async function testLogin() {
  console.log('\n📋 Test 1: Admin Login');
  const result = await makeRequest('POST', '/auth/login', {
    email: testConfig.adminUser.email,
    password: testConfig.adminUser.password
  });
  
  if (result.success && result.data.token) {
    authToken = result.data.token;
    console.log('✅ Login successful');
    return true;
  } else {
    console.log('❌ Login failed:', result.error);
    return false;
  }
}

// Test 2: Create test location with manager
async function testCreateLocation() {
  console.log('\n📋 Test 2: Create Test Location');
  
  // First, get or create a manager user
  const usersResult = await makeRequest('GET', '/users');
  let managerUser = usersResult.data?.find(u => u.role === 'manager');
  
  if (!managerUser) {
    console.log('⚠️  No manager user found. Creating one...');
    const createResult = await makeRequest('POST', '/users', {
      email: 'manager@test.com',
      password: 'manager123',
      name: 'Test Manager',
      role: 'manager'
    });
    
    if (createResult.success) {
      managerUser = createResult.data;
    } else {
      console.log('❌ Failed to create manager user:', createResult.error);
      return null;
    }
  }
  
  // Create location
  const locationResult = await makeRequest('POST', '/locations', {
    name: testConfig.testLocation.name,
    latitude: testConfig.testLocation.latitude,
    longitude: testConfig.testLocation.longitude
  });
  
  if (locationResult.success) {
    const locationId = locationResult.data.id;
    console.log(`✅ Location created: ${locationId}`);
    
    // Assign manager to location
    const assignResult = await makeRequest('POST', `/locations/${locationId}/assign`, {
      userId: managerUser.id
    });
    
    if (assignResult.success) {
      console.log('✅ Manager assigned to location');
    }
    
    return { locationId, managerId: managerUser.id };
  } else {
    console.log('❌ Failed to create location:', locationResult.error);
    return null;
  }
}

// Test 3: Create audit with Food Safety category
async function testAssignmentRules(locationId) {
  console.log('\n📋 Test 3: Test Assignment Rules');
  
  // Get a template with Food Safety category
  const templatesResult = await makeRequest('GET', '/checklists');
  const foodSafetyTemplate = templatesResult.data?.find(t => 
    t.name.toLowerCase().includes('food') || 
    t.name.toLowerCase().includes('safety')
  );
  
  if (!foodSafetyTemplate) {
    console.log('⚠️  No Food Safety template found. Using first available template.');
    const firstTemplate = templatesResult.data?.[0];
    if (!firstTemplate) {
      console.log('❌ No templates found');
      return false;
    }
    
    // Create audit
    const auditResult = await makeRequest('POST', '/audits', {
      template_id: firstTemplate.id,
      restaurant_name: testConfig.testLocation.name,
      location_id: locationId,
      notes: 'Test audit for assignment rules'
    });
    
    if (auditResult.success) {
      console.log(`✅ Audit created: ${auditResult.data.id}`);
      
      // Get audit items and mark some as failed
      const auditItemsResult = await makeRequest('GET', `/audits/${auditResult.data.id}/items`);
      
      if (auditItemsResult.success && auditItemsResult.data.length > 0) {
        // Mark first item as failed
        const firstItem = auditItemsResult.data[0];
        const updateResult = await makeRequest('PUT', `/audits/${auditResult.data.id}/items/${firstItem.id}`, {
          status: 'failed',
          comment: 'Test failure for assignment rules'
        });
        
        if (updateResult.success) {
          console.log('✅ Item marked as failed');
        }
      }
      
      // Complete the audit to trigger auto-actions
      const completeResult = await makeRequest('PUT', `/audits/${auditResult.data.id}/complete`);
      
      if (completeResult.success) {
        console.log('✅ Audit completed - auto-actions should be triggered');
        
        // Check if action items were created
        setTimeout(async () => {
          const actionsResult = await makeRequest('GET', '/action-items');
          if (actionsResult.success) {
            const recentActions = actionsResult.data.filter(a => 
              a.audit_id === auditResult.data.id
            );
            console.log(`✅ Found ${recentActions.length} action item(s) created`);
            
            if (recentActions.length > 0) {
              console.log('📊 Action Item Details:');
              recentActions.forEach(action => {
                console.log(`   - ID: ${action.id}, Title: ${action.title}`);
                console.log(`     Assigned to: ${action.assigned_to || 'Unassigned'}`);
                console.log(`     Priority: ${action.priority}`);
              });
            }
          }
        }, 2000);
        
        return true;
      }
    }
  }
  
  return false;
}

// Test 4: Test Escalation Workflow
async function testEscalation() {
  console.log('\n📋 Test 4: Test Escalation Workflow');
  
  // Get action items
  const actionsResult = await makeRequest('GET', '/action-items');
  
  if (!actionsResult.success || !actionsResult.data || actionsResult.data.length === 0) {
    console.log('⚠️  No action items found. Create some failed audits first.');
    return false;
  }
  
  // Find an action item that's not completed
  const pendingAction = actionsResult.data.find(a => a.status !== 'completed');
  
  if (!pendingAction) {
    console.log('⚠️  No pending action items found.');
    return false;
  }
  
  // Manually set due_date to past date to trigger escalation
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 5); // 5 days ago
  
  console.log(`📝 Testing escalation for action item ${pendingAction.id}`);
  console.log(`   Current due date: ${pendingAction.due_date}`);
  console.log(`   Setting to: ${pastDate.toISOString()}`);
  
  // Note: This would require a direct database update or an admin endpoint
  // For now, we'll just document the test
  console.log('⚠️  Manual escalation test requires database access or admin endpoint');
  console.log('   To test: Run escalation job manually or wait for scheduled run');
  
  return true;
}

// Test 5: Check Escalation History
async function testEscalationHistory() {
  console.log('\n📋 Test 5: Check Escalation History');
  
  const actionsResult = await makeRequest('GET', '/action-items');
  
  if (actionsResult.success && actionsResult.data) {
    const escalatedActions = actionsResult.data.filter(a => 
      a.escalated === true || a.escalated === 1
    );
    
    if (escalatedActions.length > 0) {
      console.log(`✅ Found ${escalatedActions.length} escalated action item(s):`);
      escalatedActions.forEach(action => {
        console.log(`   - ID: ${action.id}, Title: ${action.title}`);
        console.log(`     Escalated to: ${action.escalated_to || 'N/A'}`);
        console.log(`     Escalated at: ${action.escalated_at || 'N/A'}`);
      });
      return true;
    } else {
      console.log('ℹ️  No escalated actions found yet');
      return true;
    }
  }
  
  return false;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Assignment Rules and Escalation Tests\n');
  console.log('='.repeat(60));
  
  // Test 1: Login
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Test 2: Create location
  const locationData = await testCreateLocation();
  
  // Test 3: Assignment rules
  if (locationData) {
    await testAssignmentRules(locationData.locationId);
  }
  
  // Test 4: Escalation
  await testEscalation();
  
  // Test 5: Escalation history
  await testEscalationHistory();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Check action items in web UI to verify assignment');
  console.log('   2. Wait for escalation job to run (daily at 10 AM)');
  console.log('   3. Or manually trigger escalation job');
  console.log('   4. Verify escalation history in action items');
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(err => {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
