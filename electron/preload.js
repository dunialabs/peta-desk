const { contextBridge, ipcRenderer } = require('electron')

// Debug logging to verify preload execution
console.log('=== PRELOAD.JS STARTING ===')
console.log('contextBridge available:', !!contextBridge)
console.log('ipcRenderer available:', !!ipcRenderer)

// Load socket.io-client - need to handle the require differently
let io
try {
  const socketIOClient = require('socket.io-client')
  console.log('socket.io-client module:', socketIOClient)
  console.log('socket.io-client.io:', socketIOClient.io)
  console.log('typeof socket.io-client.io:', typeof socketIOClient.io)
  console.log('typeof socket.io-client:', typeof socketIOClient)

  // The socket.io-client module exports the io function and also exposes .io
  // Either form works; prefer the module directly for safety
  io = socketIOClient

  console.log('socket.io-client loaded successfully')
  console.log('io function:', io)
  console.log('io function type:', typeof io)
} catch (error) {
  console.warn('socket.io-client not available in preload, will expose via different method:', error.message)
}

// Early fix for Next.js RSC flight requests under file:// protocol
// This runs before any page scripts, so it can catch initial fetches
;(() => {
  try {
    if (typeof window === 'undefined') return
    // Preload runs in isolated world; location is available
    if (location.protocol !== 'file:') return

    const rewriteToRelative = (url) => {
      try {
        if (typeof url !== 'string') return null

        // Handle absolute paths - convert to relative
        if (url.startsWith('/')) {
          // Special handling for .txt files (Next.js RSC flight data)
          if (url.endsWith('.txt') || url.includes('.txt?')) {
            return '.' + url
          }
          return '.' + url
        }

        // Handle file:/// URLs - these need to be relative to the current document
        if (url.startsWith('file:///')) {
          const filePath = url.replace('file:///', '')
          // If it's just a filename without path, make it relative
          if (!filePath.includes('/')) {
            return './' + filePath
          }
          return new URL('./' + filePath, location.href).toString()
        }
      } catch (e) {
        console.warn('URL rewrite failed:', e)
      }
      return null
    }

    // Patch fetch
    if (typeof window.fetch === 'function') {
      const originalFetch = window.fetch.bind(window)
      window.fetch = (input, init) => {
        try {
          let urlStr
          if (typeof input === 'string') urlStr = input
          else if (input instanceof URL) urlStr = input.toString()
          else if (input && typeof input === 'object' && 'url' in input)
            urlStr = input.url
          const rewritten = rewriteToRelative(urlStr)
          if (rewritten) {
            if (typeof input === 'string') return originalFetch(rewritten, init)
            if (input instanceof URL)
              return originalFetch(new URL(rewritten, location.href), init)
            return originalFetch(new Request(rewritten, input), init)
          }
        } catch {}
        return originalFetch(input, init)
      }
    }

    // Patch XHR
    const originalOpen =
      XMLHttpRequest &&
      XMLHttpRequest.prototype &&
      XMLHttpRequest.prototype.open
    if (originalOpen) {
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        try {
          if (typeof url === 'string') {
            const rewritten = rewriteToRelative(url)
            if (rewritten) url = rewritten
          }
        } catch {}
        return originalOpen.call(this, method, url, ...rest)
      }
    }
  } catch {}
})()

// Backward-compatible API
contextBridge.exposeInMainWorld('electronAPI', {
  // Gateway URL no longer required, kept for compatibility
  getGatewayURL: () => 'electron://localhost',
  // Backup management API
  getBackups: () => ipcRenderer.invoke('backup:getBackups'),
  getBackupData: (filename) => ipcRenderer.invoke('backup:getBackupData', filename),
  createBackup: (data) => ipcRenderer.invoke('backup:createBackup', data),
  // Note: restoreBackup is deprecated; the renderer writes to localStorage directly
  deleteBackup: (filename) =>
    ipcRenderer.invoke('backup:deleteBackup', filename),
  downloadBackup: (filename) =>
    ipcRenderer.invoke('backup:downloadBackup', filename),

  // Google Drive API
  googleDrive: {
    authenticate: (clientId, clientSecret) =>
      ipcRenderer.invoke('googledrive:authenticate', { clientId, clientSecret }),
    isAuthenticated: () => ipcRenderer.invoke('googledrive:isAuthenticated'),
    getUserInfo: () => ipcRenderer.invoke('googledrive:getUserInfo'),
    logout: () => ipcRenderer.invoke('googledrive:logout'),
    uploadBackup: (filename) => ipcRenderer.invoke('googledrive:uploadBackup', filename),
    downloadBackup: (fileId, fileName) => ipcRenderer.invoke('googledrive:downloadBackup', fileId, fileName),
    listBackups: () => ipcRenderer.invoke('googledrive:listBackups'),
    deleteBackup: (fileId) => ipcRenderer.invoke('googledrive:deleteBackup', fileId)
  }
})

console.log('=== EXPOSING window.electron API ===')

contextBridge.exposeInMainWorld('electron', {
  hideQuickPanel: () => ipcRenderer.send('hide-quick-panel'),
  showSettings: () => ipcRenderer.send('show-settings'),
  checkInstalledApps: () => ipcRenderer.invoke('check-installed-apps'),
  // Connection state management
  updateConnectionStatus: (connected) =>
    ipcRenderer.send('update-connection-status', connected),
  getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),

  // Server state management (tray icon)
  updateServersStatus: (hasServers) =>
    ipcRenderer.send('update-servers-status', hasServers),
  
  // Lock state management
  getLockStatus: () => ipcRenderer.invoke('get-lock-status'),
  setLockStatus: (lockData) => ipcRenderer.invoke('set-lock-status', lockData),

  // Biometric authentication API
  biometric: {
    // Check whether biometrics is available
    isAvailable: () => ipcRenderer.invoke('biometric-is-available'),
    // Perform biometric authentication
    authenticate: (reason) =>
      ipcRenderer.invoke('biometric-authenticate', reason),
    // Get stored password
    getPassword: () => ipcRenderer.invoke('biometric-get-password')
  },

  // Master password API
  password: {
    // Store master password
    store: (password) => ipcRenderer.invoke('password-store', password),
    // Verify master password
    verify: (password) => ipcRenderer.invoke('password-verify', password),
    // Update master password
    update: (oldPassword, newPassword) =>
      ipcRenderer.invoke('password-update', oldPassword, newPassword),
    // Check whether a master password exists
    has: () => ipcRenderer.invoke('password-has'),
    // Delete master password
    remove: () => ipcRenderer.invoke('password-remove')
  },

  // Token encryption/decryption API
  crypto: {
    // Encrypt token
    encryptToken: (token, masterPassword) =>
      ipcRenderer.invoke('crypto-encrypt-token', token, masterPassword),
    // Decrypt token
    decryptToken: (encryptedToken, masterPassword) =>
      ipcRenderer.invoke('crypto-decrypt-token', encryptedToken, masterPassword)
  },

  // Context menu API
  contextMenu: {
    // Show DangerLevel selection menu
    showDangerLevelMenu: (position, currentLevel) =>
      ipcRenderer.invoke('context-menu-show-danger-level', position, currentLevel)
  },

  // MCP config management API
  mcpConfig: {
    // Remove server from config
    removeServer: (appName, serverName) =>
      ipcRenderer.invoke('mcp-config-remove-server', appName, serverName),
    // Add server to config
    addServer: (appName, serverName, serverConfig) =>
      ipcRenderer.invoke(
        'mcp-config-add-server',
        appName,
        serverName,
        serverConfig
      ),
    // Update server in config
    updateServer: (appName, oldServerName, newServerName, serverConfig) =>
      ipcRenderer.invoke(
        'mcp-config-update-server',
        appName,
        oldServerName,
        newServerName,
        serverConfig
      ),
    // Get all servers from config
    getServers: (appName) =>
      ipcRenderer.invoke('mcp-config-get-servers', appName),
    // Check whether the config exists
    exists: (appName) => ipcRenderer.invoke('mcp-config-exists', appName)
  },

  // Proxy management API
  proxy: {
    // Update proxy enabled state (toggle)
    updateEnableStatus: (configId, enabled, reason) =>
      ipcRenderer.send('update-proxy-enable-status', {
        configId,
        enabled,
        reason
      }),
    // Update proxy permissions (select/deselect)
    updatePermissions: (configId, permissions) =>
      ipcRenderer.send('update-proxy-permissions', { configId, permissions }),
    // Proxy control (stop, etc.)
    control: (action, configId) =>
      ipcRenderer.send('proxy-control', { action, configId }),
    // Get all proxy states
    getAllStates: () => ipcRenderer.invoke('proxy-get-all-states'),
    // Get client connection status and server info
    getDashboardData: () => ipcRenderer.invoke('proxy-get-dashboard-data')
  },

  // MCP service test API
  testMCPServer: (address, accessToken) =>
    ipcRenderer.invoke('test-mcp-server', { address, accessToken }),

  // Dev-only clear all app data API
  clearAllAppData: () => ipcRenderer.invoke('clear-all-app-data'),

  // Window control API
  showWindow: () => ipcRenderer.invoke('show-window'),
  focusWindow: () => ipcRenderer.invoke('focus-window'),

  // Path helper API
  getProjectRootPath: () => ipcRenderer.invoke('get-project-root-path'),
  getCurrentWorkingDirectory: () =>
    ipcRenderer.invoke('get-current-working-directory'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // IPC listener API
  ipc: {
    // Subscribe to event
    on: (channel, listener) => ipcRenderer.on(channel, listener),
    // Remove listener
    removeListener: (channel, listener) =>
      ipcRenderer.removeListener(channel, listener),
    // Send message
    send: (channel, ...args) => ipcRenderer.send(channel, ...args)
  },

  // Sensitive action authorization API
  authorizeDangerousOperation: (authData) =>
    ipcRenderer.invoke('authorize-dangerous-operation', authData),

  // Native menu API
  showConnectionMenu: (x, y, serverId, configuredApps) =>
    ipcRenderer.invoke('show-connection-menu', x, y, serverId, configuredApps),

  // Listen for menu actions
  onConnectionMenuAction: (callback) =>
    ipcRenderer.on('connection-menu-action', (event, data) => callback(data)),

  // Settings menu API
  showSettingsMenu: (x, y, autoLockTimer) =>
    ipcRenderer.invoke('show-settings-menu', x, y, autoLockTimer),

  // Listen for settings menu actions
  onSettingsMenuAction: (callback) =>
    ipcRenderer.on('settings-menu-action', (event, data) => callback(data)),

  // ==================== URL scheme API ====================
  urlScheme: {
    // Listen for custom URL events
    onCustomURL: (callback) =>
      ipcRenderer.on('custom-url-received', (event, data) => callback(data)),

    // Remove listener
    removeCustomURLListener: (callback) =>
      ipcRenderer.removeListener('custom-url-received', callback)
  },

  // ==================== Shell API ====================
  shell: {
    // Open URL in default browser
    openExternal: (url) => ipcRenderer.invoke('shell-open-external', url)
  },

  // ==================== IPC Renderer API ====================
  ipcRenderer: {
    on: (channel, listener) => ipcRenderer.on(channel, listener),
    removeListener: (channel, listener) =>
      ipcRenderer.removeListener(channel, listener),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args)
  }
})

console.log('=== window.electron API EXPOSED ===')
console.log('Password API should be available at window.electron.password')

// Socket.IO manager - handle socket connections directly in preload
// This preserves full Socket.IO features and avoids contextBridge serialization issues
if (io) {
  const sockets = new Map() // serverId -> socket instance
  const eventHandlers = new Map() // serverId -> { eventName -> handler }

  contextBridge.exposeInMainWorld('socketIO', {
    // Create socket connection
    createConnection: (serverId, url, options) => {
      console.log(`[Preload] ============ Creating Socket Connection ============`)
      console.log(`[Preload] Server ID: ${serverId}`)
      console.log(`[Preload] URL: ${url}`)
      console.log(`[Preload] Options:`, JSON.stringify(options, null, 2))
      console.log(`[Preload] Current active sockets: ${sockets.size}`)
      console.log(`[Preload] Active socket IDs:`, Array.from(sockets.keys()))

      try {
        // Check if socket already exists for this serverId
        const existingSocket = sockets.get(serverId)
        if (existingSocket) {
          console.warn(`[Preload] ⚠️ Socket already exists for ${serverId}, disconnecting old one first`)
          existingSocket.disconnect()
          sockets.delete(serverId)
          eventHandlers.delete(serverId)
        }

        const socket = io(url, options)
        sockets.set(serverId, socket)
        eventHandlers.set(serverId, new Map())

        console.log(`[Preload] ✅ Socket created for ${serverId}`)
        console.log(`[Preload] Socket has .on method:`, typeof socket.on === 'function')
        console.log(`[Preload] Total active sockets: ${sockets.size}`)

        return { success: true, serverId }
      } catch (error) {
        console.error(`[Preload] ❌ Failed to create socket:`, error)
        return { success: false, error: error.message }
      }
    },

    // Subscribe to event
    on: (serverId, eventName, callback) => {
      const socket = sockets.get(serverId)
      if (!socket) {
        console.warn(`[Preload] Socket not found: ${serverId}`)
        return false
      }

      const handler = (...args) => {
        // Pass event data to renderer via callback
        callback(...args)
      }

      // Store handler references for removal
      const handlers = eventHandlers.get(serverId)
      if (!handlers.has(eventName)) {
        handlers.set(eventName, [])
      }
      handlers.get(eventName).push({ callback, handler })

      socket.on(eventName, handler)
      return true
    },

    // Remove event listener
    off: (serverId, eventName, callback) => {
      const socket = sockets.get(serverId)
      if (!socket) {
        console.warn(`[Preload] Socket not found: ${serverId}`)
        return false
      }

      const handlers = eventHandlers.get(serverId)
      if (!handlers || !handlers.has(eventName)) {
        return false
      }

      const eventHandlersList = handlers.get(eventName)
      const index = eventHandlersList.findIndex(h => h.callback === callback)

      if (index !== -1) {
        const { handler } = eventHandlersList[index]
        socket.off(eventName, handler)
        eventHandlersList.splice(index, 1)

        // Delete the event record when no handlers remain
        if (eventHandlersList.length === 0) {
          handlers.delete(eventName)
        }
        return true
      }

      return false
    },

    // Send event
    emit: (serverId, eventName, ...args) => {
      const socket = sockets.get(serverId)
      if (!socket) {
        console.warn(`[Preload] Socket not found: ${serverId}`)
        return false
      }

      socket.emit(eventName, ...args)
      return true
    },

    // Disconnect
    disconnect: (serverId) => {
      const socket = sockets.get(serverId)
      if (!socket) {
        return false
      }

      socket.disconnect()
      sockets.delete(serverId)
      eventHandlers.delete(serverId)
      return true
    },

    // Get connection status
    isConnected: (serverId) => {
      const socket = sockets.get(serverId)
      return socket ? socket.connected : false
    },

    // Get socket ID
    getSocketId: (serverId) => {
      const socket = sockets.get(serverId)
      return socket ? socket.id : null
    },

    // Debug helper: get all socket states
    getAllSocketsStatus: () => {
      const status = []
      sockets.forEach((socket, serverId) => {
        status.push({
          serverId,
          connected: socket.connected,
          socketId: socket.id,
          url: socket.io?.uri || 'unknown'
        })
      })
      return status
    }
  })

  console.log('=== socketIO API exposed (with preload wrapper) ===')
} else {
  console.warn('=== socketIO API NOT exposed (io not available) ===')
}
