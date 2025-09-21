/**
 * Security middleware for StrichBot API endpoints
 * Provides rate limiting, authentication, and request validation
 */

// In-memory rate limiting store
const rateLimitStore = new Map();

/**
 * Rate limiter with sliding window approach
 * @param {string} key - Unique identifier (usually IP address)
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} Rate limit status
 */
function rateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create request history for this key
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }

  const requests = rateLimitStore.get(key);

  // Remove requests outside the current window
  const validRequests = requests.filter(timestamp => timestamp > windowStart);

  // Check if limit exceeded
  if (validRequests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: validRequests[0] + windowMs,
      retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
    };
  }

  // Add current request
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);

  return {
    allowed: true,
    remaining: maxRequests - validRequests.length,
    resetTime: now + windowMs,
    retryAfter: 0
  };
}

/**
 * Validate cron secret for automated requests
 * @param {Object} req - Request object
 * @returns {boolean} Whether request is from legitimate cron job
 */
function validateCronSecret(req) {
  const cronSecret = process.env.CRON_SECRET;

  // If no cron secret is set, skip validation (backward compatibility)
  if (!cronSecret) {
    return true;
  }

  // Check for cron secret in header
  const providedSecret = req.headers['x-cron-secret'];
  return providedSecret === cronSecret;
}

/**
 * Validate API key for authorized manual testing
 * @param {Object} req - Request object
 * @returns {boolean} Whether request has valid API key
 */
function validateApiKey(req) {
  const apiKey = process.env.API_KEY;

  // If no API key is set, return false
  if (!apiKey) {
    return false;
  }

  // Check for API key in header
  const providedKey = req.headers['x-api-key'];
  return providedKey === apiKey;
}

/**
 * Get client IP address from request
 * @param {Object} req - Request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  // Vercel provides client IP in x-forwarded-for header
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Fallback to other headers
  return req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * Validate request method
 * @param {Object} req - Request object
 * @param {Array} allowedMethods - Array of allowed HTTP methods
 * @returns {boolean} Whether method is allowed
 */
function validateMethod(req, allowedMethods = ['GET', 'POST']) {
  return allowedMethods.includes(req.method);
}

/**
 * Validate User-Agent header to block suspicious bots
 * @param {Object} req - Request object
 * @returns {boolean} Whether User-Agent is acceptable
 */
function validateUserAgent(req) {
  const userAgent = req.headers['user-agent'] || '';

  // Block empty or suspicious user agents
  const suspiciousPatterns = [
    /^$/,                    // Empty user agent
    /bot/i,                  // Generic bots
    /crawler/i,              // Crawlers
    /spider/i,               // Spiders
    /scraper/i,              // Scrapers
    /curl\/[0-9]/,           // Basic curl (allow browsers with curl)
    /wget/i,                 // Wget
    /python-requests/i,      // Python requests library
    /go-http-client/i,       // Go HTTP client
  ];

  // Allow legitimate browsers and tools
  const allowedPatterns = [
    /mozilla/i,              // Browsers
    /chrome/i,               // Chrome
    /safari/i,               // Safari
    /firefox/i,              // Firefox
    /edge/i,                 // Edge
    /vercel/i,               // Vercel infrastructure
    /postman/i,              // Postman for testing
  ];

  // Check if user agent is explicitly allowed
  if (allowedPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }

  // Check if user agent is suspicious
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    return false;
  }

  // Allow unknown user agents that don't match suspicious patterns
  return true;
}

/**
 * Security middleware for posting endpoints
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Object} options - Security options
 * @returns {Object} Security check result
 */
function securityMiddleware(req, res, options = {}) {
  const {
    maxRequests = 3,           // Max requests per hour for posting endpoints
    windowMs = 60 * 60 * 1000, // 1 hour window
    allowedMethods = ['GET', 'POST'],
    requireAuth = true         // Require either cron secret or API key
  } = options;

  // Get client IP
  const clientIp = getClientIp(req);

  // Validate HTTP method
  if (!validateMethod(req, allowedMethods)) {
    return {
      allowed: false,
      status: 405,
      error: 'Method not allowed',
      headers: {
        'Allow': allowedMethods.join(', ')
      }
    };
  }

  // Validate User-Agent
  if (!validateUserAgent(req)) {
    return {
      allowed: false,
      status: 403,
      error: 'Forbidden: Suspicious user agent detected'
    };
  }

  // Check authentication for posting endpoints
  if (requireAuth) {
    const hasCronSecret = validateCronSecret(req);
    const hasApiKey = validateApiKey(req);

    if (!hasCronSecret && !hasApiKey) {
      // Apply rate limiting for unauthenticated requests
      const rateCheck = rateLimit(`ip:${clientIp}`, maxRequests, windowMs);

      if (!rateCheck.allowed) {
        return {
          allowed: false,
          status: 429,
          error: 'Rate limit exceeded',
          headers: {
            'Retry-After': rateCheck.retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.floor(rateCheck.resetTime / 1000).toString()
          }
        };
      }
    }
  }

  // Security check passed
  return {
    allowed: true,
    clientIp,
    authenticated: validateCronSecret(req) || validateApiKey(req)
  };
}

/**
 * Security headers for all responses
 * @param {Object} res - Response object
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
}

/**
 * Clean up old rate limit entries (call periodically)
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [key, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter(timestamp => timestamp > now - maxAge);
    if (validRequests.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validRequests);
    }
  }
}

// Clean up rate limit store every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 60 * 60 * 1000);
}

module.exports = {
  securityMiddleware,
  setSecurityHeaders,
  rateLimit,
  validateCronSecret,
  validateApiKey,
  getClientIp,
  validateMethod,
  validateUserAgent,
  cleanupRateLimitStore
};