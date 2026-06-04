// ============================================
// DAY 12 — COMPLETE BACKEND FLOW TEST
// ============================================
// Full 24-step service request lifecycle test.
// Tests the EXACT real-world scenario end to end:
//   Register → Login → Vehicle → Mechanic Profile →
//   Service Request → Accept → Status Updates →
//   Complete → Review → History → Notifications
//
// Uses EXISTING seed data (admin@roadside.com) and
// creates FRESH test users for isolation.
//
// Usage: node src/tests/test-full-lifecycle.js
//
// Prerequisites:
//   - Server running on port 5000
//   - PostgreSQL connected with seed data loaded
//   - Redis running (optional — server works without it)

const http = require('http');

// ── Config ──
const BASE_URL = 'http://localhost:5000/api';

// ── Token storage ──
let USER_TOKEN = '';
let MECHANIC_TOKEN = '';
let ADMIN_TOKEN = '';

// ── ID storage (captured during test) ──
let TEST_USER_ID = '';
let TEST_MECHANIC_ID = '';
let TEST_VEHICLE_ID = '';
let TEST_REQUEST_ID = '';
let TOWING_CATEGORY_ID = '';
let TEST_MECHANIC_PROFILE_ID = '';

// ── Test email uniqueness (timestamp-based) ──
const TS = Date.now();
const TEST_USER_EMAIL = `testuser_${TS}@lifecycle.com`;
const TEST_MECHANIC_EMAIL = `testmech_${TS}@lifecycle.com`;

// ── Console colors ──
const green = (t) => `\x1b[32m${t}\x1b[0m`;
const red = (t) => `\x1b[31m${t}\x1b[0m`;
const yellow = (t) => `\x1b[33m${t}\x1b[0m`;
const cyan = (t) => `\x1b[36m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;

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
let currentStep = 0;

const step = (name) => {
  currentStep++;
  console.log(cyan(`\n── Step ${currentStep}: ${name} ──`));
};

const assert = (condition, testName, details = '') => {
  if (condition) {
    console.log(`  ${green('✅ PASS')} — ${testName}`);
    passed++;
  } else {
    console.log(`  ${red('❌ FAIL')} — ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
  return condition;
};

// ============================================
// 24-STEP LIFECYCLE TEST
// ============================================

const runLifecycleTest = async () => {
  console.log('');
  console.log(bold('══════════════════════════════════════════════════════'));
  console.log(bold('  🔄  DAY 12 — FULL SERVICE REQUEST LIFECYCLE TEST'));
  console.log(bold('══════════════════════════════════════════════════════'));

  // ── Step 1: Register new user ──
  step('Register new user');
  const reg1 = await request('POST', '/auth/register', {
    full_name: 'Test User Lifecycle',
    email: TEST_USER_EMAIL,
    phone: `9${TS.toString().slice(-9)}`,
    password: 'Test@1234',
    role: 'user',
  });
  assert(reg1.status === 201, 'User registered (201)', `Got ${reg1.status}: ${reg1.body?.message}`);
  if (reg1.body.data?.user) TEST_USER_ID = reg1.body.data.user.id;

  // ── Step 2: Login as user ──
  step('Login as user');
  const login1 = await request('POST', '/auth/login', {
    email: TEST_USER_EMAIL,
    password: 'Test@1234',
  });
  assert(login1.status === 200, 'User login successful (200)');
  assert(login1.body.data?.accessToken, 'Access token received');
  assert(!login1.body.data?.user?.password_hash, 'password_hash NOT in response');
  if (login1.body.data?.accessToken) USER_TOKEN = login1.body.data.accessToken;

  // ── Step 3: Add vehicle ──
  step('Add vehicle (Honda City, DL01AB9999)');
  const veh = await request('POST', '/users/vehicles', {
    make: 'Honda',
    model: 'City',
    year: 2023,
    license_plate: `DL01AB${TS.toString().slice(-4)}`,
    fuel_type: 'petrol',
    color: 'Black',
  }, USER_TOKEN);
  assert(veh.status === 201, 'Vehicle added (201)', `Got ${veh.status}: ${veh.body?.message}`);
  if (veh.body.data?.vehicle) TEST_VEHICLE_ID = veh.body.data.vehicle.id;

  // ── Step 4: Register new mechanic ──
  step('Register new mechanic');
  const reg2 = await request('POST', '/auth/register', {
    full_name: 'Test Mechanic Lifecycle',
    email: TEST_MECHANIC_EMAIL,
    phone: `8${TS.toString().slice(-9)}`,
    password: 'Mech@1234',
    role: 'mechanic',
  });
  assert(reg2.status === 201, 'Mechanic registered (201)', `Got ${reg2.status}: ${reg2.body?.message}`);
  if (reg2.body.data?.user) TEST_MECHANIC_ID = reg2.body.data.user.id;

  // ── Step 5: Login as mechanic ──
  step('Login as mechanic');
  const login2 = await request('POST', '/auth/login', {
    email: TEST_MECHANIC_EMAIL,
    password: 'Mech@1234',
  });
  assert(login2.status === 200, 'Mechanic login successful (200)');
  if (login2.body.data?.accessToken) MECHANIC_TOKEN = login2.body.data.accessToken;

  // ── Step 6: Create mechanic profile ──
  step('Create mechanic profile');
  const prof = await request('PATCH', '/mechanics/profile', {
    business_name: 'Lifecycle Test Garage',
    experience_years: 3,
    specializations: ['towing', 'battery_jumpstart', 'breakdown_repair'],
    documents: { license: 'DL-12345', aadhar: 'UID-12345', certificate: 'CERT-12345' },
  }, MECHANIC_TOKEN);
  assert(prof.status === 200, 'Profile created (200)', `Got ${prof.status}: ${prof.body?.message}`);
  if (prof.body.data?.profile) TEST_MECHANIC_PROFILE_ID = prof.body.data.profile.id;

  // ── Step 7: Update mechanic location ──
  step('Update mechanic location (28.6139, 77.2090)');
  const loc = await request('PATCH', '/mechanics/location', {
    current_lat: 28.6139,
    current_lng: 77.2090,
  }, MECHANIC_TOKEN);
  assert(loc.status === 200, 'Location updated (200)');

  // ── Step 8: Set mechanic availability ──
  step('Set mechanic availability to true');
  const avail = await request('PATCH', '/mechanics/availability', {
    is_available: true,
  }, MECHANIC_TOKEN);
  assert(avail.status === 200, 'Availability set to true (200)');

  // ── Step 9: Login as admin ──
  step('Login as admin');
  const login3 = await request('POST', '/auth/login', {
    email: 'admin@roadside.com',
    password: 'Admin@123',
  });
  assert(login3.status === 200, 'Admin login successful (200)', `Got ${login3.status}: ${login3.body?.message}`);
  if (login3.body.data?.accessToken) ADMIN_TOKEN = login3.body.data.accessToken;

  // ── Step 10: Admin verifies the mechanic ──
  step('Admin verifies the mechanic');
  const verify = await request('PATCH', `/admin/mechanics/${TEST_MECHANIC_PROFILE_ID}/verify`, {
    is_verified: true,
  }, ADMIN_TOKEN);
  assert(verify.status === 200, 'Mechanic verified (200)', `Got ${verify.status}: ${verify.body?.message}`);

  // ── Get the Towing category ID ──
  const cats = await request('GET', '/services');
  if (cats.body.data?.categories) {
    const towing = cats.body.data.categories.find((c) => c.slug === 'towing');
    if (towing) TOWING_CATEGORY_ID = towing.id;
  }
  assert(TOWING_CATEGORY_ID, 'Towing category found', 'Category not in seed data');

  // ── Step 11: User creates service request ──
  step('User creates service request (Towing)');
  const req1 = await request('POST', '/requests', {
    vehicle_id: TEST_VEHICLE_ID,
    category_id: TOWING_CATEGORY_ID,
    breakdown_lat: 28.6139,
    breakdown_lng: 77.2090,
    breakdown_address: 'Connaught Place, New Delhi',
    description: 'Car broke down, need towing',
  }, USER_TOKEN);
  assert(req1.status === 201, 'Request created (201)', `Got ${req1.status}: ${req1.body?.message}`);
  if (req1.body.data?.request) TEST_REQUEST_ID = req1.body.data.request.id;

  // ── Step 12: Mechanic gets available requests ──
  step('Mechanic gets available requests');
  const avReq = await request('GET', '/requests/available', null, MECHANIC_TOKEN);
  assert(avReq.status === 200, 'Available requests fetched (200)');
  assert(avReq.body.data?.requests?.length > 0, 'At least 1 pending request visible');
  if (avReq.body.data?.requests) {
    const found = avReq.body.data.requests.some((r) => r.id === TEST_REQUEST_ID);
    assert(found, 'Our test request is in the available list');
  }

  // ── Step 13: Mechanic accepts the request ──
  step('Mechanic accepts the request');
  const accept = await request('PATCH', `/requests/${TEST_REQUEST_ID}/accept`, null, MECHANIC_TOKEN);
  assert(accept.status === 200, 'Request accepted (200)', `Got ${accept.status}: ${accept.body?.message}`);

  // ── Step 14: User checks active request ──
  step('User checks active request (should be accepted)');
  const active = await request('GET', '/requests/active', null, USER_TOKEN);
  assert(active.status === 200, 'Active request fetched (200)');
  assert(active.body.data?.request?.status === 'accepted', 'Status is "accepted"');

  // ── Step 15-18: Mechanic updates status step by step ──
  const statusUpdates = ['en_route', 'arrived', 'in_progress', 'completed'];
  for (const newStatus of statusUpdates) {
    const stepNum = 15 + statusUpdates.indexOf(newStatus);
    step(`Mechanic updates status to ${newStatus}`);
    const upd = await request('PATCH', `/requests/${TEST_REQUEST_ID}/status`, {
      status: newStatus,
    }, MECHANIC_TOKEN);
    assert(upd.status === 200, `Status → ${newStatus} (200)`, `Got ${upd.status}: ${upd.body?.message}`);
    if (upd.body.data?.request) {
      assert(upd.body.data.request.status === newStatus, `Confirmed status is "${newStatus}"`);
    }
  }

  // ── Step 19: User submits review ──
  step('User submits review (rating: 5)');
  const rev = await request('POST', '/reviews', {
    request_id: TEST_REQUEST_ID,
    rating: 5,
    comment: 'Excellent service! Very professional.',
  }, USER_TOKEN);
  assert(rev.status === 201, 'Review submitted (201)', `Got ${rev.status}: ${rev.body?.message}`);

  // ── Step 20: Admin checks dashboard ──
  step('Admin checks dashboard stats');
  const dash = await request('GET', '/admin/dashboard', null, ADMIN_TOKEN);
  assert(dash.status === 200, 'Dashboard fetched (200)');
  assert(dash.body.data?.stats !== undefined, 'Stats object present');

  // ── Step 21: User checks service history ──
  step('User checks service history');
  const hist = await request('GET', '/history', null, USER_TOKEN);
  assert(hist.status === 200, 'History fetched (200)');
  if (hist.body.data?.length > 0) {
    const found = hist.body.data.some((h) => h.id === TEST_REQUEST_ID && h.status === 'completed');
    assert(found, 'Completed request visible in history');
  } else {
    assert(false, 'History data returned', 'Empty or missing data array');
  }

  // ── Step 22: Mechanic checks job history ──
  step('Mechanic checks job history');
  const mechHist = await request('GET', '/history', null, MECHANIC_TOKEN);
  assert(mechHist.status === 200, 'Mechanic history fetched (200)');
  if (mechHist.body.data?.length > 0) {
    const found = mechHist.body.data.some((h) => h.id === TEST_REQUEST_ID && h.status === 'completed');
    assert(found, 'Completed job visible in mechanic history');
  } else {
    assert(false, 'Mechanic history data returned', 'Empty or missing data array');
  }

  // ── Step 23: User checks notifications ──
  step('User checks notifications');
  const notifs = await request('GET', '/notifications', null, USER_TOKEN);
  assert(notifs.status === 200, 'Notifications fetched (200)');
  const userNotifData = notifs.body.data?.notifications || notifs.body.data;
  assert(
    Array.isArray(userNotifData) && userNotifData.length > 0,
    'User has notifications'
  );

  // ── Step 24: Mechanic checks notifications ──
  step('Mechanic checks notifications');
  const mechNotifs = await request('GET', '/notifications', null, MECHANIC_TOKEN);
  assert(mechNotifs.status === 200, 'Mechanic notifications fetched (200)');
  const mechNotifData = mechNotifs.body.data?.notifications || mechNotifs.body.data;
  assert(
    Array.isArray(mechNotifData) && mechNotifData.length > 0,
    'Mechanic has notifications (review received)'
  );

  // ── SECURITY CHECKS ──
  console.log(cyan('\n── BONUS: Security Checks ──'));

  // password_hash never in response
  const me = await request('GET', '/auth/me', null, USER_TOKEN);
  assert(!me.body.data?.user?.password_hash, 'password_hash not in /auth/me response');

  // User cannot access mechanic routes
  const mechRoute = await request('GET', '/mechanics/profile', null, USER_TOKEN);
  assert(mechRoute.status === 403, 'User blocked from mechanic routes (403)');

  // Mechanic cannot access user-only routes (create request)
  const userRoute = await request('POST', '/requests', {
    vehicle_id: TEST_VEHICLE_ID,
    category_id: TOWING_CATEGORY_ID,
    breakdown_lat: 28.6,
    breakdown_lng: 77.2,
    breakdown_address: 'Test',
  }, MECHANIC_TOKEN);
  assert(userRoute.status === 403, 'Mechanic blocked from user-only routes (403)');

  // Non-admin blocked from admin routes
  const adminRoute = await request('GET', '/admin/dashboard', null, USER_TOKEN);
  assert(adminRoute.status === 403, 'Non-admin blocked from admin routes (403)');

  // No token → 401
  const noToken = await request('GET', '/auth/me');
  assert(noToken.status === 401, 'No token → 401 Unauthorized');

  // ══════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════
  console.log('');
  console.log(bold('══════════════════════════════════════════════════════'));
  console.log(`  📊 Results: ${green(`${passed} passed`)} / ${failed > 0 ? red(`${failed} failed`) : green(`${failed} failed`)}`);
  console.log(`  📋 Total:   ${passed + failed} tests`);
  console.log(bold('══════════════════════════════════════════════════════'));

  if (failed === 0) {
    console.log(green('\n  🎉 ALL 24 STEPS + SECURITY CHECKS PASSED!'));
    console.log(green('  Full service lifecycle works end to end.'));
  } else {
    console.log(red(`\n  ⚠️  ${failed} test(s) failed. Check above for details.`));
  }
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
};

runLifecycleTest().catch((err) => {
  console.error(red('Test runner error:'), err.message);
  process.exit(1);
});
