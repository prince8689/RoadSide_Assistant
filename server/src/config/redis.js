// ============================================
// REDIS CACHE CONNECTION
// ============================================
// Uses ioredis — a robust, full-featured Redis client
// for Node.js with built-in reconnection, Lua scripting,
// cluster support, and Promises.

const Redis = require('ioredis');

// Create Redis client with configuration
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,         // Retry failed commands up to 3 times
  retryStrategy(times) {
    // Reconnect after increasing delays, max 30 seconds
    const delay = Math.min(times * 500, 30000);
    console.log(`🔄 Redis reconnecting in ${delay}ms... (attempt ${times})`);
    return delay;
  },
  lazyConnect: true, // Don't connect until explicitly called
});

// ---- Event Listeners ----

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
  console.log(`   📡 Host: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
});

redisClient.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

redisClient.on('close', () => {
  console.warn('⚠️  Redis connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

/**
 * Connect to Redis and verify the connection.
 * Called once at server startup.
 */
const connectRedis = async () => {
  try {
    await redisClient.connect();
    const pong = await redisClient.ping();

    if (pong === 'PONG') {
      console.log('   ✅ Redis PING → PONG (healthy)');
    }

    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection failed:');
    console.error(`   Host: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    console.error(`   Error: ${error.message}`);
    // Redis is non-critical — warn but don't crash the server
    console.warn('⚠️  Server will continue without Redis cache');
  }
};

module.exports = {
  redisClient,
  connectRedis,
};
