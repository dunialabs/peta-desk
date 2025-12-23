const { BrowserWindow, app } = require('electron')
const https = require('https')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

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

  return path.join(userDataPath, 'figma-tokens.json')
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
      console.error('Failed to read Figma tokens:', error)
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
      console.error('Failed to write Figma tokens:', error)
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
      console.error('Failed to delete Figma tokens:', error)
    }
  }
}

// PKCE helper functions
const PKCEHelper = {
  // Generate code_verifier (32 bytes random, base64url encoded)
  generateCodeVerifier: () => {
    return crypto.randomBytes(32).toString('base64url')
  },

  // Generate code_challenge (SHA-256 hash of verifier, base64url encoded)
  generateCodeChallenge: (verifier) => {
    const hash = crypto.createHash('sha256')
    hash.update(verifier)
    return hash.digest('base64url')
  }
}

// Redirect URI for the Electron desktop app
const REDIRECT_URI = 'http://localhost'

// Figma OAuth scopes
const SCOPES = 'current_user:read,file_content:read,file_metadata:read,file_versions:read,file_comments:read,file_comments:write,library_content:read,file_variables:read,library_analytics:read'

class FigmaAuth {
  constructor() {
    // Store currently used credentials
    this.clientId = null
    this.clientSecret = null
    this.codeVerifier = null // PKCE code verifier

    // Figma OAuth endpoints
    this.authUrl = 'https://www.figma.com/oauth'
    this.tokenUrl = 'https://api.figma.com/v1/oauth/token'
  }

  /**
   * Start the OAuth authorization flow
   * Open the Figma sign-in page inside an Electron window
   * @param {Object} options - Authorization options
   * @param {string} options.clientId - Figma OAuth Client ID
   * @param {string} options.clientSecret - Figma OAuth Client Secret
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

      console.log('Starting Figma OAuth authentication...')

      // Generate PKCE parameters
      this.codeVerifier = PKCEHelper.generateCodeVerifier()
      const codeChallenge = PKCEHelper.generateCodeChallenge(this.codeVerifier)

      console.log('Generated PKCE parameters')
      console.log('  - Code verifier length:', this.codeVerifier.length)
      console.log('  - Code challenge length:', codeChallenge.length)

      // Generate state parameter for CSRF protection
      const state = crypto.randomBytes(16).toString('hex')

      // Generate authorization URL
      const authUrlWithParams = `${this.authUrl}?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=${encodeURIComponent(SCOPES)}&` +
        `state=${encodeURIComponent(state)}&` +
        `response_type=code&` +
        `code_challenge=${encodeURIComponent(codeChallenge)}&` +
        `code_challenge_method=S256`

      console.log('Generated Figma auth URL')

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
      let hasBlurred = false
      authWindow.on('blur', () => {
        console.log('Auth window lost focus, disabling alwaysOnTop')
        hasBlurred = true
        authWindow.setAlwaysOnTop(false)
      })

      // On Windows, don't re-enable alwaysOnTop after blur to avoid covering popup windows
      // On macOS, it's safe to re-enable as window management works differently
      authWindow.on('focus', () => {
        if (process.platform === 'darwin' && hasBlurred) {
          console.log('Auth window gained focus (macOS), enabling alwaysOnTop')
          authWindow.setAlwaysOnTop(true)
        } else if (hasBlurred) {
          console.log('Auth window gained focus (Windows/Linux), keeping alwaysOnTop disabled')
        }
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

      // Load the Figma authorization page
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
            await this.handleRedirect(url, authWindow, resolve, reject, state, () => {
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
            await this.handleRedirect(url, authWindow, resolve, reject, state, () => {
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
  async handleRedirect(url, authWindow, resolve, reject, expectedState, markHandled) {
    try {
      console.log('handleRedirect called')

      // Check if this is a redirect URL
      if (url.startsWith(REDIRECT_URI)) {
        console.log('URL matches redirect URI, parsing...')

        // Parse URL and extract the authorization code
        const urlParams = new URL(url).searchParams
        const code = urlParams.get('code')
        const state = urlParams.get('state')
        const error = urlParams.get('error')

        if (error) {
          console.error('OAuth error:', error)
          markHandled()
          authWindow.close()
          reject(new Error(`OAuth error: ${error}`))
          return
        }

        // Verify state parameter
        if (state !== expectedState) {
          console.error('State mismatch - possible CSRF attack')
          markHandled()
          authWindow.close()
          reject(new Error('State parameter mismatch'))
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
            console.log('✅ Figma Authorization Successful!')
            console.log('====================================')
            console.log('👤 User ID:', tokens.user_id_string || 'N/A')
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
            console.log(
              '   - Expires in:',
              tokens.expires_in ? `${tokens.expires_in} seconds (~90 days)` : 'N/A'
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
                expires_in: tokens.expires_in,
                user_id_string: tokens.user_id_string
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
   * Uses HTTP Basic Auth and URL-encoded form data as required by Figma API
   */
  async exchangeCodeForTokens(code) {
    return new Promise((resolve, reject) => {
      // Prepare HTTP Basic Auth
      const auth = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64')

      // Prepare URL-encoded form data (NOT JSON)
      const postData = new URLSearchParams({
        redirect_uri: REDIRECT_URI,
        code: code,
        grant_type: 'authorization_code',
        code_verifier: this.codeVerifier // PKCE verifier
      }).toString()

      // Prepare request options
      const options = {
        hostname: 'api.figma.com',
        port: 443,
        path: '/v1/oauth/token',
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      }

      console.log('Making token exchange request to Figma...')

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
    // Figma doesn't require explicit token revocation
    // Just clear stored tokens
    tokenStore.delete('tokens')
    console.log('✅ Figma tokens cleared successfully')
    return { success: true, message: 'Logged out successfully' }
  }
}

module.exports = FigmaAuth
