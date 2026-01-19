/**
 * Logger utility for production-safe logging
 *
 * In development: logs everything normally
 * In production: only logs errors to avoid log pollution
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Debug logs - only shown in development
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Info logs - only shown in development
   */
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args)
    }
  },

  /**
   * Warning logs - only shown in development
   */
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args)
    }
  },

  /**
   * Error logs - always shown (critical for monitoring)
   */
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args)
  },
}
