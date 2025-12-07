/**
 * Socket.IO utility functions
 *
 * Helpers for testing connections and validating config
 */

/**
 * Test server connection configuration
 *
 * Test connectivity before adding a server
 *
 * @param url - Server URL (e.g., http://localhost:3002)
 * @param token - Auth token
 * @param timeout - Timeout in ms (default 10s)
 * @returns Promise<{ success: boolean; error?: string; socketId?: string }>
 *
 * @example
 * ```tsx
 * const result = await testSocketConnection(
 *   'http://localhost:3002',
 *   'your-token-here'
 * )
 *
 * if (result.success) {
 *   console.log('Connection successful!', result.socketId)
 *   // Save server configuration
 * } else {
 *   alert(`Connection failed: ${result.error}`)
 * }
 * ```
 */
export async function testSocketConnection(
  url: string,
  token: string,
  timeout: number = 10000
): Promise<{ success: boolean; error?: string; socketId?: string }> {
  // Check if window.socketIO is available
  if (typeof window === 'undefined' || !window.socketIO) {
    return {
      success: false,
      error: 'Socket.IO client not available'
    }
  }

  return new Promise((resolve) => {
    let socket: any = null
    let timeoutId: NodeJS.Timeout | null = null

    try {
      // Create test connection
      socket = window.socketIO.createConnection(url, {
        auth: { token },
        reconnection: false, // Do not auto-reconnect during tests
        timeout: timeout,
        transports: ['websocket', 'polling']
      })

      // Set timeout
      timeoutId = setTimeout(() => {
        if (socket) {
          socket.disconnect()
        }
        resolve({
          success: false,
          error: 'Connection timeout'
        })
      }, timeout)

      // Listen for successful connect
      socket.once('connect', () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        const socketId = socket.id

        // Disconnect the test connection immediately
        socket.disconnect()

        resolve({
          success: true,
          socketId: socketId
        })
      })

      // Listen for connection errors
      socket.once('connect_error', (error: Error) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        if (socket) {
          socket.disconnect()
        }

        // Determine specific error reason based on error message
        let errorMessage = 'Connection failed'

        if (error.message.includes('Authentication')) {
          errorMessage = 'Authentication failed: Invalid or expired token'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Connection timeout: Server not responding'
        } else if (error.message.includes('refused')) {
          errorMessage = 'Connection refused: Server not running or incorrect address'
        } else if (error.message) {
          errorMessage = `Connection error: ${error.message}`
        }

        resolve({
          success: false,
          error: errorMessage
        })
      })

    } catch (error: any) {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      if (socket) {
        socket.disconnect()
      }

      resolve({
        success: false,
        error: error.message || 'Unknown error'
      })
    }
  })
}

/**
 * Validate server URL format
 *
 * @param url - Server address
 * @returns { valid: boolean; error?: string }
 */
export function validateServerUrl(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return {
      valid: false,
      error: 'Server address cannot be empty'
    }
  }

  try {
    const urlObj = new URL(url)

    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'Protocol must be http or https'
      }
    }

    // Check hostname
    if (!urlObj.hostname) {
      return {
        valid: false,
        error: 'Missing hostname'
      }
    }

    return { valid: true }

  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    }
  }
}

/**
 * Validate Token format (basic validation)
 *
 * @param token - Token string
 * @returns { valid: boolean; error?: string }
 */
export function validateToken(token: string): { valid: boolean; error?: string } {
  if (!token || token.trim() === '') {
    return {
      valid: false,
      error: 'Token cannot be empty'
    }
  }

  // Basic length check
  if (token.length < 10) {
    return {
      valid: false,
      error: 'Token too short'
    }
  }

  return { valid: true }
}

/**
 * Format connection status text
 *
 * @param isConnected - Whether connected
 * @param reconnectAttempts - Reconnection attempt count
 * @returns Status text
 */
export function formatConnectionStatus(
  isConnected: boolean,
  reconnectAttempts: number = 0
): string {
  if (isConnected) {
    return 'Connected'
  }

  if (reconnectAttempts > 0) {
    return `Reconnecting (${reconnectAttempts}/5)`
  }

  return 'Disconnected'
}

/**
 * Format connection duration
 *
 * @param lastConnectedAt - Last connection timestamp (milliseconds)
 * @returns Duration text
 */
export function formatConnectionDuration(lastConnectedAt?: number): string {
  if (!lastConnectedAt) {
    return 'Never connected'
  }

  const now = Date.now()
  const duration = now - lastConnectedAt
  const seconds = Math.floor(duration / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} days ago`
  } else if (hours > 0) {
    return `${hours} hours ago`
  } else if (minutes > 0) {
    return `${minutes} minutes ago`
  } else {
    return `${seconds} seconds ago`
  }
}

/**
 * Test multiple server connections
 *
 * @param servers - Server config list
 * @param timeout - Timeout per server
 * @returns Promise<Map<string, { success: boolean; error?: string }>>
 */
export async function testMultipleConnections(
  servers: Array<{ id: string; url: string; token: string }>,
  timeout: number = 10000
): Promise<Map<string, { success: boolean; error?: string }>> {
  const results = new Map<string, { success: boolean; error?: string }>()

  // Test all servers in parallel
  await Promise.all(
    servers.map(async (server) => {
      const result = await testSocketConnection(server.url, server.token, timeout)
      results.set(server.id, {
        success: result.success,
        error: result.error
      })
    })
  )

  return results
}

/**
 * Extend Window interface
 */
declare global {
  interface Window {
    socketIO: {
      createConnection: (url: string, options?: any) => any
    }
  }
}
