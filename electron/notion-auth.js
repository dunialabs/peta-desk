const { BrowserWindow, app } = require('electron')
const https = require('https')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Use the Node.js filesystem to store tokens
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

  return path.join(userDataPath, 'notion-tokens.json')
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
      console.error('Failed to read Notion tokens:', error)
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
      console.error('Failed to write Notion tokens:', error)
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
      console.error('Failed to delete Notion tokens:', error)
    }
  }
}

// Redirect URI for the Electron desktop app
const REDIRECT_URI = 'http://localhost'

class NotionAuth {
  constructor() {
    // Store currently used credentials
    this.clientId = null
    this.clientSecret = null

    // Notion OAuth endpoints
    this.authUrl = 'https://api.notion.com/v1/oauth/authorize'
    this.tokenUrl = 'https://api.notion.com/v1/oauth/token'
  }

  /**
   * Start the OAuth authorization flow
   * Open the Notion sign-in page inside an Electron window
   * @param {Object} options - Authorization options
   * @param {string} options.clientId - Notion OAuth Client ID
   * @param {string} options.clientSecret - Notion OAuth Client Secret
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

      // Save credentials on the instance
      this.clientId = clientId
      this.clientSecret = clientSecret

      console.log('Starting Notion OAuth authentication...')

      // Generate authorization URL
      const authUrlWithParams = `${this.authUrl}?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
      )}&response_type=code&owner=user`

      console.log('Generated Notion auth URL')

      // Create the authorization window
      const authWindow = new BrowserWindow({
        width: 600,
        height: 800,
        modal: false,
        show: true,
        center: true,
        alwaysOnTop: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
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

      // Handle window blur to allow popup windows (e.g., Google OAuth) to appear on top
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

      // Load the Notion authorization page
      authWindow.loadURL(authUrlWithParams)
      console.log('Started loading auth URL')

      // Watch URL changes to capture the auth code
      authWindow.webContents.on('will-redirect', async (event, url) => {
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
            const tokens = await this.exchangeCodeForTokens(code)

            // Store tokens securely
            tokenStore.set('tokens', tokens)

            console.log('====================================')
            console.log('✅ Notion Authorization Successful!')
            console.log('====================================')
            console.log('🏢 Workspace:', tokens.workspace_name || 'N/A')
            console.log('🆔 Workspace ID:', tokens.workspace_id || 'N/A')
            console.log('🤖 Bot ID:', tokens.bot_id || 'N/A')
            console.log('')
            console.log('🔐 Token Information:')
            console.log('   - Token type:', tokens.token_type || 'N/A')
            console.log(
              '   - Has access token:',
              tokens.access_token ? '✓ Yes' : '✗ No'
            )
            console.log(
              '   - Has refresh token:',
              tokens.refresh_token ? '✓ Yes' : '✗ No'
            )
            console.log('')
            console.log('💾 Storage:')
            console.log('   - File path:', getTokensFilePath())
            console.log('')
            console.log('🔧 Debug Information (Development Only):')
            console.log('   - Access Token:', tokens.access_token)
            console.log('   - Refresh Token:', tokens.refresh_token || 'N/A')
            console.log('')
            console.log('📝 Full Token Object:')
            console.log(JSON.stringify(tokens, null, 2))
            console.log('====================================')

            markHandled()
            authWindow.close()
            resolve({
              success: true,
              message: 'Authorization successful',
              tokenInfo: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_type: tokens.token_type,
                bot_id: tokens.bot_id,
                workspace_id: tokens.workspace_id,
                workspace_name: tokens.workspace_name,
                owner: tokens.owner,
                duplicated_template_id: tokens.duplicated_template_id
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
   * Exchange authorization code for tokens
   * Uses HTTP Basic Auth as required by Notion API
   */
  async exchangeCodeForTokens(code) {
    return new Promise((resolve, reject) => {
      // Prepare HTTP Basic Auth
      const auth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64')

      // Prepare request body
      const postData = JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })

      // Prepare request options
      const options = {
        hostname: 'api.notion.com',
        port: 443,
        path: '/v1/oauth/token',
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }

      console.log('Making token exchange request to Notion...')

      const req = https.request(options, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          console.log('Token exchange response received')

          if (res.statusCode === 200) {
            try {
              const tokens = JSON.parse(data)
              console.log('✅ Token exchange successful')
              resolve(tokens)
            } catch (err) {
              console.error('Failed to parse token response:', err)
              reject(new Error('Failed to parse token response'))
            }
          } else {
            console.error('Token exchange failed:', res.statusCode, data)
            reject(
              new Error(
                `Token exchange failed with status ${res.statusCode}: ${data}`
              )
            )
          }
        })
      })

      req.on('error', (err) => {
        console.error('Token exchange request error:', err)
        reject(err)
      })

      // Write request body
      req.write(postData)
      req.end()
    })
  }

  /**
   * Check whether already authorized
   */
  isAuthenticated() {
    const tokens = tokenStore.get('tokens')
    return !!tokens && !!tokens.access_token
  }

  /**
   * Log out
   */
  async logout() {
    // Notion doesn't require explicit token revocation
    // Just clear stored tokens
    tokenStore.delete('tokens')
    console.log('✅ Notion tokens cleared successfully')
    return { success: true, message: 'Logged out successfully' }
  }
}

module.exports = NotionAuth
