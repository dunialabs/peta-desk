const {
  systemPreferences,
  safeStorage,
  BrowserWindow,
  app
} = require('electron')
const path = require('path')
const fs = require('fs')

// Biometric auth module - conditional imports
let winHello = null
let msPassport = null

// Load platform-specific biometric libraries
if (process.platform === 'win32') {
  try {
    winHello = require('win-hello')
    log('win-hello module loaded successfully')
  } catch (error) {
    log(`Failed to load win-hello module: ${error.message}`)
  }

  try {
    msPassport = require('node-ms-passport')
    log('node-ms-passport module loaded successfully')
  } catch (error) {
    log(`node-ms-passport not available (optional): ${error.message}`)
  }
}

// Logging helper
function log(message) {
  console.log(`[Biometric] ${message}`)
  if (app.isPackaged) {
    const logPath = path.join(app.getPath('userData'), 'app.log')
    fs.appendFileSync(
      logPath,
      `[${new Date().toISOString()}] [Biometric] ${message}\n`
    )
  }
}

// Detect whether biometrics is available
async function isAvailable() {
  try {
    const result = {
      available: false,
      platform: process.platform,
      touchID: false,
      faceID: false,
      windowsHello: false,
      error: null
    }

    if (process.platform === 'darwin') {
      // macOS - check Touch ID
      try {
        const canPromptTouchID = await systemPreferences.canPromptTouchID()
        result.touchID = canPromptTouchID
        result.available = canPromptTouchID
        log(`macOS Touch ID available: ${canPromptTouchID}`)
      } catch (error) {
        result.error = `Touch ID check failed: ${error.message}`
        log(`Touch ID availability check failed: ${error.message}`)
      }
    } else if (process.platform === 'win32') {
      // Windows - check Windows Hello
      try {
        if (winHello) {
          const isAvailable = await winHello.isAvailable()
          result.windowsHello = isAvailable
          result.available = isAvailable
          log(`Windows Hello available: ${isAvailable}`)
        } else {
          result.error = 'Windows Hello module not loaded'
          log('Windows Hello module not available')
        }
      } catch (error) {
        result.error = `Windows Hello check failed: ${error.message}`
        log(`Windows Hello availability check failed: ${error.message}`)
      }
    } else {
      // Linux - not supported
      result.error = 'Linux platform not supported for biometric authentication'
      log('Biometric authentication not supported on Linux')
    }

    return result
  } catch (error) {
    log(`Biometric availability check error: ${error.message}`)
    return {
      available: false,
      platform: process.platform,
      touchID: false,
      faceID: false,
      windowsHello: false,
      error: error.message
    }
  }
}

// Perform biometric authentication
async function authenticate(reason = 'Verify identity to unlock the app') {
  try {
    // Preserve current window focus
    const focusedWindow = BrowserWindow.getFocusedWindow()
    let shouldRestoreFocus = false

    if (focusedWindow) {
      shouldRestoreFocus = true
    }

    if (process.platform === 'darwin') {
      // macOS Touch ID auth
      try {
        // Keep the window on top on macOS to avoid focus loss
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(true, 'modal-panel')
        }

        await systemPreferences.promptTouchID(reason)
        log('Touch ID authentication successful')

        // Restore focus and window state
        if (shouldRestoreFocus && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false)
          mainWindow.focus()
          mainWindow.show()
        }

        return { success: true, error: null }
      } catch (error) {
        log(`Touch ID authentication failed: ${error.message}`)

        // Restore focus/state even on failure
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (shouldRestoreFocus && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false)
          mainWindow.focus()
          mainWindow.show()
        }

        return { success: false, error: error.message }
      }
    } else if (process.platform === 'win32') {
      // Windows Hello auth
      try {
        if (winHello) {
          // Keep the window on top on Windows to avoid focus loss
          const mainWindow = BrowserWindow.getAllWindows()[0]
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(true)
          }

          const result = await winHello.authenticate(reason)
          log(`Windows Hello authentication result: ${result}`)

          // Restore focus and window state
          if (shouldRestoreFocus && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(false)
            mainWindow.focus()
            mainWindow.show()
          }

          return {
            success: result,
            error: result ? null : 'Authentication failed'
          }
        } else {
          return { success: false, error: 'Windows Hello not available' }
        }
      } catch (error) {
        log(`Windows Hello authentication failed: ${error.message}`)

        // Restore focus/state even on failure
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (shouldRestoreFocus && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false)
          mainWindow.focus()
          mainWindow.show()
        }

        return { success: false, error: error.message }
      }
    } else {
      return { success: false, error: 'Platform not supported' }
    }
  } catch (error) {
    log(`Biometric authentication error: ${error.message}`)

    // Restore focus if an error occurs
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus()
      mainWindow.show()
    }

    return { success: false, error: error.message }
  }
}

// Retrieve the stored master password (master-password-encrypted)
async function getPassword() {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return {
        success: false,
        password: null,
        error: 'Safe storage encryption not available'
      }
    }

    const userData = app.getPath('userData')
    const credentialPath = path.join(userData, 'master-password-encrypted')

    if (!fs.existsSync(credentialPath)) {
      return {
        success: false,
        password: null,
        error: 'No master password found'
      }
    }

    const encryptedPassword = fs.readFileSync(credentialPath)
    const password = safeStorage.decryptString(encryptedPassword)

    log('Master password retrieved for biometric authentication')
    return { success: true, password: password, error: null }
  } catch (error) {
    log(`Failed to retrieve master password: ${error.message}`)
    return { success: false, password: null, error: error.message }
  }
}

module.exports = {
  isAvailable,
  authenticate,
  getPassword
}
