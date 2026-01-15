#!/usr/bin/env node
/**
 * Trigger Speed of Service update via API
 * This script calls the admin endpoint on the production server
 */

const https = require('https');

const API_BASE = 'https://audit-app-backend-2221-g9cna3ath2b4h8br.centralindia-01.azurewebsites.net';
const ADMIN_EMAIL = 'admin@lbf.co.in';
const ADMIN_PASSWORD = 'Admin123@';

async function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  console.log('🚀 Speed of Service Update Script');
  console.log('='.repeat(50));
  
  // Step 1: Login
  console.log('\n📝 Step 1: Logging in...');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('❌ Login failed:', loginRes);
    process.exit(1);
  }
  
  const token = loginRes.data.token;
  console.log('✅ Login successful! User:', loginRes.data.user.name);
  
  // Step 2: Check if endpoint exists
  console.log('\n📝 Step 2: Calling admin update endpoint...');
  const updateRes = await makeRequest('POST', '/api/templates/admin/update-speed-of-service', {
    templateName: 'CVR - CDR',
    category: 'SERVICE - Speed of Service'
  }, token);
  
  console.log('\n📊 Response:', JSON.stringify(updateRes, null, 2));
  
  if (updateRes.status === 200 && updateRes.data.success) {
    console.log('\n🎉 SUCCESS!');
    console.log(`   Deleted items: ${updateRes.data.deletedItems}`);
    console.log(`   Inserted items: ${updateRes.data.insertedItems}`);
    console.log(`   Perfect Score: ${updateRes.data.perfectScore}`);
  } else if (updateRes.status === 404 || (typeof updateRes.data === 'string' && updateRes.data.includes('Cannot POST'))) {
    console.log('\n⚠️  The admin endpoint is not yet deployed.');
    console.log('   The deployment may still be in progress on Azure.');
    console.log('   Please wait a few minutes and try again.');
  } else {
    console.log('\n❌ Update failed:', updateRes);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
