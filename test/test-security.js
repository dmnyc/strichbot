/**
 * Test script for StrichBot security features
 * Run with: node test/test-security.js
 */

const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'test-api-key';
const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret';

/**
 * Make HTTP request with options
 */
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: options.method || 'GET',
      headers: {
        'User-Agent': options.userAgent || 'StrichBot-Security-Test/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Test rate limiting
 */
async function testRateLimit() {
  console.log('\n🔒 Testing Rate Limiting...');

  const endpoint = '/api/post-stats';
  const requests = [];

  // Make 5 rapid requests (should hit rate limit)
  for (let i = 0; i < 5; i++) {
    requests.push(makeRequest(endpoint));
  }

  const responses = await Promise.all(requests);

  let successCount = 0;
  let rateLimitCount = 0;

  responses.forEach((response, index) => {
    if (response.status === 200) {
      successCount++;
      console.log(`  ✅ Request ${index + 1}: Success (200)`);
    } else if (response.status === 429) {
      rateLimitCount++;
      console.log(`  ⚠️  Request ${index + 1}: Rate limited (429)`);
      console.log(`     Retry-After: ${response.headers['retry-after']}s`);
    } else {
      console.log(`  ❌ Request ${index + 1}: ${response.status} - ${response.data.error || 'Unknown error'}`);
    }
  });

  console.log(`\n  Summary: ${successCount} successful, ${rateLimitCount} rate limited`);

  if (rateLimitCount > 0) {
    console.log('  ✅ Rate limiting working correctly');
  } else {
    console.log('  ⚠️  Rate limiting may not be working (check authentication)');
  }
}

/**
 * Test authentication bypass
 */
async function testAuthentication() {
  console.log('\n🔑 Testing Authentication...');

  const endpoint = '/api/post-stats';

  // Test with API key
  console.log('  Testing API Key authentication...');
  const apiResponse = await makeRequest(endpoint, {
    headers: { 'X-API-Key': API_KEY }
  });

  if (apiResponse.status === 200) {
    console.log('  ✅ API Key authentication successful');
  } else {
    console.log(`  ❌ API Key failed: ${apiResponse.status} - ${apiResponse.data?.error}`);
  }

  // Test with cron secret
  console.log('  Testing Cron Secret authentication...');
  const cronResponse = await makeRequest(endpoint, {
    headers: { 'X-Cron-Secret': CRON_SECRET }
  });

  if (cronResponse.status === 200) {
    console.log('  ✅ Cron Secret authentication successful');
  } else {
    console.log(`  ❌ Cron Secret failed: ${cronResponse.status} - ${cronResponse.data?.error}`);
  }

  // Test without authentication
  console.log('  Testing unauthenticated request...');
  const noAuthResponse = await makeRequest(endpoint);

  if (noAuthResponse.status === 200 || noAuthResponse.status === 429) {
    console.log('  ✅ Unauthenticated request handled correctly');
  } else {
    console.log(`  ❌ Unexpected response: ${noAuthResponse.status} - ${noAuthResponse.data?.error}`);
  }
}

/**
 * Test user agent filtering
 */
async function testUserAgentFiltering() {
  console.log('\n🤖 Testing User-Agent Filtering...');

  const endpoint = '/api/version'; // Use version endpoint for lighter testing

  // Test suspicious user agents
  const suspiciousAgents = [
    'curl/7.68.0',
    'python-requests/2.25.1',
    'bot-scanner',
    'web-crawler',
    '',  // Empty user agent
  ];

  for (const userAgent of suspiciousAgents) {
    const response = await makeRequest(endpoint, {
      userAgent,
      headers: userAgent === '' ? {} : undefined
    });

    if (response.status === 403) {
      console.log(`  ✅ Blocked suspicious agent: "${userAgent || 'empty'}"`);
    } else {
      console.log(`  ⚠️  Allowed agent: "${userAgent || 'empty'}" (${response.status})`);
    }
  }

  // Test legitimate user agent
  const legitResponse = await makeRequest(endpoint, {
    userAgent: 'Mozilla/5.0 (compatible; StrichBot-Test/1.0)'
  });

  if (legitResponse.status === 200) {
    console.log('  ✅ Legitimate user agent allowed');
  } else {
    console.log(`  ❌ Legitimate user agent blocked: ${legitResponse.status}`);
  }
}

/**
 * Test HTTP methods
 */
async function testHttpMethods() {
  console.log('\n📝 Testing HTTP Methods...');

  const endpoints = [
    { path: '/api/version', allowed: ['GET'] },
    { path: '/api/post-stats', allowed: ['GET', 'POST'] },
    { path: '/api/telegram-post', allowed: ['GET', 'POST'] }
  ];

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  for (const endpoint of endpoints) {
    console.log(`  Testing ${endpoint.path}...`);

    for (const method of methods) {
      const response = await makeRequest(endpoint.path, { method });

      if (endpoint.allowed.includes(method)) {
        if (response.status === 200 || response.status === 429) {
          console.log(`    ✅ ${method}: Allowed (${response.status})`);
        } else {
          console.log(`    ⚠️  ${method}: Unexpected status ${response.status}`);
        }
      } else {
        if (response.status === 405) {
          console.log(`    ✅ ${method}: Correctly blocked (405)`);
        } else {
          console.log(`    ❌ ${method}: Should be blocked but got ${response.status}`);
        }
      }
    }
  }
}

/**
 * Test security headers
 */
async function testSecurityHeaders() {
  console.log('\n🛡️  Testing Security Headers...');

  const response = await makeRequest('/api/version');
  const headers = response.headers;

  const expectedHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'referrer-policy',
    'content-security-policy'
  ];

  expectedHeaders.forEach(header => {
    if (headers[header]) {
      console.log(`  ✅ ${header}: ${headers[header]}`);
    } else {
      console.log(`  ❌ Missing header: ${header}`);
    }
  });
}

/**
 * Test CORS policy
 */
async function testCorsPolicy() {
  console.log('\n🌐 Testing CORS Policy...');

  // Test OPTIONS request
  const optionsResponse = await makeRequest('/api/version', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://example.com',
      'Access-Control-Request-Method': 'GET'
    }
  });

  console.log(`  OPTIONS request: ${optionsResponse.status}`);

  if (optionsResponse.headers['access-control-allow-origin']) {
    console.log(`  CORS origin: ${optionsResponse.headers['access-control-allow-origin']}`);
  }

  if (optionsResponse.headers['access-control-allow-methods']) {
    console.log(`  Allowed methods: ${optionsResponse.headers['access-control-allow-methods']}`);
  }
}

/**
 * Run all security tests
 */
async function runSecurityTests() {
  console.log('🔐 StrichBot Security Test Suite');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('=' .repeat(50));

  try {
    await testRateLimit();
    await testAuthentication();
    await testUserAgentFiltering();
    await testHttpMethods();
    await testSecurityHeaders();
    await testCorsPolicy();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Security tests completed!');
    console.log('\nNote: Some tests may show warnings in local development.');
    console.log('Deploy to production environment for full security validation.');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runSecurityTests();
}

module.exports = {
  runSecurityTests,
  testRateLimit,
  testAuthentication,
  testUserAgentFiltering,
  testHttpMethods,
  testSecurityHeaders,
  testCorsPolicy
};