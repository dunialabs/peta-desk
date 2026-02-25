/**
 * Socket.IO client for communicating with the peta-core Gateway.
 *
 * Features:
 * 1. Connect to the peta-core Socket.IO server with token authentication
 * 2. Listen for server notifications
 * 3. Handle request/response flows (e.g., user confirmation)
 * 4. Auto-reconnect
 * 5. Electron notification integration
 */

const { io } = require('socket.io-client')
const { Notification, app, dialog } = require('electron')
const {
  SocketEvents,
  NotificationTypes,
  SocketErrorCode,
  createSocketResponse
} = require('./socket-types')

/**
 * SocketClient class - singleton
 */
class SocketClient {
  constructor() {
    this.socket = null
    this.token = null
    this.serverUrl = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.notificationHandlers = [] // notification handlers
    this.requestHandlers = {} // request handler map
    this.connectionStatusCallback = null // connection status callback
  }

  /**
   * Set connection status callback
   * @param {Function} callback - callback receives (isConnected: boolean)
   */
  setConnectionStatusCallback(callback) {
    this.connectionStatusCallback = callback
  }

  /**
   * Connect to the Socket.IO server
   * @param {string} token - user token
   * @param {string} serverUrl - server address (e.g., http://localhost:3002)
   * @returns {Promise<boolean>} connection success flag
   */
  connect(token, serverUrl = 'http://localhost:3002') {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        console.warn('⚠️ Socket.IO already connected')
        resolve(true)
        return
      }

      this.token = token
      this.serverUrl = serverUrl

      console.log(`🔌 Connecting to Socket.IO server: ${serverUrl}`)

      // Create Socket connection
      this.socket = io(serverUrl, {
        auth: {
          token: token
        },
        extraHeaders: {
          Authorization: `Bearer ${token}`
        },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
        transports: ['websocket']
      })

      // Set event listeners
      this.setupEventListeners()

      // Listen for initial connection
      this.socket.once(SocketEvents.CONNECT, () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        console.log('✅ Socket.IO connected successfully')
        resolve(true)
      })

      // Listen for connection errors
      this.socket.once(SocketEvents.CONNECT_ERROR, (error) => {
        console.error('❌ Socket.IO connection error:', error.message)
        this.isConnected = false
        reject(error)
      })
    })
  }

  /**
   * Set event listeners
   */
  setupEventListeners() {
    if (!this.socket) return

    // ========== Connection events ==========
    this.socket.on(SocketEvents.CONNECT, () => {
      this.isConnected = true
      this.reconnectAttempts = 0
      console.log(`✅ Connected to Socket.IO server`)
      console.log(`   Socket ID: ${this.socket.id}`)

      // Notify connection status change
      if (this.connectionStatusCallback) {
        this.connectionStatusCallback(true)
      }

      // Send client info
      this.sendClientInfo()
    })

    this.socket.on(SocketEvents.DISCONNECT, (reason) => {
      this.isConnected = false
      console.log(`🔌 Disconnected from Socket.IO server: ${reason}`)

      // Notify connection status change
      if (this.connectionStatusCallback) {
        this.connectionStatusCallback(false)
      }
    })

    this.socket.on(SocketEvents.RECONNECT, (attemptNumber) => {
      this.isConnected = true
      this.reconnectAttempts = 0
      console.log(`🔄 Reconnected to Socket.IO server (attempt ${attemptNumber})`)

      // Notify connection status change
      if (this.connectionStatusCallback) {
        this.connectionStatusCallback(true)
      }

      // Resend client info after reconnect
      this.sendClientInfo()
    })

    this.socket.on(SocketEvents.CONNECT_ERROR, (error) => {
      this.isConnected = false
      this.reconnectAttempts++
      console.error(`❌ Socket.IO connection error (attempt ${this.reconnectAttempts}):`, error.message)

      // Notify connection status change
      if (this.connectionStatusCallback) {
        this.connectionStatusCallback(false)
      }

      // Auth error
      if (error.message.includes('Authentication')) {
        this.showNotification('Authentication failed', error.message, 'error')
      }
    })

    // ========== Server notifications ==========
    this.socket.on(SocketEvents.NOTIFICATION, (data) => {
      console.log('📬 Notification received:', data)
      this.handleNotification(data)
    })

    // ========== Message acknowledgment ==========
    this.socket.on(SocketEvents.ACK, (data) => {
      console.log('✅ Message acknowledged:', data)
    })

    // ========== Error messages ==========
    this.socket.on(SocketEvents.ERROR, (data) => {
      console.error('❌ Error from server:', data)
      this.showNotification('Server error', data.message || 'Unknown error', 'error')
    })

    // ========== Request/response ==========

    // User confirmation request
    this.socket.on(SocketEvents.ASK_USER_CONFIRM, async (request) => {
      await this.handleAskUserConfirm(request)
    })

    // Get client status
    this.socket.on(SocketEvents.GET_CLIENT_STATUS, async (request) => {
      await this.handleGetClientStatus(request)
    })

    // Get current page
    this.socket.on(SocketEvents.GET_CURRENT_PAGE, async (request) => {
      await this.handleGetCurrentPage(request)
    })

    // Get client config
    this.socket.on(SocketEvents.GET_CLIENT_CONFIG, async (request) => {
      await this.handleGetClientConfig(request)
    })

    // Get connection info
    this.socket.on(SocketEvents.GET_CONNECTION_INFO, async (request) => {
      await this.handleGetConnectionInfo(request)
    })

    // Get capabilities
    this.socket.on(SocketEvents.GET_CAPABILITIES, async (request) => {
      await this.handleGetCapabilities(request)
    })
  }

  /**
   * Send client info
   */
  sendClientInfo() {
    if (!this.socket || !this.socket.connected) return

    const os = require('os')
    const clientInfo = {
      deviceType: 'desktop',
      deviceName: os.hostname(),
      appVersion: app.getVersion(),
      platform: process.platform
    }

    this.socket.emit(SocketEvents.CLIENT_INFO, clientInfo)
    console.log('📱 Client info sent:', clientInfo)
  }

  /**
   * Send message to server
   * @param {string} event - event name
   * @param {*} data - message payload
   */
  sendMessage(event, data) {
    if (!this.socket || !this.socket.connected) {
      console.error('❌ Cannot send message: Socket not connected')
      return false
    }

    this.socket.emit(event, data)
    console.log(`📤 Message sent: event=${event}`, data)
    return true
  }

  /**
   * Handle notification
   * @param {Object} notification - notification payload
   */
  handleNotification(notification) {
    const { type, message, severity, data } = notification

    // Show desktop notification
    this.showNotification(this.formatNotificationType(type), message, severity)

    // Handle special cases by type
    switch (type) {
      case NotificationTypes.USER_DISABLED:
        console.warn('⚠️ User account disabled')
        // May trigger sign-out
        break

      case NotificationTypes.PERMISSION_CHANGED:
        console.log('🔐 User permissions changed')
        // Update local cache when capabilities data is included
        if (data && data.capabilities) {
          console.log('📋 Capabilities updated:', data.capabilities)
        }
        break

      case NotificationTypes.SYSTEM_MESSAGE:
        console.log('📢 System message received')
        break

      default:
        console.log(`📬 Notification type: ${type}`)
    }

    // Invoke registered notification handlers
    this.notificationHandlers.forEach(handler => {
      try {
        handler(notification)
      } catch (error) {
        console.error('❌ Notification handler error:', error)
      }
    })
  }

  /**
   * Format notification type
   * @param {string} type - notification type
   * @returns {string} formatted title
   */
  formatNotificationType(type) {
    const typeMap = {
      [NotificationTypes.USER_DISABLED]: 'Account disabled',
      [NotificationTypes.PERMISSION_CHANGED]: 'Permissions updated',
      [NotificationTypes.SYSTEM_MESSAGE]: 'System message',
      [NotificationTypes.SYSTEM_MAINTENANCE]: 'System maintenance',
      [NotificationTypes.SYSTEM_UPDATE]: 'System update'
    }
    return typeMap[type] || 'Notification'
  }

  /**
   * Show a desktop notification
   * @param {string} title - title
   * @param {string} body - body
   * @param {string} severity - severity
   */
  showNotification(title, body, severity = 'info') {
    if (!Notification.isSupported()) {
      console.warn('⚠️ Desktop notifications not supported')
      return
    }

    const notification = new Notification({
      title: title,
      body: body,
      urgency: severity === 'error' ? 'critical' : 'normal',
      silent: false
    })

    notification.show()
  }

  /**
   * Handle user confirmation request
   * @param {Object} request - request object
   */
  async handleAskUserConfirm(request) {
    console.log('🔔 Ask user confirm request:', request)

    try {
      const { toolName, toolDescription, toolParams } = request.data

      // Parse parameters
      let params
      try {
        params = JSON.parse(toolParams)
      } catch (e) {
        params = toolParams
      }

      // Build confirmation message
      const message = `Tool: ${toolName}\n\nDescription: ${toolDescription}\n\nParams:\n${JSON.stringify(params, null, 2)}\n\nProceed with this action?`

      // Show confirmation dialog
      const result = await dialog.showMessageBox({
        type: 'question',
        title: 'Confirm Action',
        message: message,
        buttons: ['Confirm', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      })

      // Send response
      const response = createSocketResponse(
        request.requestId,
        true,
        { confirmed: result.response === 0 }
      )

      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
      console.log(`✅ User confirm response sent: ${result.response === 0}`)

    } catch (error) {
      console.error('❌ Failed to handle ask user confirm:', error)

      const response = createSocketResponse(
        request.requestId,
        false,
        null,
        {
          code: SocketErrorCode.CLIENT_ERROR,
          message: error.message || 'Failed to show confirmation dialog'
        }
      )

      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
    }
  }

  /**
   * Handle get client status request
   * @param {Object} request - request object
   */
  async handleGetClientStatus(request) {
    console.log('📊 Get client status request:', request)

    try {
      const status = {
        platform: process.platform,
        appVersion: app.getVersion(),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        isPackaged: app.isPackaged
      }

      const response = createSocketResponse(request.requestId, true, status)
      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
      console.log('✅ Client status response sent')

    } catch (error) {
      console.error('❌ Failed to get client status:', error)

      const response = createSocketResponse(
        request.requestId,
        false,
        null,
        {
          code: SocketErrorCode.CLIENT_ERROR,
          message: error.message
        }
      )

      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
    }
  }

  /**
   * Handle get current page request
   * @param {Object} request - request object
   */
  async handleGetCurrentPage(request) {
    console.log('📄 Get current page request:', request)

    try {
      // Use registered handler when present
      if (this.requestHandlers[SocketEvents.GET_CURRENT_PAGE]) {
        const result = await this.requestHandlers[SocketEvents.GET_CURRENT_PAGE]()
        const response = createSocketResponse(request.requestId, true, result)
        this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
      } else {
        // Default response
        const response = createSocketResponse(
          request.requestId,
          true,
          { currentPage: 'unknown' }
        )
        this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
      }

    } catch (error) {
      console.error('❌ Failed to get current page:', error)

      const response = createSocketResponse(
        request.requestId,
        false,
        null,
        {
          code: SocketErrorCode.CLIENT_ERROR,
          message: error.message
        }
      )

      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
    }
  }

  /**
   * Handle get client config request
   * @param {Object} request - request object
   */
  async handleGetClientConfig(request) {
    console.log('⚙️ Get client config request:', request)

    try {
      if (this.requestHandlers[SocketEvents.GET_CLIENT_CONFIG]) {
        const result = await this.requestHandlers[SocketEvents.GET_CLIENT_CONFIG]()
        const response = createSocketResponse(request.requestId, true, result)
        this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
      } else {
        const response = createSocketResponse(
          request.requestId,
          true,
          { config: {} }
        )
        this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
      }

    } catch (error) {
      console.error('❌ Failed to get client config:', error)

      const response = createSocketResponse(
        request.requestId,
        false,
        null,
        {
          code: SocketErrorCode.CLIENT_ERROR,
          message: error.message
        }
      )

      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
    }
  }

  /**
   * Handle get connection info request
   * @param {Object} request - request object
   */
  async handleGetConnectionInfo(request) {
    console.log('🔗 Get connection info request:', request)

    try {
      const connectionInfo = {
        socketId: this.socket.id,
        connected: this.isConnected,
        serverUrl: this.serverUrl,
        transport: this.socket.io.engine.transport.name
      }

      const response = createSocketResponse(request.requestId, true, connectionInfo)
      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
      console.log('✅ Connection info response sent')

    } catch (error) {
      console.error('❌ Failed to get connection info:', error)

      const response = createSocketResponse(
        request.requestId,
        false,
        null,
        {
          code: SocketErrorCode.CLIENT_ERROR,
          message: error.message
        }
      )

      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
    }
  }

  /**
   * Handle get capabilities request
   * @param {Object} request - request object
   */
  async handleGetCapabilities(request) {
    console.log('🎯 Get capabilities request:', request)

    try {
      // Client typically returns an empty object and lets the server handle it
      // This event mainly triggers client UI updates
      const response = createSocketResponse(
        request.requestId,
        true,
        { capabilities: {} }
      )

      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
      console.log('✅ Capabilities response sent')

    } catch (error) {
      console.error('❌ Failed to handle get capabilities:', error)

      const response = createSocketResponse(
        request.requestId,
        false,
        null,
        {
          code: SocketErrorCode.CLIENT_ERROR,
          message: error.message
        }
      )

      this.socket.emit(SocketEvents.SOCKET_RESPONSE, response)
    }
  }

  /**
   * Register notification handler
   * @param {Function} handler - handler function
   */
  onNotification(handler) {
    if (typeof handler === 'function') {
      this.notificationHandlers.push(handler)
    }
  }

  /**
   * Register request handler
   * @param {string} eventName - event name
   * @param {Function} handler - handler function
   */
  onRequest(eventName, handler) {
    if (typeof handler === 'function') {
      this.requestHandlers[eventName] = handler
    }
  }

  /**
   * Configure server (send OAuth authorization info)
   * @param {string} serverId - server ID
   * @param {Array} authConf - authorization config array
   * @returns {Promise<Object>} response payload
   */
  async configureServer(serverId, authConf, restfulApiAuth, remoteAuth) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected')
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId()
      const timeout = setTimeout(() => {
        reject(new Error('Configure server request timeout'))
      }, 30000) // 30s timeout

      // listen for response
      const responseHandler = (response) => {
        if (response.requestId === requestId) {
          clearTimeout(timeout)
          this.socket.off('socket_response', responseHandler)

          if (response.success) {
            console.log('✅ Server configured successfully:', response.data)
            resolve(response.data)
          } else {
            console.error('❌ Server configuration failed:', response.error)
            reject(new Error(response.error?.message || 'Configuration failed'))
          }
        }
      }

      this.socket.on('socket_response', responseHandler)

      // send configuration request
      console.log('====================================')
      console.log('📡 Socket.IO: Emitting configure_server')
      console.log('====================================')
      console.log('Request ID:', requestId)
      console.log('Server ID:', serverId)
      console.log('Auth Config:', JSON.stringify(authConf, null, 2))
      console.log('====================================')

      this.socket.emit('configure_server', {
        requestId,
        data: {
          serverId,
          authConf,
          restfulApiAuth,
          remoteAuth
        },
        timestamp: Date.now()
      })
    })
  }

  /**
   * Unconfigure server (revoke authorization)
   * @param {string} serverId - server ID
   * @returns {Promise<Object>} response payload
   */
  async unconfigureServer(serverId) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected')
    }

    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId()
      const timeout = setTimeout(() => {
        reject(new Error('Unconfigure server request timeout'))
      }, 30000) // 30s timeout

      // listen for response
      const responseHandler = (response) => {
        if (response.requestId === requestId) {
          clearTimeout(timeout)
          this.socket.off('socket_response', responseHandler)

          if (response.success) {
            console.log('✅ Server unconfigured successfully:', response.data)
            resolve(response.data)
          } else {
            console.error('❌ Server unconfiguration failed:', response.error)
            reject(new Error(response.error?.message || 'Unconfiguration failed'))
          }
        }
      }

      this.socket.on('socket_response', responseHandler)

      // send unconfigure request
      console.log(`📤 Sending unconfigure_server request for serverId: ${serverId}`)
      this.socket.emit('unconfigure_server', {
        requestId,
        serverId
      })
    })
  }

  /**
   * Generate request ID
   * @returns {string} UUID
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server...')
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  /**
   * Check connection status
   * @returns {boolean}
   */
  getIsConnected() {
    return this.socket !== null && this.socket.connected
  }

  /**
   * Get Socket ID
   * @returns {string|null}
   */
  getSocketId() {
    return this.socket ? this.socket.id : null
  }
}

// Export singleton instance
const socketClient = new SocketClient()

module.exports = socketClient
