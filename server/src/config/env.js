// ============================================
// ENVIRONMENT CONFIGURATION VALIDATOR
// ============================================
// Validates all required environment variables exist on startup.
// Prevents the server from starting with missing configuration,
// which would cause cryptic runtime errors later.
//
// Called at the very top of app.js before any other module loads.

const validate = () => {
  const required = [
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('');
    console.error('═══ CONFIGURATION ERROR ═════════════════');
    console.error(`  ❌ Missing environment variables:`);
    missing.forEach((key) => {
      console.error(`     • ${key}`);
    });
    console.error('');
    console.error('  Fix: Copy .env.example → .env and fill in values');
    console.error('════════════════════════════════════════');
    console.error('');
    process.exit(1);
  }

  // Validate JWT_SECRET strength (minimum 32 characters)
  if (process.env.JWT_SECRET.length < 32) {
    console.error('');
    console.error('═══ SECURITY WARNING ════════════════════');
    console.error('  ⚠️  JWT_SECRET is too short (minimum 32 characters)');
    console.error('  Current length:', process.env.JWT_SECRET.length);
    console.error('════════════════════════════════════════');
    console.error('');
    process.exit(1);
  }
};

module.exports = { validate };
