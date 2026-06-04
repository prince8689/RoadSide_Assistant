// ============================================
// DAY 3 — AUTH API TEST RUNNER
// ============================================
// Run: node src/tests/test-auth.js
// Tests all 7 auth endpoints automatically.

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let accessToken = '';
let refreshToken = '';
let testsPassed = 0;
let testsFailed = 0;

// ---- Helper: Make HTTP request ----
function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ---- Test Runner ----
function logResult(testName, passed, expected, actual, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`\n${icon} TEST: ${testName}`);
  console.log(`   Expected Status: ${expected}`);
  console.log(`   Actual Status:   ${actual}`);
  if (details) console.log(`   Details: ${details}`);
  if (passed) testsPassed++;
  else testsFailed++;
}

async function runTests() {
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log('  🧪  AUTH API TEST SUITE — DAY 3');
  console.log('══════════════════════════════════════════');

  // ─────────────────────────────────────────
  // TEST 1: Register as User
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/auth/register', {
      full_name: 'Rahul Sharma',
      email: 'rahul@test.com',
      phone: '9876543210',
      password: 'Test@1234',
      role: 'user',
    });
    const passed = res.status === 201 && res.body.success === true && res.body.data.accessToken;
    logResult('Register as User', passed, 201, res.status,
      passed ? `Token: ${res.body.data.accessToken.substring(0, 30)}...` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Register as User', false, 201, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 2: Register as Mechanic
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/auth/register', {
      full_name: 'Ramesh Mechanic',
      email: 'ramesh@test.com',
      phone: '9876543211',
      password: 'Test@1234',
      role: 'mechanic',
    });
    const passed = res.status === 201 && res.body.success === true && res.body.data.user.role === 'mechanic';
    logResult('Register as Mechanic', passed, 201, res.status,
      passed ? `Role: ${res.body.data.user.role}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Register as Mechanic', false, 201, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 3: Login
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'rahul@test.com',
      password: 'Test@1234',
    });
    const passed = res.status === 200 && res.body.data.accessToken && res.body.data.refreshToken;
    if (passed) {
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    }
    logResult('Login', passed, 200, res.status,
      passed ? `Access + Refresh tokens received` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Login', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 4: Get Current User (Protected)
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    const passed = res.status === 200 && res.body.data.user && !res.body.data.user.password_hash;
    logResult('Get Current User (Protected)', passed, 200, res.status,
      passed ? `User: ${res.body.data.user.full_name} (${res.body.data.user.email})` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Get Current User (Protected)', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 5: Validation Error (bad input)
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/auth/register', {
      email: 'invalid-email',
      password: '123',
    });
    const passed = res.status === 400 && res.body.success === false;
    logResult('Validation Error', passed, 400, res.status,
      passed ? `Errors: ${res.body.errors.map(e => e.field).join(', ')}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Validation Error', false, 400, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 6: Wrong Password
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'rahul@test.com',
      password: 'wrongpass',
    });
    const passed = res.status === 401;
    logResult('Wrong Password', passed, 401, res.status,
      passed ? `Error: ${res.body.error}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Wrong Password', false, 401, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 7: Protected Route Without Token
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('GET', '/api/auth/me');
    const passed = res.status === 401;
    logResult('No Token → 401', passed, 401, res.status,
      passed ? `Error: ${res.body.message}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('No Token → 401', false, 401, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 8 (BONUS): Duplicate Email
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/auth/register', {
      full_name: 'Rahul Duplicate',
      email: 'rahul@test.com',
      phone: '9876543299',
      password: 'Test@1234',
      role: 'user',
    });
    const passed = res.status === 409;
    logResult('Duplicate Email → 409', passed, 409, res.status,
      passed ? `Error: ${res.body.error}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Duplicate Email → 409', false, 409, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 9 (BONUS): Refresh Token
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: refreshToken,
    });
    const passed = res.status === 200 && res.body.data.accessToken;
    logResult('Refresh Token', passed, 200, res.status,
      passed ? `New access token received` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Refresh Token', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 10 (BONUS): Logout
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/auth/logout', null, {
      Authorization: `Bearer ${accessToken}`,
    });
    const passed = res.status === 200 && res.body.success === true;
    logResult('Logout', passed, 200, res.status,
      passed ? `Message: ${res.body.message}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Logout', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log(`  📊  RESULTS: ${testsPassed} passed, ${testsFailed} failed, ${testsPassed + testsFailed} total`);
  console.log('══════════════════════════════════════════');
  console.log('');

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
