const rateLimits = new Map();

/**
 * Rate limit socket events per user
 * Prevent spam and abuse
 * 
 * @param {string} userId - User UUID
 * @param {string} event - Event name
 * @param {number} maxPerMinute - Maximum allowed events per minute
 * @returns {boolean} True if allowed, false if rate limited
 */
const socketRateLimit = (userId, event, maxPerMinute) => {
  const key = `${userId}:${event}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  if (!rateLimits.has(key)) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  const limit = rateLimits.get(key);

  // Reset window if expired
  if (now > limit.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // Check if over limit
  if (limit.count >= maxPerMinute) {
    return false; // rate limited
  }

  limit.count++;
  return true;
};

// Clean up old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimits.entries()) {
    if (now > value.resetAt) {
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = { socketRateLimit };
