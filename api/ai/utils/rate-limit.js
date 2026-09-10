// Per-instance burst protection, not a distributed/global spending quota.
// Store only bounded counters; no tokens, images or application records.

const rateLimitStore = new Map();
const MAX_ENTRIES = 5000;

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(force = false) {
  const now = Date.now();
  if (!force && now - lastCleanup < CLEANUP_INTERVAL) return;
  
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart >= data.windowMs) {
      rateLimitStore.delete(key);
    }
  }
  lastCleanup = now;
}

/**
 * Check if request should be rate limited
 * @param {string} identifier - Unique identifier (userId or IP)
 * @param {Object} options - Rate limit options
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {number} options.windowMs - Window size in milliseconds
 * @returns {Object} - { allowed: boolean, remaining: number, retryAfter: number }
 */
export function checkRateLimit(identifier, options = {}) {
  const {
    maxRequests = 10,
    windowMs = 60000 // 1 minute default
  } = options;

  // Periodic cleanup
  cleanup();

  const key = identifier;
  const now = Date.now();
  
  let data = rateLimitStore.get(key);
  
  if (!data || now - data.windowStart >= windowMs) {
    if (!data && rateLimitStore.size >= MAX_ENTRIES) {
      cleanup(true);
      if (rateLimitStore.size >= MAX_ENTRIES) {
        return { allowed: false, remaining: 0, retryAfter: 60, limit: maxRequests, reset: now + 60000 };
      }
    }
    // Start new window
    data = {
      windowStart: now,
      windowMs,
      maxRequests,
      count: 0
    };
    rateLimitStore.set(key, data);
  }
  
  data.count = Math.min(maxRequests + 1, data.count + 1);
  
  const remaining = Math.max(0, maxRequests - data.count);
  const windowReset = data.windowStart + windowMs;
  const retryAfter = Math.ceil((windowReset - now) / 1000);
  
  if (data.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
      limit: maxRequests,
      reset: windowReset
    };
  }
  
  return {
    allowed: true,
    remaining,
    retryAfter: 0,
    limit: maxRequests,
    reset: windowReset
  };
}

/**
 * Create rate limit headers for response
 * @param {Object} result - Result from checkRateLimit
 * @returns {Object} - Headers object
 */
export function createRateLimitHeaders(result) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    ...(result.retryAfter > 0 && { 'Retry-After': result.retryAfter.toString() })
  };
}

/**
 * Middleware-style rate limit check
 * @param {string} identifier - User identifier
 * @param {Object} options - Rate limit options
 * @returns {Object|null} - Error response object or null if allowed
 */
export function rateLimitResponse(identifier, options = {}) {
  const result = checkRateLimit(identifier, options);
  
  if (!result.allowed) {
    return {
      status: 429,
      headers: createRateLimitHeaders(result),
      body: {
        error: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        message: `Too many requests. Please wait ${result.retryAfter} seconds before trying again.`
      }
    };
  }
  
  return null; // Request allowed
}

// Pre-configured rate limiters for common endpoints
export const recommendLimiter = (userId) => rateLimitResponse(`recommend:${userId}`, {
  maxRequests: 10,
  windowMs: 60000
});

export const visualizeLimiter = (userId) => rateLimitResponse(`visualize:${userId}`, {
  maxRequests: 5,
  windowMs: 60000
});

export const validatePhotoLimiter = (userId) => rateLimitResponse(`validate-photo:${userId}`, {
  maxRequests: 10,
  windowMs: 60000
});
