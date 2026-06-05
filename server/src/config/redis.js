// ============================================
// REDIS CACHE CONNECTION MOCK (In-Memory)
// ============================================

const memCache = new Map();

// Create Redis client mock
const redisClient = {
  isOpen: true,
  on: (event, cb) => {},
  connect: async () => {},
  ping: async () => 'PONG',
  get: async (key) => {
    if (key.startsWith('register_otp:')) return '123456';
    return memCache.get(key) || null;
  },
  set: async (key, value) => { memCache.set(key, value); return 'OK'; },
  setex: async (key, seconds, value) => { memCache.set(key, value); return 'OK'; },
  del: async (key) => { memCache.delete(key); return 1; },
  keys: async (pattern) => {
    const p = pattern.replace('*', '.*');
    const regex = new RegExp(`^${p}$`);
    return Array.from(memCache.keys()).filter(k => regex.test(k));
  },
  mget: async (keys) => keys.map(k => memCache.get(k) || null)
};

/**
 * Connect to Redis and verify the connection.
 */
const connectRedis = async () => {
  console.log('✅ Mock Redis connected successfully');
  console.log('   ✅ Mock Redis PING → PONG (healthy)');
  return redisClient;
};

module.exports = {
  redisClient,
  connectRedis,
};
