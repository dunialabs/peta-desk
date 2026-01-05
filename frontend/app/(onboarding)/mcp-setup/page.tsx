'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/common/header'
import { useSocket } from '@/contexts/socket-context'
import { useUnlock } from '@/contexts/unlock-context'

function MCPSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') || 'add'
  const editId = searchParams.get('id')
  const { connectToServer, connections, updateServerName } = useSocket()
  const { showUnlock } = useUnlock()

  const [serverName, setServerName] = useState('My Peta Server')
  const [serverAddress, setServerAddress] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')
  const [isTokenEncrypted, setIsTokenEncrypted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Auto-add protocol to URL
   * IP addresses (including localhost) -> http://
   * Domain names -> https://
   */
  const normalizeServerAddress = (address: string): string => {
    if (!address || address.trim() === '') return address

    const trimmed = address.trim()

    // Protocol present; return as-is
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }

    // Check for IP or localhost
    // Match localhost, 127.0.0.1, 192.168.x.x, etc.
    const isIP = /^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?$/.test(trimmed)

    // Use http:// for IPs, https:// for domains
    return isIP ? `http://${trimmed}` : `https://${trimmed}`
  }

  /**
   * Normalize then strip to origin (protocol + host + port).
   * Example: http://localhost:3002/mcp -> http://localhost:3002
   */
  const normalizeToOrigin = (address: string): string => {
    const normalized = normalizeServerAddress(address)

    try {
      const url = new URL(normalized)
      return url.origin
    } catch {
      return normalized
    }
  }

  // Check if form is valid (required fields filled)
  // In edit mode, only server name is required
  // In add mode, server name will come from socket server_info event
  const isFormValid =
    mode === 'edit'
      ? serverName.trim().length > 0
      : serverAddress.trim().length > 0 &&
        accessToken.trim().length > 0

  // Auto-fill serverAddress from URL parameter (from protocol-handler)
  useEffect(() => {
    const serverAddressParam = searchParams.get('serverAddress')
    if (serverAddressParam && mode !== 'edit') {
      console.log('[MCP Setup] Auto-filling serverAddress from URL:', serverAddressParam)
      setServerAddress(decodeURIComponent(serverAddressParam))
    }
  }, [searchParams, mode])

  // Load existing server data if editing
  useEffect(() => {
    if (mode === 'edit' && editId) {
      const loadServerData = async () => {
        const existingServers = JSON.parse(
          localStorage.getItem('mcpServers') || '[]'
        )
        const serverToEdit = existingServers.find((s: any) => s.id === editId)

        if (serverToEdit) {
          setServerName(serverToEdit.serverName)
          setServerAddress(serverToEdit.serverUrl)

          // Check if server is connected (token already decrypted in memory)
          const conn = connections.get(editId)

          if (conn?.token) {
            // Server is connected, use decrypted token from connection
            setAccessToken(conn.token)
            setIsTokenEncrypted(false)
          } else {
            // Server not connected, token is encrypted - show placeholder
            setAccessToken('<encrypted-token>')
            setIsTokenEncrypted(true)
          }
        }
      }

      loadServerData()
    }
  }, [mode, editId, connections])

  const handleTest = async () => {
    if (!serverAddress.trim()) {
      setValidationMessage('Please enter server address')
      return
    }

    // Auto-add protocol
    const normalizedAddress = normalizeToOrigin(serverAddress)
    if (normalizedAddress !== serverAddress) {
      console.log('[MCP Setup] Auto-normalized server address:', serverAddress, '->', normalizedAddress)
      setServerAddress(normalizedAddress)
    }

    setIsValidating(true)
    setValidationMessage('Testing connection...')

    try {
      // Test server connection
      if (window.electron && window.electron.testMCPServer) {
        const result = await window.electron.testMCPServer(
          normalizedAddress,
          accessToken
        )

        if (result.success) {
          setValidationMessage('✅ Connection successful!')
        } else {
          setValidationMessage(
            `❌ Connection failed: ${result.error || 'Unable to connect'}`
          )
        }
      } else {
        // Simulated test for development
        await new Promise((resolve) => setTimeout(resolve, 1500))

        try {
          new URL(serverAddress)
          setValidationMessage('✅ Configuration validated (test mode)')
        } catch {
          setValidationMessage('❌ Invalid server URL format')
        }
      }
    } catch (error) {
      setValidationMessage(
        `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsValidating(false)
    }
  }

  const handleCompleteSetup = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      return
    }

    // If editing, only save name (no validation needed for token/address)
    if (mode === 'edit') {
      setIsSubmitting(true)
      try {
        await saveServer()
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Add mode validations
    if (!serverAddress.trim()) {
      alert('Please enter server address')
      return
    }

    if (!accessToken.trim()) {
      alert('Please enter access token')
      return
    }

    // Auto-add protocol
    const normalizedAddress = normalizeToOrigin(serverAddress)
    if (normalizedAddress !== serverAddress) {
      console.log('[MCP Setup] Auto-normalized server address:', serverAddress, '->', normalizedAddress)
      setServerAddress(normalizedAddress)
    }

    // Show unlock overlay for password verification and encryption
    showUnlock('add-server', async (password: string) => {
      setIsSubmitting(true)

      try {
        // Encrypt the access token with master password
        let encryptedToken: string
        if (window.electron?.crypto) {
          const result = await window.electron.crypto.encryptToken(
            accessToken,
            password
          )
          if (result.success) {
            encryptedToken = result.encryptedToken
            console.log('✅ Token encrypted successfully')
          } else {
            alert(
              'Failed to encrypt token: ' + (result.error || 'Unknown error')
            )
            setIsSubmitting(false)
            return
          }
        } else {
          alert(
            'Encryption service not available. Please restart the application.'
          )
          setIsSubmitting(false)
          return
        }

        // Save server with encrypted token and normalized address
        await saveServer(encryptedToken, normalizedAddress)
      } catch (error) {
        console.error('Failed to encrypt token:', error)
        alert('Failed to encrypt token. Please try again.')
      } finally {
        setIsSubmitting(false)
      }
    })
  }

  const saveServer = async (encryptedToken?: string, normalizedAddress?: string) => {
    const existingServers = JSON.parse(
      localStorage.getItem('mcpServers') || '[]'
    )

    let serverId: string

    if (mode === 'edit' && editId) {
      // Update existing server - only update name
      const updatedServers = existingServers.map((s: any) => {
        if (s.id === editId) {
          return {
            ...s,
            serverName: serverName
            // Keep original serverUrl and token unchanged
          }
        }
        return s
      })
      localStorage.setItem('mcpServers', JSON.stringify(updatedServers))
      serverId = editId

      // Update the server name in socket connection if it's connected
      const conn = connections.get(editId)
      if (conn) {
        // Update connection name without reconnecting
        updateServerName(editId, serverName)
        console.log('✅ Server name updated in connection:', serverName)
      }
    } else {
      // Add new server
      // Generate unique server name if name already exists
      let uniqueServerName = serverName
      const existingNames = existingServers.map((s: any) => s.serverName)

      if (existingNames.includes(serverName)) {
        let counter = 1
        while (existingNames.includes(`${serverName} ${counter}`)) {
          counter++
        }
        uniqueServerName = `${serverName} ${counter}`
        console.log(`Server name already exists, using: ${uniqueServerName}`)
      }

      // Use normalized address if provided, otherwise use state
      const addressToSave = normalizedAddress || serverAddress

      serverId = crypto.randomUUID()
      const serverConfig = {
        id: serverId,
        serverName: uniqueServerName,
        serverUrl: addressToSave,
        token: encryptedToken,
        enabled: true,
        createdAt: new Date().toISOString()
      }
      existingServers.push(serverConfig)
      localStorage.setItem('mcpServers', JSON.stringify(existingServers))

      // Set mcpServerConnected flag for onboarding flow
      localStorage.setItem('mcpServerConnected', 'true')

      // Update tray icon to reflect servers are configured
      if (window.electron?.updateServersStatus) {
        window.electron.updateServersStatus(true)
      }

      // Connect to the new server via socket (use original token, not encrypted)
      try {
        const connectionResult = await connectToServer({
          id: serverId,
          name: uniqueServerName,
          url: addressToSave,
          token: accessToken
        })
        console.log(
          '✅ Socket connection initiated for server:',
          uniqueServerName
        )

        // Wait for server_info event to update localStorage with proxyKey
        // This ensures we have the complete server information before navigating
        const waitForServerInfo = new Promise<boolean>((resolve) => {
          let attempts = 0
          const maxAttempts = 20 // 10 seconds max (500ms * 20)

          const checkInterval = setInterval(() => {
            attempts++
            const storedData = localStorage.getItem('mcpServers')
            if (storedData) {
              const servers = JSON.parse(storedData)
              const server = servers.find((s: any) => s.id === serverId)
              if (server?.proxyKey) {
                clearInterval(checkInterval)
                console.log('✅ Server info received with proxyKey:', server.proxyKey)
                resolve(true)
                return
              }
            }

            if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              console.warn('⚠️ Timeout waiting for server_info, proceeding anyway')
              resolve(false)
            }
          }, 500)
        })

        await waitForServerInfo

        // Check for pending protocol authorization
        const pendingData = sessionStorage.getItem('protocol-handler-pending')
        if (pendingData && connectionResult.success) {
          console.log('[MCP Setup] Found pending protocol handler request, returning to protocol-handler')
          // Restore protocol data to protocol-handler-data
          const pending = JSON.parse(pendingData)
          sessionStorage.setItem('protocol-handler-data', JSON.stringify(pending.protocolData))
          sessionStorage.removeItem('protocol-handler-pending')
          // Return to protocol-handler page to continue authorization
          router.push('/protocol-handler')
          return
        }
      } catch (error) {
        console.error('❌ Failed to connect to server:', error)
      }
    }

    // Navigate to next step or dashboard
    router.push('/dashboard')
  }

  const handleCancel = () => {
    // Navigate to appropriate page based on mode
    if (mode === 'edit') {
      router.push('/server-management')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Header showSettingsButton={true} showLockButton={true} />

      <div className="max-w-md mt-[100px] w-full flex-1 flex flex-col items-center justify-between">
        <div className="w-full flex-1">
          {/* Title */}
          <div className="p-[16px]">
            <h1 className="text-[30px] font-bold text-[#0A0A0A] dark:text-gray-100 mb-[4px]">
              {mode === 'edit' ? 'Edit Server' : 'Add Peta MCP Server'}
            </h1>
            <p className="text-[14px] text-[#8E8E93] dark:text-gray-400 leading-[20px]">
              {mode === 'edit'
                ? 'Update your server configuration.'
                : 'add a server to start using MCP tools.'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-[14px] p-[16px]">
            {/* Server Name - Only show in edit mode */}
            {mode === 'edit' && (
              <div>
                <label className="block text-[14px] font-bold text-[#0A0A0A] dark:text-gray-100 mb-[4px]">
                  Your Peta Server Name
                </label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="My Peta Server"
                  className="w-full h-[48px] px-4 border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-blue-500 focus:border-transparent text-[14px] text-[#0A0A0A] dark:text-gray-100 placeholder:text-[#C7C7CC] dark:placeholder:text-gray-500"
                />
              </div>
            )}

            {/* Server Address */}
            <div>
              <label className="block text-[14px] font-bold text-[#0A0A0A] dark:text-gray-100 mb-[4px]">
                Your Peta Server Address
              </label>
              <input
                type="text"
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
                placeholder="Peta Server Address"
                disabled={mode === 'edit'}
                className="w-full h-[48px] px-4 border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-blue-500 focus:border-transparent text-[14px] text-[#0A0A0A] dark:text-gray-100 placeholder:text-[#C7C7CC] dark:placeholder:text-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-[14px] font-bold text-[#0A0A0A] dark:text-gray-100 mb-[4px]">
                Your Peta Server Access Token
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="access token"
                disabled={isTokenEncrypted}
                className="w-full h-[48px] px-4 border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-blue-500 focus:border-transparent text-[14px] text-[#0A0A0A] dark:text-gray-100 placeholder:text-[#C7C7CC] dark:placeholder:text-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
              />
              {isTokenEncrypted && (
                <p className="text-[12px] text-[#8E8E93] dark:text-gray-400 mt-2">
                  ⚠️ Token is encrypted. To edit, please connect to the server
                  first or keep the current encrypted token.
                </p>
              )}
            </div>

            {/* Test Button (Inline) - Hide in edit mode */}
            {mode !== 'edit' && (
              <>
                <button
                  onClick={handleTest}
                  disabled={isValidating}
                  className="w-full h-[48px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-[#0A0A0A] dark:text-gray-100 text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? 'Testing...' : 'Test'}
                </button>

                {/* Validation Message */}
                {validationMessage && (
                  <div
                    className={`text-[13px] text-center ${
                      validationMessage.includes('✅')
                        ? 'text-green-600 dark:text-green-400'
                        : validationMessage.includes('❌')
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-blue-500 dark:text-blue-400'
                    }`}
                  >
                    {validationMessage}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {/* Bottom Buttons */}
        <div className="flex p-[16px] w-full gap-4">
          <button
            onClick={handleCancel}
            className="flex-1 h-[48px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-[#0A0A0A] dark:text-gray-100 text-[14px] font-medium transition-colors"
          >
            {mode === 'edit' ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={handleCompleteSetup}
            disabled={!isFormValid || isSubmitting}
            className="flex-1 h-[48px] rounded-[12px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#26251E] dark:disabled:hover:bg-gray-700"
          >
            {isSubmitting
              ? 'Saving...'
              : mode === 'edit'
              ? 'Save'
              : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MCPSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          Loading...
        </div>
      }
    >
      <MCPSetupContent />
    </Suspense>
  )
}
