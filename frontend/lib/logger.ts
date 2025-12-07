/**
 * Logger utility for development and production environments
 * In production, only errors and warnings are logged to reduce performance overhead
 */

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  /**
   * Debug logs - only in development
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Info logs - only in development
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },

  /**
   * Warning logs - always enabled
   */
  warn: (...args: any[]) => {
    console.warn(...args)
  },

  /**
   * Error logs - always enabled
   */
  error: (...args: any[]) => {
    console.error(...args)
  },

  /**
   * Log with custom condition
   */
  conditional: (condition: boolean, ...args: any[]) => {
    if (condition) {
      console.log(...args)
    }
  }
}

export default logger
