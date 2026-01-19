import { NextResponse } from 'next/server'

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  limit: number
  /**
   * Time window in milliseconds
   */
  windowMs: number
  /**
   * Custom message when rate limit is exceeded
   */
  message?: string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// In production with multiple servers, consider using Redis
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Rate limiting helper using sliding window algorithm
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Response with rate limit info or null if not rate limited
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): NextResponse | null {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now > entry.resetTime) {
    // First request or window expired - create new entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return null
  }

  // Increment counter
  entry.count++

  // Check if limit exceeded
  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

    return NextResponse.json(
      {
        error: config.message || 'Trop de requêtes. Veuillez réessayer plus tard.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    )
  }

  // Update entry
  rateLimitStore.set(identifier, entry)
  return null
}

/**
 * Get rate limit headers for successful requests
 */
export function getRateLimitHeaders(
  identifier: string,
  config: RateLimitConfig
): Record<string, string> {
  const entry = rateLimitStore.get(identifier)

  if (!entry) {
    return {
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': config.limit.toString(),
      'X-RateLimit-Reset': (Date.now() + config.windowMs).toString(),
    }
  }

  return {
    'X-RateLimit-Limit': config.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, config.limit - entry.count).toString(),
    'X-RateLimit-Reset': entry.resetTime.toString(),
  }
}

/**
 * Helper to get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  // Fallback for local development
  return 'unknown'
}
