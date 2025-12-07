'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef
} from 'react'
import type { McpServerCapabilities } from '@/types/capabilities'
import { useConfirmDialogStore } from '@/store/confirm-dialog-store'
import { useLock } from '@/contexts/lock-context'
import { logger } from '@/lib/logger'

/**
 * Socket.IO notification data structure
 */
export interface SocketNotification {
  serverId: string // Which server this is from
  type: string
  message: string
  timestamp: number
  severity?: 'info' | 'warning' | 'error' | 'success'
  data?: any
}

/**
 * Socket.IO request data structure
 */
export interface SocketRequest<T = any> {
  requestId: string
  action: number
  data: T
  timestamp: number
}

/**
 * Server connection configuration
 */
export interface ServerConfig {
  id: string
  name: string
  url: string
  token: string
}

/**
 * Socket connection instance
 */
interface SocketConnection {
  serverId: string
  serverName: string
  socket: any
  isConnected: boolean
  lastConnectedAt?: number
  reconnectAttempts: number
  activeClientsCount?: number // Active MCP client count
  connectionFailed?: boolean // Mark whether connection failed after retries
  proxyKey?: string // proxyKey from peta-core
  token?: string // Store token for other flows
}

/**
 * Socket Context type definition
 */
interface SocketContextType {
  connections: Map<string, SocketConnection>
  notifications: SocketNotification[]

  // Connection management
  connectToServer: (
    config: ServerConfig
  ) => Promise<{ success: boolean; error?: string }>
  disconnectFromServer: (serverId: string) => void
  disconnectAll: () => void

  // Query methods
  isServerConnected: (serverId: string) => boolean
  getServerConnection: (serverId: string) => SocketConnection | undefined
  getAllConnectedServers: () => string[]

  // Message sending
  sendMessage: (serverId: string, eventName: string, data: any) => boolean

  // Notification management
  clearNotifications: () => void
  clearServerNotifications: (serverId: string) => void

  // Capability configuration management
  getCapabilities: (
    serverId: string
  ) => Promise<{
    success: boolean
    capabilities?: McpServerCapabilities
    error?: string
  }>
  setCapabilities: (
    serverId: string,
    capabilities: McpServerCapabilities
  ) => Promise<{ success: boolean; error?: string }>

  // Server configuration management (OAuth)
  configureServer: (
    serverId: string,
    mcpServerId: string,
    authConf: Array<{ key: string; value: string; dataType: number }>
  ) => Promise<{ success: boolean; data?: any; error?: string }>
  unconfigureServer: (
    serverId: string,
    mcpServerId: string
  ) => Promise<{ success: boolean; data?: any; error?: string }>

  // Update server name without reconnecting
  updateServerName: (serverId: string, newName: string) => void
}

/**
 * Socket Context
 */
const SocketContext = createContext<SocketContextType | undefined>(undefined)

/**
 * Socket Provider Props
 */
interface SocketProviderProps {
  children: ReactNode
  autoReconnect?: boolean // Whether to auto-reconnect on app startup (default true)
  storageKey?: string // localStorage storage key (default 'socket_servers')
}

/**
 * Socket Provider component
 *
 * Supports multiple server connections simultaneously, each server managed independently
 *
 * @example
 * ```tsx
 * <SocketProvider>
 *   {children}
 * </SocketProvider>
 * ```
 */
export function SocketProvider({
  children,
  autoReconnect = true, // Enable auto-reconnect, will prompt for master password to decrypt token
  storageKey = 'socket_servers'
}: SocketProviderProps) {
  const [connections, setConnections] = useState<Map<string, SocketConnection>>(
    new Map()
  )
  const [notifications, setNotifications] = useState<SocketNotification[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const { isLocked } = useLock()

  // Use ref to track connections for cleanup - avoids stale closure
  const connectionsRef = useRef<Map<string, SocketConnection>>(new Map())

  // Keep ref in sync with state
  useEffect(() => {
    connectionsRef.current = connections
  }, [connections])

  // Debug: Log connections changes (disabled in production for performance)
  // useEffect(() => {
  //   console.log(`🔍 Connections Map updated: ${connections.size} connection(s)`)
  //   connections.forEach((conn, id) => {
  //     console.log(`   - ${id}: ${conn.serverName} (${conn.isConnected ? 'connected' : 'disconnected'})`)
  //   })
  // }, [connections])

  // Save pending authorization requests (when app is locked)
  const [pendingConfirmRequest, setPendingConfirmRequest] = useState<{
    config: ServerConfig
    request: SocketRequest
    socket: any
  } | null>(null)

  /**
   * Create and configure Socket connection
   */
  const createSocketConnection = useCallback((config: ServerConfig): any => {
    if (typeof window === 'undefined' || !window.socketIO) {
      console.error('❌ window.socketIO not available')
      throw new Error(
        'window.socketIO not available - preload script may not be loaded'
      )
    }

    const socketOptions = {
      auth: {
        token: config.token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      // IMPORTANT: Force new Manager for each connection to avoid multiplex issues
      // When connecting to same URL with different tokens, we need separate connections
      forceNew: true,
      // Use query parameter to make each connection unique (prevents connection reuse)
      query: {
        clientId: config.id
      }
    }

    // Use new preload wrapper API to create socket
    const result = window.socketIO.createConnection(
      config.id,
      config.url,
      socketOptions
    )

    if (!result.success) {
      throw new Error(`Failed to create socket: ${result.error}`)
    }

    // Create a proxy object that forwards method calls to the socket in preload
    const socket = {
      id: null as string | null,
      connected: false,

      on: (eventName: string, handler: (...args: any[]) => void) => {
        window.socketIO.on(config.id, eventName, handler)
      },

      off: (eventName: string, handler: (...args: any[]) => void) => {
        window.socketIO.off(config.id, eventName, handler)
      },

      once: (eventName: string, handler: (...args: any[]) => void) => {
        // Simple once implementation: automatically remove after calling (simplified handling here)
        const wrappedHandler = (...args: any[]) => {
          handler(...args)
          window.socketIO.off(config.id, eventName, wrappedHandler)
        }
        window.socketIO.on(config.id, eventName, wrappedHandler)
      },

      emit: (eventName: string, ...args: any[]) => {
        window.socketIO.emit(config.id, eventName, ...args)
      },

      disconnect: () => {
        window.socketIO.disconnect(config.id)
      },

      // Properties for compatibility
      io: {
        engine: {
          transport: { name: 'unknown' }
        }
      },

      onAny: (handler: (eventName: string, ...args: any[]) => void) => {
        // onAny needs special handling, not implemented yet
        console.warn('[Socket Proxy] onAny not fully supported yet')
      },

      prependAny: (handler: (eventName: string, ...args: any[]) => void) => {
        // prependAny needs special handling, not implemented yet
        console.warn('[Socket Proxy] prependAny not fully supported yet')
      }
    }

    // ========== Connection Events ==========
    socket.on('connect', () => {
      // Update socket ID and connection status
      socket.id = window.socketIO.getSocketId(config.id)
      socket.connected = true

      setConnections((prev) => {
        const updated = new Map(prev)
        const conn = updated.get(config.id)
        if (conn) {
          conn.isConnected = true
          conn.lastConnectedAt = Date.now()
          conn.reconnectAttempts = 0
          conn.connectionFailed = false // Reset failed status on successful connection
        }
        return updated
      })

      // Update tray icon to show connected status
      if (window.electron?.updateConnectionStatus) {
        window.electron.updateConnectionStatus(true)
      }

      // Send client information
      socket.emit('client-info', {
        deviceType: 'desktop',
        serverName: config.name,
        platform:
          typeof navigator !== 'undefined' ? navigator.platform : 'unknown'
      })
    })

    // Listen for server_info event (proxyKey and serverName from peta-core)
    socket.on(
      'server_info',
      (data: { serverId: string; serverName: string; version?: string }) => {
        console.log('[Socket] Received server_info:', data)

        // Update mcpServers in localStorage with proxyKey and serverName
        try {
          const storedData = localStorage.getItem('mcpServers')
          if (storedData) {
            const servers = JSON.parse(storedData)
            let isFirstConnection = false

            const updatedServers = servers.map((server: any) => {
              if (server.id === config.id) {
                // Only override serverName on first add when there is no proxyKey
                isFirstConnection = !server.proxyKey
                return {
                  ...server,
                  ...(isFirstConnection ? { serverName: data.serverName } : {}), // Override serverName on the first connection
                  proxyKey: data.serverId,
                  coreVersion: data.version
                }
              }
              return server
            })
            localStorage.setItem('mcpServers', JSON.stringify(updatedServers))
            console.log(
              '[Socket] Updated server with proxyKey:',
              data.serverId,
              isFirstConnection ? '(first connection, serverName updated)' : ''
            )

            // Update connection with server info
            setConnections((prev) => {
              const updated = new Map(prev)
              const conn = updated.get(config.id)
              if (conn) {
                conn.proxyKey = data.serverId
                // Update serverName only on first connect
                if (isFirstConnection) {
                  conn.serverName = data.serverName
                }
              }
              return updated
            })
          }
        } catch (error) {
          console.error('[Socket] Failed to update server info:', error)
        }
      }
    )

    socket.on('disconnect', (reason: string) => {
      setConnections((prev) => {
        const updated = new Map(prev)
        const conn = updated.get(config.id)
        if (conn) {
          conn.isConnected = false
        }

        // Check if any server is still connected
        const hasAnyConnected = Array.from(updated.values()).some(
          (c) => c.isConnected
        )

        // Update tray icon - only show disconnected if ALL servers are disconnected
        if (window.electron?.updateConnectionStatus) {
          window.electron.updateConnectionStatus(hasAnyConnected)
        }

        return updated
      })
    })

    socket.on('connect_error', (error: Error) => {
      setConnections((prev) => {
        const updated = new Map(prev)
        const conn = updated.get(config.id)
        if (conn) {
          conn.isConnected = false
          conn.reconnectAttempts++
          // Mark as failed if reconnect attempts exceed 5
          if (conn.reconnectAttempts > 5) {
            conn.connectionFailed = true
          }
        }
        return updated
      })
    })

    // ========== Business Events ==========

    // Listen for notifications
    socket.on(
      'notification',
      (notification: Omit<SocketNotification, 'serverId'>) => {
        setNotifications((prev) => [
          {
            ...notification,
            serverId: config.id
          },
          ...prev
        ])

        // Handle special notifications
        if (notification.type === 'permission_changed') {
          // Trigger custom event to notify dashboard to refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('capabilities-changed', {
                detail: {
                  serverId: config.id,
                  serverName: config.name,
                  notification
                }
              })
            )
          }
        } else if (notification.type === 'online_sessions') {
          // Handle online sessions notification - update active clients count
          const sessionsData = notification.data?.sessions || []
          const clientsCount = sessionsData.length

          console.log(`\n📊 ============ Client Connection Count ============`)
          console.log(`Server: ${config.name}`)
          console.log(`Active Clients: ${clientsCount}`)
          console.log(`Sessions:`)
          sessionsData.forEach((session: any, index: number) => {
            console.log(
              `  ${index + 1}. ${session.clientName || 'Unknown'} (Session: ${
                session.sessionId
              })`
            )
          })
          console.log(`==================================================\n`)

          setConnections((prev) => {
            const updated = new Map(prev)
            const conn = updated.get(config.id)
            if (conn) {
              conn.activeClientsCount = clientsCount
            }
            return updated
          })
        }
      }
    )

    // ========== Request-Response Pattern ==========

    // Handle user confirmation requests
    socket.on('ask_user_confirm', async (request: SocketRequest) => {
      const { requestId, data } = request
      const {
        userAgent,
        ip,
        toolName,
        toolDescription,
        toolParams,
        dangerLevel
      } = data

      // Check if app is in locked state
      if (isLocked) {
        setPendingConfirmRequest({ config, request, socket })
        if (typeof window !== 'undefined' && window.electron?.focusWindow) {
          await window.electron.focusWindow().catch(() => {})
        }
        return
      }

      // Show window first so user can see it
      if (typeof window !== 'undefined' && window.electron?.focusWindow) {
        await window.electron.focusWindow().catch(() => {})
      }

      // Use global confirmation dialog
      if (typeof window !== 'undefined') {
        const confirmDialogStore = useConfirmDialogStore.getState()
        confirmDialogStore.openConfirm({
          serverId: config.id,
          serverName: config.name,
          requestId,
          userAgent: userAgent || 'Unknown',
          ip: ip || 'Unknown',
          toolName,
          toolDescription,
          toolParams: toolParams || '',
          onConfirm: (confirmed) => {
            socket.emit('socket_response', {
              requestId,
              success: true,
              data: { confirmed },
              timestamp: Date.now()
            })
          }
        })
      }
    })

    // Handle get client status request
    socket.on('get_client_status', (request: SocketRequest) => {
      const response = {
        requestId: request.requestId,
        success: true,
        data: {
          platform:
            typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
          userAgent:
            typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          language:
            typeof navigator !== 'undefined' ? navigator.language : 'unknown',
          online: typeof navigator !== 'undefined' ? navigator.onLine : true,
          serverName: config.name
        },
        timestamp: Date.now()
      }
      socket.emit('socket_response', response)
    })

    // Handle get current page request
    socket.on('get_current_page', (request: SocketRequest) => {
      const response = {
        requestId: request.requestId,
        success: true,
        data: {
          currentPage:
            typeof window !== 'undefined'
              ? window.location.pathname
              : 'unknown',
          url: typeof window !== 'undefined' ? window.location.href : 'unknown'
        },
        timestamp: Date.now()
      }
      socket.emit('socket_response', response)
    })

    // Handle get capabilities request
    socket.on('get_capabilities', (request: SocketRequest) => {
      const response = {
        requestId: request.requestId,
        success: true,
        data: { capabilities: {} },
        timestamp: Date.now()
      }
      console.log('[Socket] get_capabilities response:', response)
      socket.emit('socket_response', response)
      console.log('[Socket] get_capabilities response emitted')
    })

    return socket
  }, [])

  /**
   * Connect to server
   */
  const connectToServer = useCallback(
    async (
      config: ServerConfig
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        // If connection already exists, disconnect first
        const existing = connections.get(config.id)
        if (existing) {
          existing.socket.disconnect()
        }

        // Create new connection
        const socket = createSocketConnection(config)

        // Pre-register connection BEFORE waiting for connect event
        // This ensures the 'connect' event handler can find and update it
        setConnections((prev) => {
          const updated = new Map(prev)
          updated.set(config.id, {
            serverId: config.id,
            serverName: config.name,
            socket,
            isConnected: false, // Will be set to true by 'connect' event
            lastConnectedAt: undefined,
            reconnectAttempts: 0
          })
          return updated
        })

        // Wait for connection success or failure
        const connected = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            resolve(false)
          }, 10000) // 10 second timeout

          socket.once('connect', () => {
            clearTimeout(timeout)
            resolve(true)
          })

          socket.once('connect_error', (err: any) => {
            clearTimeout(timeout)
            resolve(false)
          })
        })

        if (!connected) {
          socket.disconnect()
          // Remove from connections Map
          setConnections((prev) => {
            const updated = new Map(prev)
            updated.delete(config.id)
            return updated
          })
          return {
            success: false,
            error: 'Connection timeout or authentication failed'
          }
        }

        // Connection successful - state already updated by 'connect' event handler
        return { success: true }
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Connection failed'
        }
      }
    },
    [connections, createSocketConnection]
  )

  /**
   * Disconnect from server
   */
  const disconnectFromServer = useCallback(
    (serverId: string) => {
      const conn = connections.get(serverId)
      if (conn) {
        conn.socket.disconnect()

        setConnections((prev) => {
          const updated = new Map(prev)
          updated.delete(serverId)
          return updated
        })
      }
    },
    [connections]
  )

  /**
   * Disconnect all connections
   */
  const disconnectAll = useCallback(() => {
    connections.forEach((conn) => {
      conn.socket.disconnect()
    })

    setConnections(new Map())
  }, [connections])

  /**
   * Update server name without reconnecting
   */
  const updateServerName = useCallback((serverId: string, newName: string) => {
    setConnections((prev) => {
      const updated = new Map(prev)
      const conn = updated.get(serverId)
      if (conn) {
        conn.serverName = newName
      }
      return updated
    })
  }, [])

  /**
   * Check if server is connected
   */
  const isServerConnected = useCallback(
    (serverId: string): boolean => {
      const conn = connections.get(serverId)
      return conn ? conn.isConnected : false
    },
    [connections]
  )

  /**
   * Get server connection information
   */
  const getServerConnection = useCallback(
    (serverId: string): SocketConnection | undefined => {
      return connections.get(serverId)
    },
    [connections]
  )

  /**
   * Get all connected server IDs
   */
  const getAllConnectedServers = useCallback((): string[] => {
    return Array.from(connections.entries())
      .filter(([_, conn]) => conn.isConnected)
      .map(([id, _]) => id)
  }, [connections])

  /**
   * Send message to specified server
   */
  const sendMessage = useCallback(
    (serverId: string, eventName: string, data: any): boolean => {
      const conn = connections.get(serverId)

      if (!conn || !conn.isConnected) {
        return false
      }

      try {
        conn.socket.emit(eventName, data)
        return true
      } catch (error) {
        return false
      }
    },
    [connections]
  )

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  /**
   * Clear notifications for specified server
   */
  const clearServerNotifications = useCallback((serverId: string) => {
    setNotifications((prev) => prev.filter((n) => n.serverId !== serverId))
  }, [])

  /**
   * Load server configurations from localStorage
   *
   * Note: Tokens read from mcpServers are encrypted and need to be decrypted when used
   * However, Socket.IO connections require the original token, so we use empty string here temporarily
   * The actual token will be passed when connecting from the mcp-setup page
   */
  const loadServersFromStorage = useCallback((): ServerConfig[] => {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      // First try to read from mcpServers (primary storage location)
      const mcpServersStr = localStorage.getItem('mcpServers')
      if (mcpServersStr) {
        const mcpServers = JSON.parse(mcpServersStr)
        if (Array.isArray(mcpServers)) {
          // Convert to format required by Socket
          // Note: token is encrypted in localStorage, use empty string here
          // Actual usage requires manual connection from mcp-setup page (with original token)
          const socketConfigs: ServerConfig[] = mcpServers.map(
            (server: any) => ({
              id: server.id,
              name: server.serverName,
              url: server.serverUrl,
              token: '' // Encrypted token cannot be directly used for Socket connection
            })
          )
          return socketConfigs
        }
      }

      // Fallback: try to read from old socket_servers
      const saved = localStorage.getItem(storageKey)
      if (!saved) {
        return []
      }

      const servers = JSON.parse(saved)
      if (!Array.isArray(servers)) {
        return []
      }

      return servers
    } catch (error) {
      console.error('❌ Failed to load servers from storage:', error)
      return []
    }
  }, [storageKey])

  /**
   * Save server configuration to localStorage
   */
  const saveServersToStorage = useCallback(
    (configs: ServerConfig[]) => {
      if (typeof window === 'undefined') {
        return
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(configs))
      } catch (error) {
        console.error('❌ Failed to save servers to storage:', error)
      }
    },
    [storageKey]
  )

  /**
   * Auto-reconnect saved servers on app start
   * Requires master password to decrypt token
   */
  useEffect(() => {
    if (!autoReconnect || isInitialized) {
      return
    }

    const initializeConnections = async () => {
      const servers = loadServersFromStorage()

      if (servers.length === 0) {
        setIsInitialized(true)
        return
      }

      // Check for encrypted token (empty token indicates encrypted)
      const hasEncryptedTokens = servers.some((s) => !s.token || s.token === '')

      if (hasEncryptedTokens) {
        // Read mcpServers to get full data including encrypted token
        const mcpServersStr = localStorage.getItem('mcpServers')
        if (!mcpServersStr) {
          setIsInitialized(true)
          return
        }

        const mcpServers = JSON.parse(mcpServersStr)

        // Trigger global event to request master password
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('request-master-password-for-reconnect', {
              detail: {
                servers: mcpServers,
                onDecrypted: async (decryptedServers: ServerConfig[]) => {
                  // Connect using decrypted config
                  await Promise.allSettled(
                    decryptedServers.map(async (server) => {
                      try {
                        await connectToServer(server)
                      } catch (error) {
                        // Silent error
                      }
                    })
                  )
                },
                onCancel: () => {
                  // User cancelled
                }
              }
            })
          )
        }
      } else {
        // Token not encrypted (or legacy format); connect directly
        await Promise.allSettled(
          servers.map(async (server) => {
            try {
              await connectToServer(server)
            } catch (error) {
              // Silent error
            }
          })
        )
      }

      setIsInitialized(true)
    }

    initializeConnections()
  }, [autoReconnect, isInitialized, loadServersFromStorage, connectToServer])

  /**
   * Update localStorage when connections change
   */
  useEffect(() => {
    if (!isInitialized) {
      return
    }

    // Extract current connection configs (without socket instance)
    const serverConfigs: ServerConfig[] = []

    connections.forEach((conn) => {
      // Fetch full config (including token) from localStorage
      const saved = loadServersFromStorage()
      const config = saved.find((s) => s.id === conn.serverId)

      if (config) {
        serverConfigs.push(config)
      }
    })

    // Persist only when connections exist
    if (serverConfigs.length > 0) {
      saveServersToStorage(serverConfigs)
    }
  }, [connections, isInitialized, loadServersFromStorage, saveServersToStorage])

  /**
   * Wrap connectToServer to auto-save on success
   */
  const connectToServerWithSave = useCallback(
    async (config: ServerConfig) => {
      const result = await connectToServer(config)

      if (result.success) {
        // Connection successful; save to localStorage
        const saved = loadServersFromStorage()
        const exists = saved.find((s) => s.id === config.id)

        if (!exists) {
          saveServersToStorage([...saved, config])
        } else {
          // Update existing config
          const updated = saved.map((s) => (s.id === config.id ? config : s))
          saveServersToStorage(updated)
        }
      }

      return result
    },
    [connectToServer, loadServersFromStorage, saveServersToStorage]
  )

  /**
   * Wrap disconnectFromServer to remove from localStorage
   */
  const disconnectFromServerWithRemove = useCallback(
    (serverId: string) => {
      disconnectFromServer(serverId)

      // Remove from localStorage
      const saved = loadServersFromStorage()
      const updated = saved.filter((s) => s.id !== serverId)
      saveServersToStorage(updated)
    },
    [disconnectFromServer, loadServersFromStorage, saveServersToStorage]
  )

  /**
   * Fetch capabilities
   */
  const getCapabilities = useCallback(
    async (
      serverId: string
    ): Promise<{
      success: boolean
      capabilities?: McpServerCapabilities
      error?: string
    }> => {
      const conn = connections.get(serverId)

      if (!conn) {
        return {
          success: false,
          error: 'Server does not exist'
        }
      }

      if (!conn.isConnected) {
        return {
          success: false,
          error: 'Not connected to server'
        }
      }

      try {
        // Generate unique request ID
        const requestId = `req_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`

        // Create Promise to wait for response
        const result = await new Promise<{
          success: boolean
          capabilities?: McpServerCapabilities
          error?: string
        }>((resolve) => {
          const timeout = setTimeout(() => {
            conn.socket.off('socket_response', responseHandler)
            resolve({
              success: false,
              error: 'Request timeout'
            })
          }, 10000)

          const responseHandler = (response: any) => {
            if (response.requestId === requestId) {
              clearTimeout(timeout)
              conn.socket.off('socket_response', responseHandler)

              if (response.success) {
                console.log(
                  '[Socket] get_capabilities response:',
                  response.data?.capabilities
                )
                resolve({
                  success: true,
                  capabilities: response.data?.capabilities || {}
                })
              } else {
                resolve({
                  success: false,
                  error: response.error?.message || 'Failed to get capabilities'
                })
              }
            }
          }

          conn.socket.on('socket_response', responseHandler)

          // Send request
          const request = {
            requestId,
            timestamp: Date.now()
          }
          conn.socket.emit('get_capabilities', request)
        })

        return result
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to get capabilities'
        }
      }
    },
    [connections]
  )

  /**
   * Set capability configuration
   */
  const setCapabilities = useCallback(
    async (
      serverId: string,
      capabilities: McpServerCapabilities
    ): Promise<{ success: boolean; error?: string }> => {
      const conn = connections.get(serverId)

      if (!conn || !conn.isConnected) {
        return {
          success: false,
          error: 'Not connected to server'
        }
      }

      try {
        // Generate unique request ID
        const requestId = `req_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`

        // Create Promise to wait for response
        const result = await new Promise<{ success: boolean; error?: string }>(
          (resolve) => {
            const timeout = setTimeout(() => {
              conn.socket.off('socket_response', responseHandler)
              resolve({
                success: false,
                error: 'Request timeout'
              })
            }, 10000)

            const responseHandler = (response: any) => {
              if (response.requestId === requestId) {
                clearTimeout(timeout)
                conn.socket.off('socket_response', responseHandler)

                if (response.success) {
                  resolve({ success: true })
                } else {
                  resolve({
                    success: false,
                    error:
                      response.error?.message || 'Failed to set capabilities'
                  })
                }
              }
            }

            conn.socket.on('socket_response', responseHandler)

            // Send request
            const requestData = {
              requestId,
              data: capabilities,
              timestamp: Date.now()
            }
            conn.socket.emit('set_capabilities', requestData)
          }
        )

        return result
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to set capabilities'
        }
      }
    },
    [connections]
  )

  /**
   * Configure server (OAuth authorization)
   */
  const configureServer = useCallback(
    async (
      serverId: string,
      mcpServerId: string,
      authConf: Array<{ key: string; value: string; dataType: number }>
    ): Promise<{ success: boolean; data?: any; error?: string }> => {
      const conn = connections.get(serverId)

      if (!conn || !conn.isConnected) {
        return {
          success: false,
          error: 'Not connected to server'
        }
      }

      try {
        // Generate unique request ID
        const requestId = `req_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`

        // Create Promise to wait for response
        const result = await new Promise<{
          success: boolean
          data?: any
          error?: string
        }>((resolve) => {
          const timeout = setTimeout(() => {
            conn.socket.off('socket_response', responseHandler)
            resolve({
              success: false,
              error: 'Request timeout'
            })
          }, 300000) // 300 second timeout

          const responseHandler = (response: any) => {
            if (response.requestId === requestId) {
              clearTimeout(timeout)
              conn.socket.off('socket_response', responseHandler)

              if (response.success) {
                resolve({
                  success: true,
                  data: response.data
                })
              } else {
                resolve({
                  success: false,
                  error: response.error?.message || 'Failed to configure server'
                })
              }
            }
          }

          conn.socket.on('socket_response', responseHandler)

          // Send request - conforms to core's new format: { requestId, data: { serverId, authConf } }
          const requestData = {
            requestId,
            data: {
              serverId: mcpServerId,
              authConf
            },
            timestamp: Date.now()
          }

          conn.socket.emit('configure_server', requestData)
        })

        return result
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to configure server'
        }
      }
    },
    [connections]
  )

  /**
   * Unconfigure server (revoke OAuth authorization)
   */
  const unconfigureServer = useCallback(
    async (
      serverId: string,
      mcpServerId: string
    ): Promise<{ success: boolean; data?: any; error?: string }> => {
      const conn = connections.get(serverId)

      if (!conn || !conn.isConnected) {
        return {
          success: false,
          error: 'Not connected to server'
        }
      }

      try {
        // Generate unique request ID
        const requestId = `req_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`

        // Create Promise to wait for response
        const result = await new Promise<{
          success: boolean
          data?: any
          error?: string
        }>((resolve) => {
          const timeout = setTimeout(() => {
            conn.socket.off('socket_response', responseHandler)
            resolve({
              success: false,
              error: 'Request timeout'
            })
          }, 30000) // 30 second timeout

          const responseHandler = (response: any) => {
            if (response.requestId === requestId) {
              clearTimeout(timeout)
              conn.socket.off('socket_response', responseHandler)

              if (response.success) {
                resolve({
                  success: true,
                  data: response.data
                })
              } else {
                resolve({
                  success: false,
                  error:
                    response.error?.message || 'Failed to unconfigure server'
                })
              }
            }
          }

          conn.socket.on('socket_response', responseHandler)

          // Send request - conforms to core's new format: { requestId, data: { serverId } }
          const requestData = {
            requestId,
            data: {
              serverId: mcpServerId
            },
            timestamp: Date.now()
          }
          conn.socket.emit('unconfigure_server', requestData)
        })

        return result
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to unconfigure server'
        }
      }
    },
    [connections]
  )

  /**
   * Listen for app locking events and save open authorization dialogs
   */
  useEffect(() => {
    const handleAppLocking = () => {
      const confirmDialogStore = useConfirmDialogStore.getState()
      if (confirmDialogStore.isOpen && confirmDialogStore.request) {
        const request = confirmDialogStore.request

        // Find corresponding socket from connections
        const conn = connections.get(request.serverId)
        if (conn) {
          // Save request
          setPendingConfirmRequest({
            config: {
              id: request.serverId,
              name: request.serverName,
              url: '', // URL is not important, only need socket reference
              token: ''
            },
            request: {
              requestId: request.requestId,
              action: 0,
              data: {
                userAgent: request.userAgent,
                toolName: request.toolName,
                toolDescription: request.toolDescription,
                toolParams: request.toolParams
              },
              timestamp: Date.now()
            },
            socket: conn.socket
          })

          // Close dialog (without calling onConfirm to avoid sending response)
          confirmDialogStore.closeSilently()
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('app-locking', handleAppLocking as any)
      return () => {
        window.removeEventListener('app-locking', handleAppLocking as any)
      }
    }
  }, [connections])

  /**
   * Listen for unlock events and handle pending authorization requests
   */
  useEffect(() => {
    if (!isLocked && pendingConfirmRequest) {
      const { config, request, socket } = pendingConfirmRequest
      const { requestId, data } = request
      const { userAgent, ip, toolName, toolDescription, toolParams } = data

      // Use global confirmation dialog
      if (typeof window !== 'undefined') {
        const confirmDialogStore = useConfirmDialogStore.getState()
        confirmDialogStore.openConfirm({
          serverId: config.id,
          serverName: config.name,
          requestId,
          userAgent: userAgent || 'Unknown',
          ip: ip || 'Unknown',
          toolName,
          toolDescription,
          toolParams: toolParams || '',
          onConfirm: (confirmed) => {
            socket.emit('socket_response', {
              requestId,
              success: true,
              data: { confirmed },
              timestamp: Date.now()
            })
          }
        })
      }

      // Clear pending request
      setPendingConfirmRequest(null)
    }
  }, [isLocked, pendingConfirmRequest])

  /**
   * Clean up all connections on component unmount ONLY
   * IMPORTANT: No dependencies - only run cleanup when component unmounts
   */
  useEffect(() => {
    return () => {
      // Use ref to get current connections without stale closure
      connectionsRef.current.forEach((conn, serverId) => {
        window.socketIO?.disconnect?.(serverId)
      })
    }
  }, []) // ✅ Empty deps - only cleanup on unmount

  const value: SocketContextType = {
    connections,
    notifications,
    connectToServer: connectToServerWithSave,
    disconnectFromServer: disconnectFromServerWithRemove,
    disconnectAll,
    isServerConnected,
    getServerConnection,
    getAllConnectedServers,
    sendMessage,
    clearNotifications,
    clearServerNotifications,
    getCapabilities,
    setCapabilities,
    configureServer,
    unconfigureServer,
    updateServerName
  }

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  )
}

/**
 * useSocket Hook
 *
 * Use Socket.IO connection management in any component
 */
export function useSocket(): SocketContextType {
  const context = useContext(SocketContext)

  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }

  return context
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
