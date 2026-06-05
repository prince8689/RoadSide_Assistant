require('dotenv').config();
const { query, pool } = require('./src/config/db');
const { redisClient } = require('./src/config/redis');
const fetch = require('node-fetch');

async function runTests() {
  console.log('\n===========================================');
  console.log('🚀 RUNNING DAY 2 SYSTEM TESTS');
  console.log('===========================================\n');

  let passed = 0;
  let total = 5;

  try {
    // 1. Check Location Columns
    process.stdout.write('Test 1: Location columns in DB... ');
    const colsRes = await query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='mechanic_profiles' 
      AND column_name IN ('latitude', 'longitude', 'is_available')
    `);
    
    if (colsRes.rows.length >= 3) {
      console.log('✅ Passed');
      passed++;
    } else {
      console.log('❌ Failed (Missing columns. Run migrations)');
    }

    // 2. Check Haversine PL/pgSQL Function
    process.stdout.write('Test 2: find_nearby_mechanics function... ');
    try {
      await query('SELECT * FROM find_nearby_mechanics(28.6139, 77.2090, 50)');
      console.log('✅ Passed');
      passed++;
    } catch (err) {
      console.log(`❌ Failed (${err.message})`);
    }

    // 3. Insert Test Mechanic Location & Re-test Function
    process.stdout.write('Test 3: Insert location & test distance... ');
    try {
      const mechRes = await query('SELECT id FROM mechanic_profiles LIMIT 1');
      if (mechRes.rows.length > 0) {
        const mechId = mechRes.rows[0].id;
        await query(`
          UPDATE mechanic_profiles 
          SET latitude=28.6139, longitude=77.2090, is_available=true, is_verified=true 
          WHERE id=$1
        `, [mechId]);
        
        const nearbyRes = await query('SELECT * FROM find_nearby_mechanics(28.6139, 77.2090, 50)');
        if (nearbyRes.rows.length > 0) {
          console.log('✅ Passed (Found ' + nearbyRes.rows.length + ' mechanic)');
          passed++;
        } else {
          console.log('❌ Failed (No mechanic found within radius)');
        }
      } else {
        console.log('⚠️ Skipped (No mechanics in DB to test)');
        total--; // Don't count skipped
      }
    } catch (err) {
      console.log(`❌ Failed (${err.message})`);
    }

    // 4. API Endpoint Test
    process.stdout.write('Test 4: Nearby API Endpoint... ');
    try {
      const res = await fetch('http://localhost:5000/api/search/nearby?lat=28.6139&lng=77.2090&radius=50');
      const data = await res.json();
      if (res.status === 200 && data.success && Array.isArray(data.data.mechanics)) {
        console.log('✅ Passed');
        passed++;
      } else {
        console.log(`❌ Failed (Status: ${res.status})`);
      }
    } catch (err) {
      console.log(`❌ Failed (Is the server running? ${err.message})`);
    }

    // 5. Redis Caching Test
    process.stdout.write('Test 5: Redis Location Caching... ');
    try {
      const testKey = 'nearby:test_location_key';
      await redisClient.set(testKey, 'test_data', 'EX', 10);
      const val = await redisClient.get(testKey);
      if (val === 'test_data') {
        console.log('✅ Passed');
        passed++;
      } else {
        console.log('❌ Failed (Got wrong value from Redis)');
      }
    } catch (err) {
      console.log(`❌ Failed (${err.message})`);
    }

  } catch (error) {
    console.error('\nTest Suite Error:', error);
  } finally {
    console.log('\n===========================================');
    console.log(`🏁 Day 2 Tests: ${passed}/${total} passed`);
    console.log('===========================================\n');
    process.exit(0);
  }
}

runTests();
