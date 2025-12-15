const {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  screen,
  Tray,
  Menu,
  nativeImage,
  Notification,
  ipcMain,
  session
} = require('electron')
const path = require('path')
const fs = require('fs')
const biometricAuth = require('./biometric-auth')
const passwordManager = require('./password-manager')
const MCPConfigManager = require('./mcp-config-manager')
const GoogleDriveAuth = require('./google-drive-auth')
const socketClient = require('./socket-client')

const args = process.argv.slice(1)

// Note: MCP Proxy mode has been removed
// Application now runs in UI mode only

// ==================== UI mode ====================
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  console.log('Another instance is already running. Exiting.')
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('Second instance detected, focusing main window')

    // Parse argv for the second instance
    const secondInstanceArgs = commandLine.slice(2)
    console.log('Second instance args:', secondInstanceArgs)

    // ========== check whether argv contains a protocol URL ==========
    const url = commandLine.find((arg) => arg.startsWith('petadesk://'))
    if (url) {
      log(`[URL Scheme] Received URL from second instance: ${url}`)
      handleCustomURL(url)
    }
    // ================================================

    // show and focus the main window when it exists
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    } else {
      // create a new main window when missing
      createWindow()
    }

    // show notification
    if (Notification.isSupported()) {
      new Notification({
        title: 'PETA MCP',
        body: url ? 'Processing protocol request...' : 'App is already running; existing window activated'
      }).show()
    }
  })
}

// ==================== URL scheme handling ====================

/**
 * Base64 URL decode
 * @param {string} str - Base64 URL encoded string
 * @returns {string} decoded string
 */
function base64UrlDecode(str) {
  // convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  // add padding
  while (base64.length % 4) {
    base64 += '='
  }
  // decode
  return Buffer.from(base64, 'base64').toString('utf-8')
}

/**
 * parse custom protocol URL
 * @param {string} url - full URL string (petadesk://action?param=value)
 * @returns {Object} parsed object
 */
function parseCustomURL(url) {
  try {
    const parsedURL = new URL(url)

    // validate protocol
    if (parsedURL.protocol !== 'petadesk:') {
      throw new Error('Invalid protocol')
    }

    // extract action (host)
    const action = parsedURL.host || parsedURL.pathname.replace(/^\//, '')

    // extract params
    const params = {}
    parsedURL.searchParams.forEach((value, key) => {
      params[key] = decodeURIComponent(value)
    })

    // Base64url-decode the url param when present
    if (params.url) {
      try {
        params.decodedUrl = base64UrlDecode(params.url)
        log(`[URL Scheme] Base64 URL decoded: ${params.decodedUrl}`)
      } catch (decodeError) {
        log(`[URL Scheme] Failed to decode base64 URL: ${decodeError.message}`)
        // Keep the original value if decoding fails
        params.decodedUrl = params.url
      }
    }

    return {
      success: true,
      action,
      params,
      raw: url
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      raw: url
    }
  }
}

/**
 * handle custom URL
 * @param {string} url - custom protocol URL
 */
function handleCustomURL(url) {
  log(`[URL Scheme] Processing URL: ${url}`)

  const parsed = parseCustomURL(url)

  if (!parsed.success) {
    log(`[URL Scheme] Failed to parse URL: ${parsed.error}`)
    return
  }

  log(`[URL Scheme] Action: ${parsed.action}`)
  log(`[URL Scheme] Params:`, JSON.stringify(parsed.params))

  // check whether type parameter equals 1
  if (parsed.params.type !== '1') {
    log(
      `[URL Scheme] Invalid type parameter: ${parsed.params.type}, expected '1'`
    )
    return
  }

  // send URL info to the renderer
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('custom-url-received', {
      url: parsed.raw,
      action: parsed.action,
      params: parsed.params
    })
    log(`[URL Scheme] URL data sent to renderer process`)
  } else {
    // if the window is not created yet, stash URL for later
    pendingURL = {
      url: parsed.raw,
      action: parsed.action,
      params: parsed.params
    }
    log(`[URL Scheme] Window not ready, URL saved for later processing`)
  }

  // show main window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    if (!mainWindow.isVisible()) mainWindow.show()
    mainWindow.focus()
  }
}

// register custom protocol
if (process.env.NODE_ENV === 'development' && process.platform === 'win32') {
  // register protocol in Windows dev mode
  app.setAsDefaultProtocolClient('petadesk', process.execPath, [
    path.resolve(process.argv[1])
  ])
  console.log('[URL Scheme] Protocol registered for Windows development mode')
} else if (!app.isPackaged && process.defaultApp) {
  // dev-mode fallback
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('petadesk', process.execPath, [
      path.resolve(process.argv[1])
    ])
    console.log('[URL Scheme] Protocol registered for development mode')
  }
} else {
  // production registration
  app.setAsDefaultProtocolClient('petadesk')
  console.log('[URL Scheme] Protocol registered for production')
}

// macOS: handle open-url events
app.on('open-url', (event, url) => {
  event.preventDefault()
  log(`[URL Scheme] macOS open-url event: ${url}`)
  handleCustomURL(url)
})

// Windows/Linux: check argv for protocol URLs
if (process.platform !== 'darwin') {
  const url = process.argv.find((arg) => arg.startsWith('petadesk://'))
  if (url) {
    console.log(`[URL Scheme] Launch URL detected: ${url}`)
    // delay handling until the app is ready
    app.whenReady().then(() => {
      setTimeout(() => handleCustomURL(url), 1000)
    })
  }
}

// Node.js path resolver no longer needed; integrated MCP handles it
let mainWindow
let tray
let mcpConfigManager = null // MCP config manager
let googleDriveAuth = null // Google Drive auth manager
let isConnected = false // connection status
let isBiometricAuthenticating = false // biometric auth status
let frontendIndexPath = null
let frontendBaseDir = null
let windowWasDragged = false // track whether the window was manually dragged
let pendingURL = null // store URLs received at startup/runtime

// Performance monitoring - track startup timings
const performanceMarks = {}
function markPerformance(label) {
  performanceMarks[label] = Date.now()
  if (performanceMarks._start) {
    const elapsed = performanceMarks[label] - performanceMarks._start
    console.log(`[PERF] ${label}: ${elapsed}ms`)
  }
}

// Optimized logging - batched async writes
let logBuffer = []
let logFlushTimer = null
const LOG_FLUSH_INTERVAL = 1000 // flush once per second

function log(message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}`

  // always show logs in debug mode
  if (process.env.DEBUG_MODE === 'true' || !app.isPackaged) {
    console.log(logMessage)
  }

  // batch write log file
  if (app.isPackaged || process.env.DEBUG_MODE === 'true') {
    logBuffer.push(logMessage)

    // schedule batched writes
    if (!logFlushTimer) {
      logFlushTimer = setTimeout(flushLogs, LOG_FLUSH_INTERVAL)
    }
  }
}

// flush batched logs to file
function flushLogs() {
  if (logBuffer.length === 0) {
    logFlushTimer = null
    return
  }

  try {
    const logPath = path.join(app.getPath('userData'), 'app.log')
    const content = logBuffer.join('\n') + '\n'
    fs.appendFile(logPath, content, (error) => {
      if (error) {
        console.error('Failed to write to log file:', error)
      }
    })
    logBuffer = []
  } catch (error) {
    console.error('Failed to flush logs:', error)
  }

  logFlushTimer = null
}

// ensure logs flush on app quit
app.on('will-quit', () => {
  if (logFlushTimer) {
    clearTimeout(logFlushTimer)
  }
  if (logBuffer.length > 0) {
    try {
      const logPath = path.join(app.getPath('userData'), 'app.log')
      const content = logBuffer.join('\n') + '\n'
      fs.appendFileSync(logPath, content)
    } catch (error) {
      console.error('Failed to write final logs:', error)
    }
  }
})

// Resolve resource paths to handle packaged builds
function getResourcePath(relativePath) {
  if (app.isPackaged) {
    // In packaged builds extraResources lives under Resources
    return path.join(process.resourcesPath, relativePath)
  } else {
    // Dev mode: relative to the electron directory
    return path.join(__dirname, '..', relativePath)
  }
}

// HTTP static file server for production builds
let staticServer = null
let staticServerPort = null

/**
 * Start HTTP server to serve static files from frontend/out
 * This avoids file:// protocol issues on Windows and provides consistent behavior across platforms
 */
async function startStaticFileServer() {
  // Return existing server port if already started
  if (staticServer && staticServerPort) {
    return staticServerPort
  }

  const http = require('http')
  const getPort = require('get-port')
  const staticDir = getResourcePath('frontend/out')

  if (!fs.existsSync(staticDir)) {
    throw new Error(`Static directory not found: ${staticDir}`)
  }

  return new Promise((resolve, reject) => {
    // Try to get an available port from our preferred range
    getPort({ port: [34327, 34328, 34329, 34330] })
      .then((port) => {
        staticServerPort = port

        staticServer = http.createServer((req, res) => {
          try {
            // Parse URL and remove query string
            const urlPath = new URL(req.url, 'http://localhost').pathname

            // Build file path
            let filePath = path.join(staticDir, urlPath === '/' ? 'index.html' : urlPath)

            // Security check: ensure file is within staticDir
            const resolvedPath = path.resolve(filePath)
            const resolvedDir = path.resolve(staticDir)
            if (!resolvedPath.startsWith(resolvedDir)) {
              res.writeHead(403, { 'Content-Type': 'text/plain' })
              res.end('Forbidden')
              return
            }

            // Handle Next.js App Router routes (files without extension)
            if (!path.extname(filePath)) {
              // Try adding .html extension for Next.js routes
              const htmlPath = filePath + '.html'
              if (fs.existsSync(htmlPath)) {
                filePath = htmlPath
              } else {
                // SPA fallback: all routes return index.html
                filePath = path.join(staticDir, 'index.html')
              }
            }

            // Read and serve file
            fs.readFile(filePath, (err, data) => {
              if (err) {
                if (err.code === 'ENOENT') {
                  // File not found, return index.html for SPA routing
                  const indexPath = path.join(staticDir, 'index.html')
                  fs.readFile(indexPath, (err2, indexData) => {
                    if (err2) {
                      res.writeHead(404, { 'Content-Type': 'text/plain' })
                      res.end('Not Found')
                    } else {
                      res.writeHead(200, { 'Content-Type': 'text/html' })
                      res.end(indexData)
                    }
                  })
                } else {
                  res.writeHead(500, { 'Content-Type': 'text/plain' })
                  res.end('Internal Server Error')
                }
                return
              }

              // Determine Content-Type based on file extension
              const ext = path.extname(filePath).toLowerCase()
              const contentTypes = {
                '.html': 'text/html; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.svg': 'image/svg+xml',
                '.txt': 'text/plain; charset=utf-8',
                '.ico': 'image/x-icon',
                '.woff': 'font/woff',
                '.woff2': 'font/woff2',
                '.ttf': 'font/ttf',
                '.eot': 'application/vnd.ms-fontobject'
              }

              const contentType = contentTypes[ext] || 'application/octet-stream'

              res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              })
              res.end(data)
            })
          } catch (error) {
            log(`[Static Server] Error processing request: ${error.message}`)
            res.writeHead(500, { 'Content-Type': 'text/plain' })
            res.end('Internal Server Error')
          }
        })

        staticServer.listen(port, '127.0.0.1', () => {
          log(`[Static Server] Started on http://127.0.0.1:${port}`)
          log(`[Static Server] Serving files from: ${staticDir}`)
          resolve(port)
        })

        staticServer.on('error', (err) => {
          log(`[Static Server] Error: ${err.message}`)
          reject(err)
        })
      })
      .catch(reject)
  })
}

/**
 * Stop the static file server
 */
function stopStaticFileServer() {
  if (staticServer) {
    staticServer.close(() => {
      log('[Static Server] Stopped')
    })
    staticServer = null
    staticServerPort = null
  }
}

// Wait for the dev server and return the active port
async function waitForDevServer(maxRetries = 30, retryDelay = 1000) {
  const http = require('http')

  // Check environment variable first
  const envPort = process.env.NEXT_PORT || process.env.PORT
  if (envPort) {
    log(`Using port from environment variable: ${envPort}`)
    // wait for that port
    for (let retry = 0; retry < maxRetries; retry++) {
      const isReady = await checkPort('localhost', parseInt(envPort))
      console.log(isReady, 'isReady')
      if (isReady) {
        return parseInt(envPort)
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  // try common Next.js ports
  const possiblePorts = [3000, 3001, 3002, 3003, 3004, 3005]

  for (let retry = 0; retry < maxRetries; retry++) {
    for (const port of possiblePorts) {
      try {
        const isReady = await checkPort('localhost', port)

        if (isReady) {
          log(`Development server detected on port ${port}`)
          return port
        }
      } catch (error) {
        // Continue trying
      }
    }

    // Wait before next retry
    await new Promise((resolve) => setTimeout(resolve, retryDelay))
  }

  // Fallback to default port
  log('Could not detect dev server port, falling back to 3000')
  return 3000
}

// Check whether a port is serving our Next.js app
function checkPort(hostname, port) {
  const http = require('http')

  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname,
        port,
        path: '/',
        method: 'GET',
        timeout: 2000
      },
      (res) => {
        // Treat a healthy response as our app
        if (res.statusCode >= 200 && res.statusCode < 400) {
          log(`Found working web server on port ${port}`)
          resolve(true)
        } else {
          log(`Port ${port} returned status ${res.statusCode}`)
          resolve(false)
        }
      }
    )

    req.on('error', (error) => {
      log(`Port ${port} check failed: ${error.message}`)
      resolve(false)
    })

    req.on('timeout', () => {
      req.destroy()
      log(`Port ${port} check timeout`)
      resolve(false)
    })

    req.end()
  })
}

async function createWindow() {
  log('Creating tray-style main window...')

  process.title = 'Peta Desk'

  const mainConfig = {
    width: 430,
    height: 740,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    backgroundColor: 'rgba(255, 255, 255, 0.70)',
    backdropFilter: 'blur(2px)',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      sandbox: false // Disable sandbox to allow preload to access node_modules
    }
  }

  // Platform specific configurations
  if (process.platform === 'darwin') {
    mainConfig.vibrancy = 'popover'
    mainConfig.visualEffectState = 'active'
  } else if (process.platform === 'win32') {
    mainConfig.backgroundMaterial = 'acrylic'
  } else if (process.platform === 'linux') {
    mainConfig.type = 'toolbar'
  }

  mainWindow = new BrowserWindow(mainConfig)

  // Hide window controls on macOS
  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false)
  }

  // Hide panel when it loses focus (except during biometric authentication)
  mainWindow.on('blur', () => {
    if (
      !mainWindow.webContents.isDevToolsOpened() &&
      !isBiometricAuthenticating
    ) {
      mainWindow.hide()
    }
  })

  mainWindow.once('ready-to-show', () => {
    log('Window ready to show')
    mainWindow.show()
  })

  // Track when user manually drags the window
  mainWindow.on('move', () => {
    windowWasDragged = true
  })

  mainWindow.on('close', () => {
    mainWindow = null
  })

  try {
    markPerformance('Start loading content')

    // Fix file load path issues
    if (app.isPackaged) {
      // Prefer the common path to reduce fs checks
      const primaryPath = getResourcePath('frontend/out/index.html')
      let indexPath = null

      if (fs.existsSync(primaryPath)) {
        indexPath = primaryPath
      } else {
        // Only check fallback paths when the primary is missing
        const fallbackPaths = [
          path.join(__dirname, '../frontend/out/index.html'),
          path.join(app.getAppPath(), 'frontend/out/index.html')
        ]

        for (const testPath of fallbackPaths) {
          if (fs.existsSync(testPath)) {
            indexPath = testPath
            log(`Using fallback path: ${testPath}`)
            break
          }
        }
      }

      if (!indexPath) {
        throw new Error('Frontend files not found in any expected location')
      }

      frontendIndexPath = indexPath
      frontendBaseDir = path.dirname(indexPath)

      log(`Loading from: ${indexPath}`)

      // Use HTTP server for all platforms (avoids file:// protocol issues)
      const port = await startStaticFileServer()
      const url = `http://127.0.0.1:${port}`
      log(`Loading from HTTP server: ${url}`)
      await mainWindow.loadURL(url)

      markPerformance('Content loaded')
    } else {
      // In development, detect and load from actual port
      log('Detecting development server port...')
      const devPort = await waitForDevServer()
      const devUrl = `http://localhost:${devPort}`
      log(`Loading development server from ${devUrl}`)
      await mainWindow.loadURL(devUrl)
    }
  } catch (error) {
    log(`Failed to load content: ${error.message}`)
    dialog.showErrorBox(
      'Loading Error',
      `Failed to load application: ${error.message}`
    )
  }

  // Inject gateway URL into the renderer process
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      window.GATEWAY_URL = 'electron://localhost';
      window.IS_TRAY_WINDOW = true;
    `)

    // ========== Send pending URL ==========
    if (pendingURL) {
      log(`[URL Scheme] Sending pending URL to renderer: ${pendingURL.url}`)
      mainWindow.webContents.send('custom-url-received', pendingURL)
      log(`[URL Scheme] Pending URL sent to renderer`)
      pendingURL = null // clear pending URL
    }
    // ===========================================
  })

  // Note: file:// protocol route handling removed
  // HTTP server handles all routing correctly, no need for special handling

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function toggleMainWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showMainWindow()
  }
}

function showMainWindow() {
  if (!mainWindow) return

  // Auto-position only when the window has not been manually dragged
  if (!windowWasDragged) {
    // get cursor position
    const point = screen.getCursorScreenPoint()
    const currentDisplay = screen.getDisplayNearestPoint(point)

    // compute panel position
    const panelBounds = mainWindow.getBounds()
    let x = point.x - panelBounds.width / 2
    let y = point.y - panelBounds.height / 2

    // keep the panel within screen bounds
    const displayBounds = currentDisplay.bounds

    // adjust X coordinate
    if (x < displayBounds.x) {
      x = displayBounds.x + 20
    } else if (x + panelBounds.width > displayBounds.x + displayBounds.width) {
      x = displayBounds.x + displayBounds.width - panelBounds.width - 20
    }

    // adjust Y coordinate
    if (y < displayBounds.y) {
      y = displayBounds.y + 20
    } else if (
      y + panelBounds.height >
      displayBounds.y + displayBounds.height
    ) {
      y = displayBounds.y + displayBounds.height - panelBounds.height - 20
    }

    mainWindow.setPosition(x, y)
  }

  mainWindow.show()
  mainWindow.focus()
}

// Update tray icon based on connection state
function updateTrayIcon() {
  if (!tray) return

  // determine icon status
  let iconName
  let tooltip
  const isLocked = global.appLocked || false
  const hasServers = global.hasServers || false

  if (!hasServers) {
    // No server added - ConnectFailed.png
    iconName = 'ConnectFailed.png'
    tooltip = 'PETA - No servers configured'
  } else if (isConnected && !isLocked) {
    // Server added and connected - Connecting.png
    iconName = 'Connecting.png'
    tooltip = 'PETA - Connected'
  } else {
    // Server added but disconnected/locked/reconnecting - PasswordRequire.png
    iconName = 'PasswordRequire.png'
    tooltip = isLocked ? 'PETA - Locked' : 'PETA - Disconnected'
  }

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'frontend', 'public', iconName)
    : path.join(__dirname, '..', 'frontend', 'public', iconName)

  log(
    `Updating tray icon to: ${iconPath} (hasServers: ${hasServers}, connected: ${isConnected}, locked: ${isLocked})`
  )

  if (fs.existsSync(iconPath)) {
    const image = nativeImage
      .createFromPath(iconPath)
      .resize({ width: 16, height: 16 })
    tray.setImage(image)
    tray.setToolTip(tooltip)
  } else {
    log(`Icon file not found: ${iconPath}`)
  }
}

function createTray() {
  console.log('🔧 Creating system tray...')

  // Use the default ConnectFailed icon (no server added)
  const iconName = 'ConnectFailed.png'
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'frontend', 'public', iconName)
    : path.join(__dirname, '..', 'frontend', 'public', iconName)

  console.log('📁 Icon path:', iconPath)
  console.log('📂 Icon exists:', fs.existsSync(iconPath))

  if (fs.existsSync(iconPath)) {
    console.log('✅ Creating tray with icon')

    // Create nativeImage and keep original colors to show status
    const image = nativeImage
      .createFromPath(iconPath)
      .resize({ width: 16, height: 16 })
    // Do not mark as template to preserve status colors
    // if (process.platform === 'darwin') {
    //   image.setTemplateImage(true)
    // }

    tray = new Tray(image)
    console.log('✅ Tray created successfully')
    console.log(Notification.isSupported())
    // Show a notification to confirm tray creation
    if (Notification.isSupported()) {
      new Notification({
        title: 'PETA MCP',
        body: 'System tray created. Check the top-right corner of the menu bar'
      }).show()
    }

    // Remove context menu - tray icon click only
    tray.setContextMenu(null)
    console.log('✅ Tray menu removed (click only)')

    // Set initial state
    updateTrayIcon()
    console.log('✅ Tray icon and tooltip updated')

    // Clicking the tray icon shows the main window
    tray.on('click', () => {
      console.log('👆 Tray clicked!')
      toggleMainWindow()
    })
    console.log('✅ Tray click handler registered')
  } else {
    console.log('❌ Icon file does not exist, tray not created')
  }
}

// IPC handlers
ipcMain.on('hide-main-window', () => {
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.hide()
  }
})

ipcMain.on('show-settings', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    // Can navigate to the settings page
    mainWindow.webContents.send('navigate-to-settings')
  }
})

// Update connection status
ipcMain.on('update-connection-status', (event, connected) => {
  log(`Connection status updated: ${connected}`)
  isConnected = connected
  updateTrayIcon()
})

// Update server status (for tray icon)
ipcMain.on('update-servers-status', (event, hasServers) => {
  log(`Servers status updated: ${hasServers}`)
  global.hasServers = hasServers
  updateTrayIcon()
})

// Get current connection status
ipcMain.handle('get-connection-status', () => {
  return isConnected
})

// Get lock state
ipcMain.handle('get-lock-status', () => {
  // Track lock state with a global variable
  return {
    isLocked: global.appLocked || false,
    lockedAt: global.appLockedAt || null
  }
})

// Set lock state
ipcMain.handle('set-lock-status', (event, { isLocked, lockedAt }) => {
  global.appLocked = isLocked
  global.appLockedAt = lockedAt
  console.log(`[Main] Lock status updated: ${isLocked}`)
  updateTrayIcon() // Update tray icon to reflect lock state
  return { success: true }
})

// ==================== Biometric authentication API ====================

// Check whether biometrics is available
ipcMain.handle('biometric-is-available', () => biometricAuth.isAvailable())

// Perform biometric authentication
ipcMain.handle(
  'biometric-authenticate',
  async (event, reason = 'Verify identity to unlock the app') => {
    // Mark biometric auth as active to prevent the window from auto-hiding
    isBiometricAuthenticating = true

    try {
      const result = await biometricAuth.authenticate(reason)
      return result
    } finally {
      // Reset biometric auth status
      isBiometricAuthenticating = false
    }
  }
)

// Get stored password
ipcMain.handle('biometric-get-password', () => biometricAuth.getPassword())

// ==================== Master password API ====================

// Store master password
ipcMain.handle('password-store', (event, password) =>
  passwordManager.storeMasterPassword(password)
)

// password-get API removed to avoid leakage
// Password can only be retrieved after biometric auth

// Verify master password
ipcMain.handle('password-verify', (event, password) => {
  return { success: passwordManager.verifyMasterPassword(password) }
})

// Update master password
ipcMain.handle('password-update', (event, oldPassword, newPassword) =>
  passwordManager.updateMasterPassword(oldPassword, newPassword)
)

// Check whether a master password is set
ipcMain.handle('password-has', () => {
  return { hasPassword: passwordManager.hasMasterPassword() }
})

// Delete master password
ipcMain.handle('password-remove', () => passwordManager.removeMasterPassword())

// ==================== Shell API ====================
const { shell } = require('electron')

// Open URL in the default browser
ipcMain.handle('shell-open-external', async (event, url) => {
  try {
    await shell.openExternal(url)
    return { success: true }
  } catch (error) {
    log(`[Shell] Failed to open external URL: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// ==================== Token encryption/decryption API ====================
const cryptoUtils = require('./crypto-utils')

// Encrypt token
ipcMain.handle('crypto-encrypt-token', (event, token, masterPassword) => {
  try {
    const encryptedToken = cryptoUtils.encryptToken(token, masterPassword)
    return { success: true, encryptedToken }
  } catch (error) {
    console.error('Failed to encrypt token:', error)
    return { success: false, error: error.message }
  }
})

// Decrypt token
ipcMain.handle(
  'crypto-decrypt-token',
  (event, encryptedToken, masterPassword) => {
    try {
      const token = cryptoUtils.decryptToken(encryptedToken, masterPassword)
      return { success: true, token }
    } catch (error) {
      console.error('Failed to decrypt token:', error)
      return { success: false, error: error.message }
    }
  }
)

// ==================== Context menu API ====================

// Show DangerLevel selection menu
ipcMain.handle(
  'context-menu-show-danger-level',
  async (event, position, currentLevel) => {
    const { Menu } = require('electron')

    return new Promise((resolve) => {
      const menu = Menu.buildFromTemplate([
        {
          label: 'Always allow',
          type: 'checkbox',
          checked: currentLevel === 0,
          click: () => {
            resolve({ selectedLevel: 0 })
          }
        },
        {
          label: 'Approval without Password',
          type: 'checkbox',
          checked: currentLevel === 1,
          click: () => {
            resolve({ selectedLevel: 1 })
          }
        },
        {
          label: 'Approval with Password',
          type: 'checkbox',
          checked: currentLevel === 2,
          click: () => {
            resolve({ selectedLevel: 2 })
          }
        }
      ])

      // Show menu at the given position
      menu.popup({
        window: mainWindow,
        x: Math.round(position.x),
        y: Math.round(position.y),
        callback: () => {
          // Return empty object if the user dismisses the menu
          resolve({})
        }
      })
    })
  }
)

// ==================== Backup management API ====================

// Get backup directory path
function getBackupsDir() {
  return path.join(app.getPath('userData'), 'backups')
}

// Ensure backup directory exists
function ensureBackupsDir() {
  const backupsDir = getBackupsDir()
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
  }
  return backupsDir
}

// Fetch all backup files
ipcMain.handle('backup:getBackups', async () => {
  try {
    const backupsDir = ensureBackupsDir()
    const files = fs.readdirSync(backupsDir)
    const backupFiles = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const filePath = path.join(backupsDir, file)
        const stats = fs.statSync(filePath)

        // Read metadata only to improve performance
        let timestamp = stats.mtime.toISOString()
        let description = null

        try {
          // Read the first 2KB to extract metadata (larger buffer for long descriptions)
          const fd = fs.openSync(filePath, 'r')
          const buffer = Buffer.alloc(2048)
          const bytesRead = fs.readSync(fd, buffer, 0, 2048, 0)
          fs.closeSync(fd)

          if (bytesRead > 0) {
            const content = buffer.toString('utf8', 0, bytesRead)
            // Parse JSON to get timestamp and description
            const match = content.match(/"timestamp"\s*:\s*"([^"]+)"/)
            if (match) {
              timestamp = match[1]
            }
            // Use a robust regex to match description (supports escape characters)
            const descMatch = content.match(
              /"description"\s*:\s*"((?:[^"\\]|\\.)*)"/s
            )
            if (descMatch) {
              // Decode JSON escape sequences (\\n, \\t, etc.)
              description = descMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')
            }
          }
        } catch (error) {
          log(`Failed to read metadata from ${file}: ${error.message}`)
        }

        return {
          filename: file,
          size: stats.size,
          timestamp: timestamp,
          description: description,
          // Do not return full data; renderer will request when needed
          data: null
        }
      })

    log(`Found ${backupFiles.length} backup files`)
    return backupFiles
  } catch (error) {
    log(`Failed to get backups: ${error.message}`)
    return []
  }
})

// Create backup
ipcMain.handle('backup:createBackup', async (event, backupData) => {
  try {
    const backupsDir = ensureBackupsDir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `peta-desktop-backup_${timestamp}.json`
    const filePath = path.join(backupsDir, filename)

    // Add timestamp and version info to backup data
    const backupContent = {
      ...backupData,
      timestamp: new Date().toISOString(),
      version: backupData.version || '1.0'
    }

    fs.writeFileSync(filePath, JSON.stringify(backupContent, null, 2))

    log(`Backup created successfully: ${filename}`)
    return { success: true, filename }
  } catch (error) {
    log(`Failed to create backup: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Note: restore is fully handled in the renderer
// Renderer reads backup data and writes to localStorage; main process not needed

// Delete backup
ipcMain.handle('backup:deleteBackup', async (event, filename) => {
  try {
    const backupsDir = getBackupsDir()
    const filePath = path.join(backupsDir, filename)

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Backup file not found' }
    }

    fs.unlinkSync(filePath)
    log(`Backup deleted successfully: ${filename}`)
    return { success: true }
  } catch (error) {
    log(`Failed to delete backup: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Get full backup contents (for restore)
ipcMain.handle('backup:getBackupData', async (event, filename) => {
  try {
    const backupsDir = getBackupsDir()
    const filePath = path.join(backupsDir, filename)

    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'Backup file not found' }
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    log(`Loaded backup data: ${filename}`)
    return { success: true, data }
  } catch (error) {
    log(`Failed to load backup data: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Download backup to a user-selected location
ipcMain.handle('backup:downloadBackup', async (event, filename) => {
  try {
    const backupsDir = getBackupsDir()
    const sourcePath = path.join(backupsDir, filename)

    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Backup file not found' }
    }

    // Open save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Backup File',
      defaultPath: filename.replace(/\.json$/, '.backup'),
      filters: [
        { name: 'Backup Files', extensions: ['backup'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!result.canceled && result.filePath) {
      fs.copyFileSync(sourcePath, result.filePath)
      log(`Backup downloaded to: ${result.filePath}`)
      return { success: true, path: result.filePath }
    } else {
      return { success: false, error: 'Download cancelled by user' }
    }
  } catch (error) {
    log(`Failed to download backup: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// ==================== Google Drive API ====================

// Google Drive authorization
ipcMain.handle('googledrive:authenticate', async (event, { clientId, clientSecret }) => {
  try {
    if (!googleDriveAuth) {
      throw new Error('Google Drive Auth not initialized')
    }

    if (!clientId || !clientSecret) {
      throw new Error('clientId and clientSecret are required')
    }

    const result = await googleDriveAuth.authenticate({
      clientId,
      clientSecret,
      parentWindow: mainWindow
    })
    log('Google Drive authentication successful')

    // Show the main window after successful authorization
    if (result.success && mainWindow) {
      showMainWindow()
    }

    // Return result directly because it already contains success and info
    return result
  } catch (error) {
    log(`Google Drive authentication failed: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Check Google Drive authorization status
ipcMain.handle('googledrive:isAuthenticated', async () => {
  try {
    if (!googleDriveAuth) {
      return { success: false, authenticated: false }
    }

    const isAuth = googleDriveAuth.isAuthenticated()
    return { success: true, authenticated: isAuth }
  } catch (error) {
    log(`Failed to check Google Drive auth status: ${error.message}`)
    return { success: false, authenticated: false, error: error.message }
  }
})

// Get Google Drive user info
ipcMain.handle('googledrive:getUserInfo', async () => {
  try {
    if (!googleDriveAuth) {
      throw new Error('Google Drive Auth not initialized')
    }

    const userInfo = await googleDriveAuth.getUserInfo()
    return { success: true, data: userInfo }
  } catch (error) {
    log(`Failed to get Google Drive user info: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Google Drive logout
ipcMain.handle('googledrive:logout', async () => {
  try {
    if (!googleDriveAuth) {
      throw new Error('Google Drive Auth not initialized')
    }

    await googleDriveAuth.logout()
    log('Google Drive logout successful')
    return { success: true }
  } catch (error) {
    log(`Google Drive logout failed: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Upload backup to Google Drive
ipcMain.handle('googledrive:uploadBackup', async (event, filename) => {
  try {
    if (!googleDriveAuth) {
      throw new Error('Google Drive Auth not initialized')
    }

    // Read local backup file
    const backupDir = path.join(app.getPath('userData'), 'backups')
    const filePath = path.join(backupDir, filename)

    if (!fs.existsSync(filePath)) {
      throw new Error('Backup file not found')
    }

    const fileBuffer = fs.readFileSync(filePath)

    // Upload to Google Drive
    const result = await googleDriveAuth.uploadFile(
      filename,
      fileBuffer,
      'application/json'
    )

    log(`Backup uploaded to Google Drive: ${filename}`)
    return { success: true, data: result }
  } catch (error) {
    log(`Failed to upload backup to Google Drive: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Download backup from Google Drive
ipcMain.handle(
  'googledrive:downloadBackup',
  async (event, fileId, fileName) => {
    try {
      if (!googleDriveAuth) {
        throw new Error('Google Drive Auth not initialized')
      }

      // Download file from Google Drive
      const result = await googleDriveAuth.downloadFile(fileId)

      // Save to local backup directory
      const backupDir = path.join(app.getPath('userData'), 'backups')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const filePath = path.join(backupDir, fileName)
      fs.writeFileSync(filePath, result.data)

      log(`Backup downloaded from Google Drive: ${fileName}`)
      return { success: true, filePath }
    } catch (error) {
      log(`Failed to download backup from Google Drive: ${error.message}`)
      return { success: false, error: error.message }
    }
  }
)

// List backups in Google Drive
ipcMain.handle('googledrive:listBackups', async () => {
  try {
    if (!googleDriveAuth) {
      throw new Error('Google Drive Auth not initialized')
    }

    const result = await googleDriveAuth.listBackups()
    return { success: true, data: result.files }
  } catch (error) {
    log(`Failed to list Google Drive backups: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Delete backups in Google Drive
ipcMain.handle('googledrive:deleteBackup', async (event, fileId) => {
  try {
    if (!googleDriveAuth) {
      throw new Error('Google Drive Auth not initialized')
    }

    await googleDriveAuth.deleteFile(fileId)
    log(`Backup deleted from Google Drive: ${fileId}`)
    return { success: true }
  } catch (error) {
    log(`Failed to delete Google Drive backup: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// ==================== MCP config management API ====================

// Remove server from MCP config
ipcMain.handle('mcp-config-remove-server', async (event, serverName) => {
  try {
    if (!mcpConfigManager) {
      throw new Error('MCP Config Manager not initialized')
    }

    // Remove server from all supported app configs
    const results = mcpConfigManager.removeServerFromAllConfigs(serverName)

    log(
      `Removed server "${serverName}" from MCP configs: ${JSON.stringify(
        results
      )}`
    )
    return { success: true, results }
  } catch (error) {
    log(`Failed to remove server from MCP configs: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Add server to MCP config
ipcMain.handle(
  'mcp-config-add-server',
  async (event, appName, serverName, serverConfig) => {
    try {
      log(`[MCP Config] Request to add server "${serverName}" to ${appName}`)
      log(`[MCP Config] Server config:`, JSON.stringify(serverConfig, null, 2))

      if (!mcpConfigManager) {
        throw new Error('MCP Config Manager not initialized')
      }

      const success = mcpConfigManager.addServerToConfig(
        appName,
        serverName,
        serverConfig
      )
      log(`[MCP Config] Added server "${serverName}" to ${appName}: ${success}`)
      return { success }
    } catch (error) {
      log(`[MCP Config] Failed to add server to MCP config: ${error.message}`)
      log(`[MCP Config] Error stack:`, error.stack)
      return { success: false, error: error.message }
    }
  }
)

// Update server in MCP config
ipcMain.handle(
  'mcp-config-update-server',
  async (event, appName, oldServerName, newServerName, serverConfig) => {
    try {
      if (!mcpConfigManager) {
        throw new Error('MCP Config Manager not initialized')
      }

      const success = mcpConfigManager.updateServerInConfig(
        appName,
        oldServerName,
        newServerName,
        serverConfig
      )
      log(
        `Updated server "${oldServerName}" -> "${newServerName}" in ${appName}: ${success}`
      )
      return { success }
    } catch (error) {
      log(`Failed to update server in MCP config: ${error.message}`)
      return { success: false, error: error.message }
    }
  }
)

// Get all servers from MCP config
ipcMain.handle('mcp-config-get-servers', async (event, appName) => {
  try {
    if (!mcpConfigManager) {
      throw new Error('MCP Config Manager not initialized')
    }

    const servers = mcpConfigManager.getAllServers(appName)
    return { success: true, servers }
  } catch (error) {
    log(`Failed to get servers from MCP config: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Check whether MCP config exists
ipcMain.handle('mcp-config-exists', async (event, appName) => {
  try {
    if (!mcpConfigManager) {
      throw new Error('MCP Config Manager not initialized')
    }

    const exists = mcpConfigManager.configExists(appName)
    return { success: true, exists }
  } catch (error) {
    log(`Failed to check MCP config existence: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Get MCP config path info (debug)
ipcMain.handle('mcp-config-get-info', async () => {
  try {
    if (!mcpConfigManager) {
      throw new Error('MCP Config Manager not initialized')
    }

    const info = mcpConfigManager.getConfigInfo()
    log(`MCP Config Info: ${JSON.stringify(info, null, 2)}`)
    return { success: true, info }
  } catch (error) {
    log(`Failed to get MCP config info: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// ========================= Proxy-related IPC handlers removed =========================
// Note: integrated architecture now; proxy-manager not required
// All proxy-related IPC handlers and helpers removed

// Clear all app data (dev only)
// Window control IPC handlers
console.log('[IPC] Registering show-window handler')
ipcMain.handle('show-window', async () => {
  try {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      return { success: true }
    }
    return { success: false, error: 'Window not found' }
  } catch (error) {
    console.error('Failed to show window:', error)
    return { success: false, error: error.message }
  }
})

console.log('[IPC] Registering focus-window handler')
ipcMain.handle('focus-window', async () => {
  try {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
      mainWindow.focus()
      return { success: true }
    }
    return { success: false, error: 'Window not found' }
  } catch (error) {
    console.error('Failed to focus window:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('clear-all-app-data', async () => {
  try {
    log('[Clear Data] Starting to clear all application data...')

    const userData = app.getPath('userData')
    log(`[Clear Data] User data path: ${userData}`)

    // Clear master password file
    const passwordResult = passwordManager.removeMasterPassword()
    log(`[Clear Data] Password removal result: ${passwordResult.success}`)

    // Clear log file
    try {
      const logPath = path.join(userData, 'app.log')
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath)
        log('[Clear Data] App log file removed')
      }
    } catch (error) {
      log(`[Clear Data] Failed to remove log file: ${error.message}`)
    }

    // Clear backup directory
    try {
      const backupsDir = path.join(userData, 'backups')
      if (fs.existsSync(backupsDir)) {
        fs.rmSync(backupsDir, { recursive: true, force: true })
        log('[Clear Data] Backups directory removed')
      }
    } catch (error) {
      log(`[Clear Data] Failed to remove backups: ${error.message}`)
    }

    log('[Clear Data] All application data cleared successfully')
    return { success: true }
  } catch (error) {
    log(`[Clear Data] Failed to clear application data: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Test MCP service connection
ipcMain.handle('test-mcp-server', async (event, { address, accessToken }) => {
  try {
    log(`Testing MCP server connection: ${address}`)

    // Token is required
    if (!accessToken || accessToken.trim() === '') {
      log('MCP server test failed: No access token provided')
      return {
        success: false,
        error: 'Access token is required for connection'
      }
    }

    // Use a Socket.IO client for a real connection test
    const io = require('socket.io-client')

    return new Promise((resolve) => {
      const socket = io(address, {
        auth: {
          token: accessToken
        },
        reconnection: false,
        timeout: 5000,
        transports: ['websocket', 'polling']
      })

      // Connection successful
      socket.on('connect', () => {
        log(`MCP server test successful: ${address}`)
        socket.disconnect()
        resolve({
          success: true,
          message: 'Connection and authentication successful'
        })
      })

      // Connection error
      socket.on('connect_error', (error) => {
        log(`MCP server test failed: ${error.message}`)
        socket.disconnect()

        // Detect auth failure from error info
        if (
          error.message.includes('Authentication') ||
          error.message.includes('Unauthorized')
        ) {
          resolve({
            success: false,
            error: 'Invalid access token'
          })
        } else if (error.message.includes('timeout')) {
          resolve({
            success: false,
            error: 'Connection timeout. Please check if the server is running.'
          })
        } else {
          resolve({
            success: false,
            error: `Connection failed: ${error.message}`
          })
        }
      })

      // Timeout handling
      setTimeout(() => {
        if (socket.connected) {
          socket.disconnect()
        }
        log('MCP server test timeout')
        resolve({
          success: false,
          error: 'Connection timeout. Please check if the server is running.'
        })
      }, 5000)
    })
  } catch (error) {
    log(`Failed to test MCP server: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Detect locally installed apps
ipcMain.handle('check-installed-apps', async () => {
  const installedApps = {}

  try {
    if (process.platform === 'darwin') {
      // macOS app detection paths
      const appPaths = {
        cursor: '/Applications/Cursor.app',
        claude: '/Applications/Claude.app',
        vscode: '/Applications/Visual Studio Code.app',
        windsurf: '/Applications/Windsurf.app'
      }

      for (const [app, appPath] of Object.entries(appPaths)) {
        if (fs.existsSync(appPath)) {
          installedApps[app] = {
            installed: true,
            path: appPath,
            icon: null
          }

          // Try to get app icon
          try {
            const iconPath = path.join(
              appPath,
              'Contents',
              'Resources',
              'electron.icns'
            )
            const alternativeIconPath = path.join(
              appPath,
              'Contents',
              'Resources',
              'app.icns'
            )
            const vscodeIconPath = path.join(
              appPath,
              'Contents',
              'Resources',
              'Code.icns'
            )

            let finalIconPath = null
            if (fs.existsSync(iconPath)) {
              finalIconPath = iconPath
            } else if (fs.existsSync(alternativeIconPath)) {
              finalIconPath = alternativeIconPath
            } else if (fs.existsSync(vscodeIconPath)) {
              finalIconPath = vscodeIconPath
            }

            if (finalIconPath) {
              // Use Electron nativeImage to process icons
              const icon = nativeImage
                .createFromPath(finalIconPath)
                .resize({ width: 16, height: 16 })
              if (!icon.isEmpty()) {
                // Convert to PNG and encode as base64
                const buffer = icon.toPNG()
                installedApps[
                  app
                ].icon = `data:image/png;base64,${buffer.toString('base64')}`
              }
            }
          } catch (iconError) {
            log(`Failed to get icon for ${app}: ${iconError.message}`)
          }
        } else {
          installedApps[app] = {
            installed: false,
            path: null,
            icon: null
          }
        }
      }
    } else if (process.platform === 'win32') {
      // Windows app detection
      const { exec } = require('child_process')
      const checkApp = (command) => {
        return new Promise((resolve) => {
          exec(command, (error) => {
            resolve(!error)
          })
        })
      }

      // Windows app paths
      const appPaths = {
        cursor:
          'C:\\Users\\' +
          process.env.USERNAME +
          '\\AppData\\Local\\Programs\\cursor\\Cursor.exe',
        claude:
          'C:\\Users\\' +
          process.env.USERNAME +
          '\\AppData\\Local\\Programs\\claude-desktop\\Claude.exe',
        vscode: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
        windsurf:
          'C:\\Users\\' +
          process.env.USERNAME +
          '\\AppData\\Local\\Programs\\windsurf\\Windsurf.exe'
      }

      for (const [app, exePath] of Object.entries(appPaths)) {
        const exists =
          fs.existsSync(exePath) ||
          (app === 'cursor' && (await checkApp('where cursor'))) ||
          (app === 'vscode' && (await checkApp('where code')))

        if (exists) {
          installedApps[app] = {
            installed: true,
            path: exePath,
            icon: null
          }

          // Try to get Windows app icon
          try {
            if (fs.existsSync(exePath)) {
              const icon = nativeImage
                .createFromPath(exePath)
                .resize({ width: 16, height: 16 })
              if (!icon.isEmpty()) {
                const buffer = icon.toPNG()
                installedApps[
                  app
                ].icon = `data:image/png;base64,${buffer.toString('base64')}`
              }
            }
          } catch (iconError) {
            log(`Failed to get icon for ${app}: ${iconError.message}`)
          }
        } else {
          installedApps[app] = {
            installed: false,
            path: null,
            icon: null
          }
        }
      }
    } else {
      // Linux app detection
      const { exec } = require('child_process')
      const checkApp = (command) => {
        return new Promise((resolve) => {
          exec(`which ${command}`, (error, stdout) => {
            if (!error && stdout) {
              resolve(stdout.trim())
            } else {
              resolve(null)
            }
          })
        })
      }

      const apps = {
        cursor: 'cursor',
        claude: 'claude',
        vscode: 'code',
        windsurf: 'windsurf'
      }

      for (const [app, command] of Object.entries(apps)) {
        const appPath = await checkApp(command)

        if (appPath) {
          installedApps[app] = {
            installed: true,
            path: appPath,
            icon: null
          }

          // Fetching icons on Linux is complex; skipping for now
          // You can try /usr/share/icons or /usr/share/pixmaps
        } else {
          installedApps[app] = {
            installed: false,
            path: null,
            icon: null
          }
        }
      }
    }

    log(`Detected installed apps: ${JSON.stringify(installedApps)}`)
    return installedApps
  } catch (error) {
    log(`Error checking installed apps: ${error.message}`)
    return installedApps
  }
})

// Get absolute project root path
ipcMain.handle('get-project-root-path', () => {
  try {
    // In dev, __dirname is the electron directory
    // Project root should be the parent directory
    const currentDir = __dirname // electron directory
    const projectRoot = path.resolve(currentDir, '..') // parent directory is the project root

    log(`Project root path: ${projectRoot}`)
    return projectRoot
  } catch (error) {
    log(`Failed to get project root path: ${error.message}`)
    // Fallback to app.getAppPath()
    try {
      const appPath = app.getAppPath()
      log(`Using app path as fallback: ${appPath}`)
      return appPath
    } catch (appPathError) {
      log(`App path also failed: ${appPathError.message}`)
      return process.cwd() // final fallback
    }
  }
})

// Get current working directory
ipcMain.handle('get-current-working-directory', () => {
  try {
    const cwd = process.cwd()
    log(`Current working directory: ${cwd}`)
    return cwd
  } catch (error) {
    log(`Failed to get current working directory: ${error.message}`)
    return null
  }
})

// Get app path
ipcMain.handle('get-app-path', () => {
  try {
    const appPath = app.getAppPath()
    log(`App path: ${appPath}`)
    return appPath
  } catch (error) {
    log(`Failed to get app path: ${error.message}`)
    return null
  }
})

// Show native context menu
ipcMain.handle(
  'show-connection-menu',
  async (event, x, y, serverId, configuredApps = []) => {
    try {
      // Detect installed apps
      const installedApps = {}

      if (process.platform === 'darwin') {
        const appPaths = {
          cursor: '/Applications/Cursor.app',
          claude: '/Applications/Claude.app',
          vscode: '/Applications/Visual Studio Code.app',
          windsurf: '/Applications/Windsurf.app'
        }

        for (const [app, appPath] of Object.entries(appPaths)) {
          installedApps[app] = fs.existsSync(appPath)
        }
      } else if (process.platform === 'win32') {
        const appPaths = {
          cursor:
            'C:\\Users\\' +
            process.env.USERNAME +
            '\\AppData\\Local\\Programs\\cursor\\Cursor.exe',
          claude:
            'C:\\Users\\' +
            process.env.USERNAME +
            '\\AppData\\Local\\Programs\\claude-desktop\\Claude.exe',
          vscode: 'C:\\Program Files\\Microsoft VS Code\\Code.exe',
          windsurf:
            'C:\\Users\\' +
            process.env.USERNAME +
            '\\AppData\\Local\\Programs\\windsurf\\Windsurf.exe'
        }

        for (const [app, appPath] of Object.entries(appPaths)) {
          installedApps[app] = fs.existsSync(appPath)
        }
      }

      // Build menu template
      const menuTemplate = [
        {
          label: 'Add to ChatGPT',
          click: () => {
            event.sender.send('connection-menu-action', {
              serverId,
              action: 'add-url'
            })
          }
        },
        {
          label: 'Add to Claude Desktop',
          click: () => {
            event.sender.send('connection-menu-action', {
              serverId,
              action: 'add-url'
            })
          }
        },
        { type: 'separator' },
        {
          label: 'Add MCP Server with URL',
          click: () => {
            event.sender.send('connection-menu-action', {
              serverId,
              action: 'add-url'
            })
          }
        },
        {
          label: 'Add MCP Server with JSON',
          click: () => {
            event.sender.send('connection-menu-action', {
              serverId,
              action: 'add-json'
            })
          }
        },
        { type: 'separator' }
      ]

      // Dynamically add installed app config options
      const appLabels = {
        // claude: 'Config to Claude',
        cursor: 'Add to Cursor',
        vscode: 'Add to VS Code',
        windsurf: 'Add to Windsurf'
      }

      for (const [app, label] of Object.entries(appLabels)) {
        if (installedApps[app]) {
          // Check whether it is already configured
          const isConfigured = configuredApps.includes(app)

          log(
            `[Menu] ${app}: installed=${installedApps[app]}, configured=${isConfigured}`
          )
          log(`[Menu] configuredApps array:`, configuredApps)

          menuTemplate.push({
            label: isConfigured ? `${label} ✓` : label,
            // Always enabled - allow user to view configuration status
            enabled: true,
            click: () => {
              event.sender.send('connection-menu-action', {
                serverId,
                action: `config-${app}`
              })
            }
          })
        }
      }

      log(`[Menu] Final menu template:`, JSON.stringify(menuTemplate, null, 2))

      const menu = Menu.buildFromTemplate(menuTemplate)

      menu.popup({
        window: BrowserWindow.fromWebContents(event.sender),
        x: Math.round(x),
        y: Math.round(y)
      })

      return { success: true }
    } catch (error) {
      log(`Failed to show connection menu: ${error.message}`)
      return { success: false, error: error.message }
    }
  }
)

// Settings menu handler
ipcMain.handle('show-settings-menu', async (event, x, y, autoLockTimer) => {
  try {
    log('[Settings Menu] Building settings menu...')
    log('[Settings Menu] Current autoLockTimer:', autoLockTimer)

    // Auto-lock submenu
    const timeOptions = [
      { label: '5 min', value: 5 },
      { label: '15 min', value: 15 },
      { label: '30 min', value: 30 },
      { label: '1 hour', value: 60 },
      { label: 'Never', value: -1 }
    ]

    const autoLockSubmenu = timeOptions.map((option) => ({
      label: option.label,
      type: 'checkbox',
      checked: autoLockTimer === option.value,
      click: () => {
        event.sender.send('settings-menu-action', {
          action: 'auto-lock-time',
          value: option.value
        })
      }
    }))

    const menuTemplate = [
      {
        label: 'Add Peta MCP Server',
        click: () => {
          event.sender.send('settings-menu-action', { action: 'add-server' })
        }
      },
      {
        label: 'Manage MCP Server',
        click: () => {
          event.sender.send('settings-menu-action', { action: 'manage-server' })
        }
      },
      // {
      //   label: 'Add Client',
      //   click: () => {
      //     event.sender.send('settings-menu-action', { action: 'add-client' })
      //   }
      // },
      { type: 'separator' },
      {
        label: 'AutoLock',
        submenu: autoLockSubmenu
      },
      {
        label: 'Security Settings',
        click: () => {
          event.sender.send('settings-menu-action', { action: 'security' })
        }
      },
      {
        label: 'Backup && Restore',
        click: () => {
          event.sender.send('settings-menu-action', { action: 'backup' })
        }
      },
      // {
      //   label: 'Playground Specific',
      //   click: () => {
      //     event.sender.send('settings-menu-action', { action: 'playground' })
      //   }
      // },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit()
        }
      }
    ]

    // Add development menu items in dev mode
    if (process.env.NODE_ENV === 'development') {
      menuTemplate.push(
        { type: 'separator' },
        {
          label: '🧹 Clear All Cache (Dev)',
          click: () => {
            event.sender.send('settings-menu-action', { action: 'clear-cache' })
          }
        }
      )
    }

    log('[Settings Menu] Menu template built')

    const menu = Menu.buildFromTemplate(menuTemplate)

    menu.popup({
      window: BrowserWindow.fromWebContents(event.sender),
      x: Math.round(x),
      y: Math.round(y)
    })

    return { success: true }
  } catch (error) {
    log(`Failed to show settings menu: ${error.message}`)
    return { success: false, error: error.message }
  }
})

// Security authorization window and dangerous operation handlers removed
// These were only used by proxy-manager which has been removed in the integrated architecture

app.whenReady().then(async () => {
  try {
    performanceMarks._start = Date.now()
    markPerformance('App Ready')
    log('Starting application...')

    // Create window and tray first so the UI appears quickly
    await createWindow()
    markPerformance('Window created')

    try {
      createTray()
      markPerformance('Tray created')
    } catch (error) {
      log(`Tray creation failed: ${error.message}`)
      console.error('Tray creation error:', error)
    }

    // Delay non-critical services to avoid blocking the UI
    setImmediate(() => {
      try {
        // Initialize MCP config manager
        mcpConfigManager = new MCPConfigManager()
        log('MCP Config Manager initialized')
        markPerformance('MCP Config Manager initialized')

        // Initialize Google Drive auth manager
        googleDriveAuth = new GoogleDriveAuth()
        log('Google Drive Auth initialized')
        markPerformance('Google Drive Auth initialized')

        // Set socket connection state callback
        socketClient.setConnectionStatusCallback((connected) => {
          log(`Socket connection status changed: ${connected}`)
          isConnected = connected
          updateTrayIcon()
        })
        log('Socket client connection callback registered')
        markPerformance('All services initialized')

        // Log total startup time
        const totalTime = Date.now() - performanceMarks._start
        log(`Application startup completed in ${totalTime}ms`)
      } catch (error) {
        log(`Service initialization error: ${error.message}`)
        console.error('Service initialization error:', error)
      }
    })
  } catch (error) {
    log(`Application startup error: ${error.message}`)
    console.error('Failed to start application:', error)

    // Create the window even if services fail to start
    if (!mainWindow) {
      try {
        await createWindow()
      } catch (windowError) {
        log(`Window creation also failed: ${windowError.message}`)
        app.quit()
      }
    }
  }
})

app.on('window-all-closed', () => {
  // On macOS, keep app running in tray when window is closed
  if (process.platform !== 'darwin') {
    // On Windows/Linux, minimize to tray instead of quitting
    console.log('All windows closed, app continues in tray')
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  } else {
    // Toggle window visibility like tray click
    toggleMainWindow()
  }
})

// Clean up on app quit
app.on('before-quit', async () => {
  // Stop static file server
  stopStaticFileServer()

  // Unregister all shortcuts
  globalShortcut.unregisterAll()

  if (tray) {
    tray.destroy()
  }
})

// Unhandled exception handling to prevent silent crashes
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`)
  console.error(error)
})

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled promise rejection: ${reason}`)
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})
