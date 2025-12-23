const { BrowserWindow, app } = require('electron')
const { google } = require('googleapis')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Use the Node.js filesystem to store tokens (instead of electron-store)
// Avoids ES module compatibility issues
const getTokensFilePath = () => {
  // Use a temp directory if the app is not ready
  let userDataPath
  try {
    userDataPath = app.getPath('userData')
  } catch (error) {
    // App not ready; use the system temp directory
    const appName = 'MCP Desktop'
    if (process.platform === 'darwin') {
      userDataPath = path.join(
        os.homedir(),
        'Library',
        'Application Support',
        appName
      )
    } else if (process.platform === 'win32') {
      userDataPath = path.join(process.env.APPDATA || os.homedir(), appName)
    } else {
      userDataPath = path.join(os.homedir(), '.config', appName)
    }
  }

  // Ensure directory exists
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  return path.join(userDataPath, 'google-drive-tokens.json')
}

// Simple token storage helpers
const tokenStore = {
  get: (key) => {
    try {
      const filePath = getTokensFilePath()
      if (!fs.existsSync(filePath)) {
        return null
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      return data[key]
    } catch (error) {
      console.error('Failed to read tokens:', error)
      return null
    }
  },
  set: (key, value) => {
    try {
      const filePath = getTokensFilePath()
      let data = {}
      if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      }
      data[key] = value
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    } catch (error) {
      console.error('Failed to write tokens:', error)
    }
  },
  delete: (key) => {
    try {
      const filePath = getTokensFilePath()
      if (!fs.existsSync(filePath)) {
        return
      }
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      delete data[key]
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    } catch (error) {
      console.error('Failed to delete tokens:', error)
    }
  }
}

// Redirect URI for the Electron desktop app
// Add this URI to the OAuth client's authorized redirect URIs in Google Cloud Console
// Supported options:
// 1. http://localhost - simple and recommended for desktop apps
// 2. http://localhost:PORT - specify a port
// 3. urn:ietf:wg:oauth:2.0:oob - deprecated Google out-of-band flow
const REDIRECT_URI = 'http://localhost'

class GoogleDriveAuth {
  constructor() {
    // OAuth2Client is created dynamically inside authenticate()
    this.oauth2Client = null

    // Store currently used credentials
    this.clientId = null
    this.clientSecret = null

    // Required Google Drive scopes
    this.scopes = [
      'https://www.googleapis.com/auth/drive.file', // Only access files created by the app
      'https://www.googleapis.com/auth/drive.appdata' // Access the app data folder
    ]
  }

  /**
   * Start the OAuth authorization flow
   * Open the Google sign-in page inside an Electron window
   * @param {Object} options - Authorization options
   * @param {string} options.clientId - Google OAuth Client ID
   * @param {string} options.clientSecret - Google OAuth Client Secret
   * @param {BrowserWindow} options.parentWindow - Parent window (optional)
   */
  async authenticate({ clientId, clientSecret, parentWindow }) {
    return new Promise((resolve, reject) => {
      let isHandled = false // Flag to mark completion

      // Validate required parameters
      if (!clientId || !clientSecret) {
        reject(new Error('clientId and clientSecret are required'))
        return
      }

      // Save credentials on the instance so handleRedirect can access them
      this.clientId = clientId
      this.clientSecret = clientSecret

      // Create OAuth2Client using dynamic credentials
      this.oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        REDIRECT_URI
      )

      console.log('Created OAuth2Client with dynamic credentials')

      // Generate authorization URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline', // Request refresh token
        scope: this.scopes,
        prompt: 'consent' // Force the consent screen to request a refresh token
      })

      // Do not log the full auth URL (contains secrets)
      console.log('Generated auth URL for Google Drive authorization')

      // Create the authorization window
      const authWindow = new BrowserWindow({
        width: 600,
        height: 800,
        // No parent to avoid interference from the main window
        // parent: parentWindow,
        modal: false,
        show: true, // Show immediately
        center: true,
        alwaysOnTop: true, // Keep the window on top
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          // Allow external content (Google OAuth page)
          webSecurity: true
        }
      })

      console.log('Auth window created, loading URL...')

      // Listen for window show
      authWindow.once('ready-to-show', () => {
        console.log('Auth window ready to show')
        authWindow.show()
        authWindow.focus()
      })

      // Handle window blur to allow popup windows (e.g., Google OAuth consent) to appear on top
      authWindow.on('blur', () => {
        console.log('Auth window lost focus, disabling alwaysOnTop')
        authWindow.setAlwaysOnTop(false)
      })

      // Re-enable alwaysOnTop when window regains focus
      authWindow.on('focus', () => {
        console.log('Auth window gained focus, enabling alwaysOnTop')
        authWindow.setAlwaysOnTop(true)
      })

      // Listen for page loads
      authWindow.webContents.on('did-start-loading', () => {
        console.log('Auth window started loading')
      })

      authWindow.webContents.on('did-finish-load', () => {
        console.log('Auth window finished loading')
      })

      authWindow.webContents.on(
        'did-fail-load',
        (event, errorCode, errorDescription) => {
          console.error(
            'Auth window failed to load:',
            errorCode,
            errorDescription
          )
        }
      )

      // Load the Google authorization page
      authWindow.loadURL(authUrl)
      console.log('Started loading auth URL')

      // Watch URL changes to capture the auth code
      authWindow.webContents.on('will-redirect', async (event, url) => {
        // Do not log full URLs to avoid leaking codes
        console.log('will-redirect event triggered')

        // Block navigation when redirecting to localhost
        if (url.startsWith(REDIRECT_URI)) {
          event.preventDefault()
          console.log('Prevented redirect to localhost, capturing auth code...')

          if (!isHandled) {
            await this.handleRedirect(url, authWindow, resolve, reject, () => {
              isHandled = true
            })
          }
        }
      })

      // Also listen to will-navigate in case will-redirect does not fire
      authWindow.webContents.on('will-navigate', async (event, url) => {
        console.log('will-navigate event triggered')

        // Block navigation when target is localhost
        if (url.startsWith(REDIRECT_URI)) {
          event.preventDefault()
          console.log(
            'Prevented navigation to localhost, capturing auth code...'
          )

          if (!isHandled) {
            await this.handleRedirect(url, authWindow, resolve, reject, () => {
              isHandled = true
            })
          }
        }
      })

      // Handle window close
      authWindow.on('closed', () => {
        if (!isHandled) {
          reject(new Error('Authentication window was closed'))
        }
      })
    })
  }

  /**
   * Handle OAuth redirect
   */
  async handleRedirect(url, authWindow, resolve, reject, markHandled) {
    try {
      console.log('handleRedirect called')

      // Check if this is a redirect URL
      if (url.startsWith(REDIRECT_URI)) {
        console.log('URL matches redirect URI, parsing...')

        // Parse URL and extract the authorization code
        const urlParams = new URL(url).searchParams
        const code = urlParams.get('code')
        const error = urlParams.get('error')

        if (error) {
          console.error('OAuth error:', error)
          markHandled()
          authWindow.close()
          reject(new Error(`OAuth error: ${error}`))
          return
        }

        if (code) {
          try {
            console.log('Exchanging authorization code for tokens...')
            // Exchange the authorization code for tokens
            const { tokens } = await this.oauth2Client.getToken(code)
            this.oauth2Client.setCredentials(tokens)

            // Store tokens securely (do not log secrets)
            tokenStore.set('tokens', tokens)

            // Fetch and log user info
            let userInfo = null
            try {
              const oauth2 = google.oauth2({
                auth: this.oauth2Client,
                version: 'v2'
              })
              const { data } = await oauth2.userinfo.get()
              userInfo = data

              console.log('====================================')
              console.log('✅ Google Drive Authorization Successful!')
              console.log('====================================')
              console.log('📧 Email:', data.email)
              console.log('👤 Name:', data.name || 'N/A')
              console.log('🖼️  Picture:', data.picture || 'N/A')
              console.log('🆔 User ID:', data.id || 'N/A')
              console.log('')
              console.log('🔐 Token Information:')
              console.log('   - Token type:', tokens.token_type || 'N/A')
              console.log('   - Scope:', tokens.scope || 'N/A')
              console.log(
                '   - Expiry:',
                tokens.expiry_date
                  ? new Date(tokens.expiry_date).toLocaleString()
                  : 'N/A'
              )
              console.log(
                '   - Refresh token obtained:',
                tokens.refresh_token ? '✓ Yes' : '✗ No'
              )
              console.log('')
              console.log('💾 Storage:')
              console.log('   - File path:', getTokensFilePath())
              console.log('')
              console.log('🔧 Debug Information (Development Only):')
              console.log('   - Access Token:', tokens.access_token)
              console.log('   - Refresh Token:', tokens.refresh_token)
              console.log('')
              console.log('📝 Full Token Object:')
              console.log(JSON.stringify(tokens, null, 2))
              console.log('====================================')
            } catch (userInfoErr) {
              console.log('✅ Google Drive authorization successful!')
              console.log('⚠️  Could not fetch user info:', userInfoErr.message)
              console.log('')
              console.log('🔧 Debug - Full Token Object:')
              console.log(JSON.stringify(tokens, null, 2))
              console.log('====================================')
            }

            markHandled()
            authWindow.close()
            resolve({
              success: true,
              message: 'Authorization successful',
              // Return user and token info for the renderer
              userInfo: userInfo,
              tokenInfo: {
                token_type: tokens.token_type,
                scope: tokens.scope,
                expiry_date: tokens.expiry_date,
                expires_at: tokens.expiry_date
                  ? new Date(tokens.expiry_date).toLocaleString()
                  : null,
                has_refresh_token: !!tokens.refresh_token,
                // Debug info (development)
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                full_tokens: tokens,
                // Return the clientId and clientSecret used
                clientId: this.clientId,
                clientSecret: this.clientSecret
              },
              storage_path: getTokensFilePath()
            })
          } catch (err) {
            console.error('Failed to exchange code for tokens:', err.message)
            markHandled()
            authWindow.close()
            reject(
              new Error(`Failed to exchange code for tokens: ${err.message}`)
            )
          }
        }
      }
    } catch (err) {
      console.error('handleRedirect error:', err.message)
      markHandled()
      authWindow.close()
      reject(err)
    }
  }

  /**
   * Check whether already authorized
   */
  isAuthenticated() {
    const tokens = tokenStore.get('tokens')
    return !!tokens && !!tokens.access_token
  }

  /**
   * Get current user info
   */
  async getUserInfo() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated')
    }

    const oauth2 = google.oauth2({
      auth: this.oauth2Client,
      version: 'v2'
    })

    const { data } = await oauth2.userinfo.get()
    return {
      email: data.email,
      name: data.name,
      picture: data.picture
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken()
      this.oauth2Client.setCredentials(credentials)
      tokenStore.set('tokens', credentials)
      return credentials
    } catch (error) {
      // Refresh token expired; reauthorize
      tokenStore.delete('tokens')
      throw new Error('Refresh token expired, please re-authenticate')
    }
  }

  /**
   * Log out
   */
  async logout() {
    // Revoke token
    if (this.oauth2Client.credentials.access_token) {
      try {
        await this.oauth2Client.revokeToken(
          this.oauth2Client.credentials.access_token
        )
      } catch (error) {
        console.error('Failed to revoke token:', error)
      }
    }

    // Clear stored tokens
    tokenStore.delete('tokens')
    this.oauth2Client.setCredentials({})
  }

  /**
   * Get Google Drive client
   */
  getDriveClient() {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive')
    }

    return google.drive({
      version: 'v3',
      auth: this.oauth2Client
    })
  }

  /**
   * Upload file to Google Drive
   */
  async uploadFile(fileName, fileBuffer, mimeType = 'application/json') {
    const drive = this.getDriveClient()

    try {
      // Create file in appDataFolder
      const fileMetadata = {
        name: fileName,
        parents: ['appDataFolder'] // Use appDataFolder (hidden from users)
      }

      const media = {
        mimeType: mimeType,
        body: fileBuffer
      }

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, size, createdTime'
      })

      return {
        success: true,
        fileId: response.data.id,
        fileName: response.data.name,
        size: response.data.size,
        createdTime: response.data.createdTime
      }
    } catch (error) {
      // If authentication fails, try refreshing the token
      if (error.code === 401) {
        await this.refreshAccessToken()
        // Retry upload
        return this.uploadFile(fileName, fileBuffer, mimeType)
      }
      throw error
    }
  }

  /**
   * Download file from Google Drive
   */
  async downloadFile(fileId) {
    const drive = this.getDriveClient()

    try {
      const response = await drive.files.get(
        {
          fileId: fileId,
          alt: 'media'
        },
        { responseType: 'arraybuffer' }
      )

      return {
        success: true,
        data: Buffer.from(response.data)
      }
    } catch (error) {
      if (error.code === 401) {
        await this.refreshAccessToken()
        return this.downloadFile(fileId)
      }
      throw error
    }
  }

  /**
   * List all backup files in appDataFolder
   */
  async listBackups() {
    const drive = this.getDriveClient()

    try {
      const response = await drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name, size, createdTime, modifiedTime)',
        orderBy: 'createdTime desc'
      })

      return {
        success: true,
        files: response.data.files.map((file) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime
        }))
      }
    } catch (error) {
      if (error.code === 401) {
        await this.refreshAccessToken()
        return this.listBackups()
      }
      throw error
    }
  }

  /**
   * Delete file in Google Drive
   */
  async deleteFile(fileId) {
    const drive = this.getDriveClient()

    try {
      await drive.files.delete({
        fileId: fileId
      })

      return {
        success: true,
        message: 'File deleted successfully'
      }
    } catch (error) {
      if (error.code === 401) {
        await this.refreshAccessToken()
        return this.deleteFile(fileId)
      }
      throw error
    }
  }
}

module.exports = GoogleDriveAuth
