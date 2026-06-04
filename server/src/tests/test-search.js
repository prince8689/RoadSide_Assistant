// ============================================
// DAY 11 — SEARCH, FILTERS, RATE LIMITING TESTS
// ============================================
// Tests for all Day 11 features:
//   1. Search Mechanics (keyword, specialization, rating, location, availability)
//   2. Search Requests (status, date range, keyword)
//   3. Search Users (admin only)
//   4. Pagination on all search endpoints
//   5. Rate limiting on auth routes
//   6. Standard response format verification
//
// Seed data credentials:
//   Admin:    admin@roadside.com    / Admin@123
//   Mechanic: rajesh@mechanic.com   / Mech@123
//   User:     amit@user.com         / User@123
//
// Usage: node src/tests/test-search.js

const http = require('http');

// ── Config ──
const BASE_URL = 'http://localhost:5000/api';
let USER_TOKEN = '';
let ADMIN_TOKEN = '';
let MECHANIC_TOKEN = '';

// ── Colors ──
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text) => `\x1b[36m${text}\x1b[0m`;

// ── HTTP Helper ──
const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// ── Test tracker ──
let passed = 0;
let failed = 0;

const assert = (condition, testName, details = '') => {
  if (condition) {
    console.log(`  ${green('✅ PASS')} — ${testName}`);
    passed++;
  } else {
    console.log(`  ${red('❌ FAIL')} — ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
};

// ============================================
// LOGIN HELPERS (using actual seed data)
// ============================================

const loginUser = async () => {
  const res = await request('POST', '/auth/login', {
    email: 'amit@user.com',
    password: 'User@123',
  });
  if (res.status === 200 && res.body.data?.accessToken) {
    USER_TOKEN = res.body.data.accessToken;
    console.log(`  ${green('✅')} User logged in: ${res.body.data.user?.full_name || 'Amit Patel'}`);
  } else {
    console.log(`  ${red('❌')} User login failed — ${res.body.message || 'Unknown error'}`);
    console.log(`  ${yellow('⚠')}  Make sure seed data is loaded and server is running`);
  }
};

const loginAdmin = async () => {
  const res = await request('POST', '/auth/login', {
    email: 'admin@roadside.com',
    password: 'Admin@123',
  });
  if (res.status === 200 && res.body.data?.accessToken) {
    ADMIN_TOKEN = res.body.data.accessToken;
    console.log(`  ${green('✅')} Admin logged in: ${res.body.data.user?.full_name || 'Admin User'}`);
  } else {
    console.log(`  ${red('❌')} Admin login failed — ${res.body.message || 'Unknown error'}`);
  }
};

const loginMechanic = async () => {
  const res = await request('POST', '/auth/login', {
    email: 'rajesh@mechanic.com',
    password: 'Mech@123',
  });
  if (res.status === 200 && res.body.data?.accessToken) {
    MECHANIC_TOKEN = res.body.data.accessToken;
    console.log(`  ${green('✅')} Mechanic logged in: ${res.body.data.user?.full_name || 'Rajesh Kumar'}`);
  } else {
    console.log(`  ${red('❌')} Mechanic login failed — ${res.body.message || 'Unknown error'}`);
  }
};

// ============================================
// TEST CASES
// ============================================

const test1_SearchMechanicsByKeyword = async () => {
  console.log(cyan('\n── Test 1: Search Mechanics by Keyword ──'));
  const res = await request('GET', '/search/mechanics?keyword=Rajesh', null, USER_TOKEN);
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  assert(Array.isArray(res.body.data), 'data is array');
  assert(res.body.pagination !== undefined, 'pagination present');
  if (res.body.data?.length > 0) {
    assert(
      res.body.data.some((m) => m.business_name?.toLowerCase().includes('rajesh') || m.full_name?.toLowerCase().includes('rajesh')),
      'Results contain "Rajesh"'
    );
  }
};

const test2_SearchMechanicsBySpecialization = async () => {
  console.log(cyan('\n── Test 2: Search Mechanics by Specialization ──'));
  const res = await request('GET', '/search/mechanics?specialization=engine', null, USER_TOKEN);
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  assert(Array.isArray(res.body.data), 'data is array');
  if (res.body.data?.length > 0) {
    const hasSpec = res.body.data.every(
      (m) => m.specializations?.some((s) => s.toLowerCase().includes('engine'))
    );
    assert(hasSpec, 'All results have engine specialization');
  }
};

const test3_SearchMechanicsByRating = async () => {
  console.log(cyan('\n── Test 3: Search Mechanics by Rating ──'));
  const res = await request('GET', '/search/mechanics?min_rating=4', null, USER_TOKEN);
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  if (res.body.data?.length > 0) {
    const allAbove4 = res.body.data.every((m) => parseFloat(m.rating) >= 4);
    assert(allAbove4, 'All mechanics have rating >= 4');
  }
};

const test4_SearchMechanicsByLocation = async () => {
  console.log(cyan('\n── Test 4: Search Mechanics by Location + Sort ──'));
  const res = await request(
    'GET',
    '/search/mechanics?lat=28.6139&lng=77.2090&radius=10&sort_by=distance&sort_order=ASC',
    null,
    USER_TOKEN
  );
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  if (res.body.data?.length > 0) {
    assert(res.body.data[0].distance_km !== undefined, 'distance_km present');
    if (res.body.data.length > 1) {
      const sorted = res.body.data.every((m, i) => {
        if (i === 0) return true;
        return parseFloat(m.distance_km) >= parseFloat(res.body.data[i - 1].distance_km);
      });
      assert(sorted, 'Results sorted by distance ASC');
    }
  }
};

const test5_SearchMechanicsAvailable = async () => {
  console.log(cyan('\n── Test 5: Search Mechanics Available Only ──'));
  const res = await request('GET', '/search/mechanics?is_available=true', null, USER_TOKEN);
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  if (res.body.data?.length > 0) {
    const allAvailable = res.body.data.every((m) => m.is_available === true);
    assert(allAvailable, 'All mechanics are available');
  }
};

const test6_SearchRequestsByStatus = async () => {
  console.log(cyan('\n── Test 6: Search Requests by Status ──'));
  const res = await request('GET', '/search/requests?status=completed', null, USER_TOKEN);
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  assert(Array.isArray(res.body.data), 'data is array');
  if (res.body.data?.length > 0) {
    const allCompleted = res.body.data.every((r) => r.status === 'completed');
    assert(allCompleted, 'All results have status=completed');
  }
};

const test7_SearchRequestsByDateRange = async () => {
  console.log(cyan('\n── Test 7: Search Requests by Date Range ──'));
  const res = await request(
    'GET',
    '/search/requests?startDate=2024-01-01&endDate=2027-12-31',
    null,
    USER_TOKEN
  );
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  assert(res.body.pagination !== undefined, 'pagination present');
};

const test8_SearchRequestsByKeyword = async () => {
  console.log(cyan('\n── Test 8: Search Requests by Keyword ──'));
  const res = await request('GET', '/search/requests?keyword=Delhi', null, USER_TOKEN);
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  assert(Array.isArray(res.body.data), 'data is array');
};

const test9_AdminSearchUsers = async () => {
  console.log(cyan('\n── Test 9: Admin Search Users ──'));
  const res = await request('GET', '/search/users?keyword=Amit&role=user', null, ADMIN_TOKEN);
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  assert(Array.isArray(res.body.data), 'data is array');
  if (res.body.data?.length > 0) {
    const allUsers = res.body.data.every((u) => u.role === 'user');
    assert(allUsers, 'All results have role=user');
  }

  // Non-admin should be blocked
  const res2 = await request('GET', '/search/users?keyword=Amit', null, USER_TOKEN);
  assert(res2.status === 403, 'Non-admin gets 403');
};

const test10_SearchWithPagination = async () => {
  console.log(cyan('\n── Test 10: Search with Pagination ──'));
  const res = await request('GET', '/search/mechanics?page=1&limit=5', null, USER_TOKEN);
  assert(res.status === 200, 'Status 200');
  assert(res.body.success === true, 'success = true');
  assert(res.body.pagination !== undefined, 'pagination object present');
  assert(res.body.pagination?.page === 1, 'page = 1');
  assert(res.body.pagination?.limit === 5, 'limit = 5');
  assert(typeof res.body.pagination?.total === 'number', 'total is number');
  assert(typeof res.body.pagination?.totalPages === 'number', 'totalPages is number');
  assert(typeof res.body.pagination?.hasNext === 'boolean', 'hasNext is boolean');
  assert(typeof res.body.pagination?.hasPrev === 'boolean', 'hasPrev is boolean');
  if (res.body.data) {
    assert(res.body.data.length <= 5, 'Max 5 results returned');
  }
};

const test11_RateLimitOnAuth = async () => {
  console.log(cyan('\n── Test 11: Rate Limit on Auth ──'));
  console.log(`  ${yellow('⚠')}  Sending 11 rapid login requests...`);

  let hitRateLimit = false;

  for (let i = 1; i <= 11; i++) {
    const res = await request('POST', '/auth/login', {
      email: 'test-ratelimit@example.com',
      password: 'wrongpassword',
    });
    if (res.status === 429) {
      hitRateLimit = true;
      console.log(`  ${green('✅')} Rate limit hit on request #${i}`);
      assert(
        res.body.message?.toLowerCase().includes('too many'),
        'Rate limit message contains "too many"'
      );
      break;
    }
  }

  assert(hitRateLimit, 'Rate limit (429) was triggered within 11 requests');
};

const test12_VerifyStandardResponseFormat = async () => {
  console.log(cyan('\n── Test 12: Verify Standard Response Format ──'));

  // Test success response
  const res1 = await request('GET', '/search/mechanics?page=1&limit=1', null, USER_TOKEN);
  assert(res1.body.success !== undefined, 'success field exists');
  assert(res1.body.message !== undefined, 'message field exists');
  assert(res1.body.data !== undefined, 'data field exists');
  assert(res1.body.timestamp !== undefined, 'timestamp field exists');

  // Test error response (404)
  const res2 = await request('GET', '/nonexistent-route', null, USER_TOKEN);
  assert(res2.body.success === false, 'Error: success = false');
  assert(res2.body.message !== undefined, 'Error: message field exists');
  assert(res2.body.timestamp !== undefined, 'Error: timestamp field exists');

  // Test paginated response
  assert(res1.body.pagination !== undefined, 'Paginated: pagination field exists');
};

// ============================================
// RUN ALL TESTS
// ============================================

const runAllTests = async () => {
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  🔍  DAY 11 — SEARCH, FILTERS & RATE LIMITING TESTS');
  console.log('══════════════════════════════════════════════════════');
  console.log('');

  // ── Step 0: Login ──
  console.log(cyan('── Logging in test accounts ──'));
  await loginUser();
  await loginAdmin();
  await loginMechanic();

  if (!USER_TOKEN) {
    console.log(red('\n❌ Cannot proceed without user token. Check seed data and server.'));
    process.exit(1);
  }

  // ── Run Tests ──
  await test1_SearchMechanicsByKeyword();
  await test2_SearchMechanicsBySpecialization();
  await test3_SearchMechanicsByRating();
  await test4_SearchMechanicsByLocation();
  await test5_SearchMechanicsAvailable();
  await test6_SearchRequestsByStatus();
  await test7_SearchRequestsByDateRange();
  await test8_SearchRequestsByKeyword();
  await test9_AdminSearchUsers();
  await test10_SearchWithPagination();
  await test11_RateLimitOnAuth();
  await test12_VerifyStandardResponseFormat();

  // ── Summary ──
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  📊 Results: ${green(`${passed} passed`)} / ${failed > 0 ? red(`${failed} failed`) : green(`${failed} failed`)}`);
  console.log(`  📋 Total:   ${passed + failed} tests`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');

  if (failed === 0) {
    console.log(green('  🎉 ALL TESTS PASSED! Day 11 is complete!'));
  } else {
    console.log(red(`  ⚠️  ${failed} test(s) failed. Check above for details.`));
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
};

runAllTests().catch((err) => {
  console.error(red('Test runner error:'), err.message);
  process.exit(1);
});
