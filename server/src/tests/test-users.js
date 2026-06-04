// ============================================
// DAY 4 — USER PROFILE + VEHICLE API TEST RUNNER
// ============================================
// Run: node src/tests/test-users.js
// Requires server running on port 5000.
// Tests all 8 user/vehicle endpoints + bonus tests.

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let userToken = '';
let otherUserToken = '';
let vehicleId = '';
let otherUserVehicleId = '';
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
  console.log('  🧪  USER + VEHICLE API TEST SUITE — DAY 4');
  console.log('══════════════════════════════════════════');

  // ─────────────────────────────────────────
  // SETUP: Register two test users + login
  // ─────────────────────────────────────────
  console.log('\n📝 SETUP: Creating test users...');

  // Register User 1 (main test user)
  let res = await makeRequest('POST', '/api/auth/register', {
    full_name: 'Test User Day4',
    email: 'day4user@test.com',
    phone: '9870000001',
    password: 'Test@1234',
    role: 'user',
  });

  if (res.status === 201) {
    userToken = res.body.data.accessToken;
    console.log('   ✅ User 1 registered: day4user@test.com');
  } else if (res.status === 409) {
    // Already exists, login instead
    res = await makeRequest('POST', '/api/auth/login', {
      email: 'day4user@test.com',
      password: 'Test@1234',
    });
    userToken = res.body.data.accessToken;
    console.log('   ✅ User 1 logged in: day4user@test.com');
  }

  // Register User 2 (other user for ownership tests)
  res = await makeRequest('POST', '/api/auth/register', {
    full_name: 'Other User Day4',
    email: 'day4other@test.com',
    phone: '9870000002',
    password: 'Test@1234',
    role: 'user',
  });

  if (res.status === 201) {
    otherUserToken = res.body.data.accessToken;
    console.log('   ✅ User 2 registered: day4other@test.com');
  } else if (res.status === 409) {
    res = await makeRequest('POST', '/api/auth/login', {
      email: 'day4other@test.com',
      password: 'Test@1234',
    });
    otherUserToken = res.body.data.accessToken;
    console.log('   ✅ User 2 logged in: day4other@test.com');
  }

  // Add a vehicle for User 2 (for ownership test later)
  res = await makeRequest('POST', '/api/users/vehicles', {
    make: 'BMW',
    model: 'X5',
    year: 2023,
    license_plate: 'DL99ZZ9999',
    fuel_type: 'diesel',
    color: 'Black',
  }, { Authorization: `Bearer ${otherUserToken}` });

  if (res.status === 201) {
    otherUserVehicleId = res.body.data.vehicle.id;
    console.log(`   ✅ User 2 vehicle added: ${otherUserVehicleId}`);
  } else if (res.status === 409) {
    // Vehicle already exists, fetch it
    res = await makeRequest('GET', '/api/users/vehicles', null, {
      Authorization: `Bearer ${otherUserToken}`,
    });
    if (res.body.data.vehicles.length > 0) {
      otherUserVehicleId = res.body.data.vehicles[0].id;
      console.log(`   ✅ User 2 existing vehicle: ${otherUserVehicleId}`);
    }
  }

  console.log('\n──────────────────────────────────────────');

  // ─────────────────────────────────────────
  // TEST 1: Get My Profile
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('GET', '/api/users/profile', null, {
      Authorization: `Bearer ${userToken}`,
    });
    const passed = res.status === 200 && res.body.data.user && !res.body.data.user.password_hash;
    logResult('Get My Profile', passed, 200, res.status,
      passed ? `User: ${res.body.data.user.full_name} (${res.body.data.user.email}), No password_hash: ✅` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Get My Profile', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 2: Update Profile
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('PATCH', '/api/users/profile', {
      full_name: 'Rahul Kumar Sharma',
      phone: '9876543299',
    }, { Authorization: `Bearer ${userToken}` });
    const passed = res.status === 200 && res.body.data.user.full_name === 'Rahul Kumar Sharma' && res.body.data.user.phone === '9876543299';
    logResult('Update Profile', passed, 200, res.status,
      passed ? `Updated: ${res.body.data.user.full_name}, Phone: ${res.body.data.user.phone}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Update Profile', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 3: Add Vehicle
  // ─────────────────────────────────────────
  try {
    // First clean up any existing vehicle with this plate
    const res = await makeRequest('POST', '/api/users/vehicles', {
      make: 'Honda',
      model: 'City',
      year: 2020,
      license_plate: 'DL01AB1234',
      fuel_type: 'petrol',
      color: 'White',
    }, { Authorization: `Bearer ${userToken}` });
    const passed = res.status === 201 && res.body.data.vehicle.id;
    if (passed) vehicleId = res.body.data.vehicle.id;
    logResult('Add Vehicle', passed, 201, res.status,
      passed ? `Vehicle ID: ${vehicleId}, Plate: ${res.body.data.vehicle.license_plate}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Add Vehicle', false, 201, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 4: Get All My Vehicles
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('GET', '/api/users/vehicles', null, {
      Authorization: `Bearer ${userToken}`,
    });
    const passed = res.status === 200 && Array.isArray(res.body.data.vehicles) && res.body.data.vehicles.length > 0;
    logResult('Get All My Vehicles', passed, 200, res.status,
      passed ? `Count: ${res.body.data.count} vehicles` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Get All My Vehicles', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 5: Update Vehicle
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('PATCH', `/api/users/vehicles/${vehicleId}`, {
      color: 'Black',
      fuel_type: 'diesel',
    }, { Authorization: `Bearer ${userToken}` });
    const passed = res.status === 200 && res.body.data.vehicle.color === 'Black' && res.body.data.vehicle.fuel_type === 'diesel';
    logResult('Update Vehicle', passed, 200, res.status,
      passed ? `Color: ${res.body.data.vehicle.color}, Fuel: ${res.body.data.vehicle.fuel_type}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Update Vehicle', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 6: Get Single Vehicle
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('GET', `/api/users/vehicles/${vehicleId}`, null, {
      Authorization: `Bearer ${userToken}`,
    });
    const passed = res.status === 200 && res.body.data.vehicle.id === vehicleId;
    logResult('Get Single Vehicle', passed, 200, res.status,
      passed ? `Vehicle: ${res.body.data.vehicle.make} ${res.body.data.vehicle.model}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Get Single Vehicle', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 7: Access Another User's Vehicle (403)
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('DELETE', `/api/users/vehicles/${otherUserVehicleId}`, null, {
      Authorization: `Bearer ${userToken}`,
    });
    const passed = res.status === 403;
    logResult("Access Another User's Vehicle → 403", passed, 403, res.status,
      passed ? `Error: ${res.body.error}` : JSON.stringify(res.body));
  } catch (err) {
    logResult("Access Another User's Vehicle → 403", false, 403, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 8: Duplicate License Plate (409)
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('POST', '/api/users/vehicles', {
      make: 'Toyota',
      model: 'Innova',
      year: 2022,
      license_plate: 'DL01AB1234',
      fuel_type: 'diesel',
      color: 'Red',
    }, { Authorization: `Bearer ${userToken}` });
    const passed = res.status === 409;
    logResult('Duplicate License Plate → 409', passed, 409, res.status,
      passed ? `Error: ${res.body.error}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Duplicate License Plate → 409', false, 409, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 9: Delete Vehicle
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('DELETE', `/api/users/vehicles/${vehicleId}`, null, {
      Authorization: `Bearer ${userToken}`,
    });
    const passed = res.status === 200 && res.body.message === 'Vehicle deleted successfully';
    logResult('Delete Vehicle', passed, 200, res.status,
      passed ? `Message: ${res.body.message}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('Delete Vehicle', false, 200, 'ERROR', err.message);
  }

  // ─────────────────────────────────────────
  // TEST 10: Access Without Token (401)
  // ─────────────────────────────────────────
  try {
    const res = await makeRequest('GET', '/api/users/profile');
    const passed = res.status === 401;
    logResult('No Token → 401', passed, 401, res.status,
      passed ? `Error: ${res.body.message}` : JSON.stringify(res.body));
  } catch (err) {
    logResult('No Token → 401', false, 401, 'ERROR', err.message);
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
