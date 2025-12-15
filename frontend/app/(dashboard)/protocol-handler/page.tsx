'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LockOpen, AlertCircle } from 'lucide-react'
import Header from '@/components/common/header'

// MCP server format read from localStorage
interface StoredMCPServer {
  id: string
  serverName: string
  serverUrl: string
  token: string // Encrypted token
}

interface ProtocolData {
  url: string
  action: string
  params: {
    url: string
    decodedUrl?: string
    proxyKey?: string
  }
}

export default function ProtocolHandlerPage() {
  const router = useRouter()
  const [protocolData, setProtocolData] = useState<ProtocolData | null>(null)
  const [matchedServers, setMatchedServers] = useState<StoredMCPServer[]>([])
  const [selectedServerId, setSelectedServerId] = useState<string>('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [targetUrl, setTargetUrl] = useState('')
  const [returnUrl, setReturnUrl] = useState('/dashboard')
  const [isLoading, setIsLoading] = useState(true) // Loading state

  // Read protocol data from sessionStorage with polling
  useEffect(() => {
    console.log('[Protocol Handler] Page mounted, checking sessionStorage')
    if (typeof window !== 'undefined') {
      let attempts = 0
      const maxAttempts = 10 // Wait up to 2 seconds (200ms * 10)

      const checkData = () => {
        attempts++
        console.log(`[Protocol Handler] Checking sessionStorage (attempt ${attempts}/${maxAttempts})`)

        // Read protocol data
        const dataStr = sessionStorage.getItem('protocol-handler-data')
        console.log('[Protocol Handler] protocol-handler-data from sessionStorage:', dataStr ? 'FOUND' : 'NOT FOUND')

        if (dataStr) {
          setIsLoading(false)
          try {
            const data = JSON.parse(dataStr)
            console.log(
              '[Protocol Handler] Loaded protocol data from sessionStorage:',
              data
            )
            setProtocolData(data)

            // Validate data structure
            if (!data.params) {
              console.error('[Protocol Handler] Missing params in protocol data')
              setError('Invalid protocol data: missing parameters')
              return
            }

            // Use decoded URL, fallback to original
            const urlToProcess = data.params.decodedUrl || data.params.url

            if (!urlToProcess) {
              console.error('[Protocol Handler] Missing URL in protocol data')
              setError('Invalid protocol data: missing URL')
              return
            }

            console.log('[Protocol Handler] URL to process:', urlToProcess)
            setTargetUrl(urlToProcess)

            // Extract proxyKey from protocol params
            const proxyKey = data.params.proxyKey
            console.log('[Protocol Handler] ProxyKey from protocol:', proxyKey)

            if (!proxyKey) {
              setError('Invalid protocol data: missing proxyKey')
              return
            }

            // Find matching server via proxyKey
            const servers = findServersByProxyKey(proxyKey)
            console.log(
              '[Protocol Handler] Found matching servers by proxyKey:',
              servers.length
            )
            setMatchedServers(servers)

            // If no match, extract serverAddress and navigate to add-server
            if (servers.length === 0) {
              console.log('[Protocol Handler] No matching servers found, redirecting to add server')
              // Extract server address from URL
              const serverAddress = extractServerAddress(urlToProcess)

              // Save full protocol data to return after adding
              sessionStorage.setItem('protocol-handler-pending', JSON.stringify({
                protocolData: data,
                serverAddress: serverAddress,
                targetUrl: urlToProcess,
                proxyKey: proxyKey
              }))
              // Navigate to add-server page with serverAddress
              if (serverAddress) {
                router.push(`/mcp-setup?serverAddress=${encodeURIComponent(serverAddress)}`)
              } else {
                setError('Unable to extract server address from URL')
              }
              return
            }

            // Auto-select when only one matching server
            if (servers.length === 1) {
              setSelectedServerId(servers[0].id)
            }

            // Clear consumed data
            sessionStorage.removeItem('protocol-handler-data')

            // Read return URL
            const savedReturnUrl = sessionStorage.getItem(
              'protocol-handler-return-url'
            )
            if (savedReturnUrl) {
              setReturnUrl(savedReturnUrl)
              sessionStorage.removeItem('protocol-handler-return-url')
            }
          } catch (error) {
            console.error(
              '[Protocol Handler] Failed to parse protocol data:',
              error
            )
            setError(
              `Invalid protocol data: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`
            )
            setIsLoading(false)
          }
        } else if (attempts >= maxAttempts) {
          // Timed out; no data found
          console.warn(
            '[Protocol Handler] Timeout: No protocol data found in sessionStorage after',
            maxAttempts,
            'attempts'
          )
          setError('No protocol data available')
          setIsLoading(false)
        } else {
          // Continue waiting
          setTimeout(checkData, 200)
        }
      }

      // Start checking
      checkData()
    }
  }, [])

  /**
   * Extract server address from URL (protocol + host + port)
   */
  const extractServerAddress = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url)
      // Return protocol://hostname:port format
      return `${parsedUrl.protocol}//${parsedUrl.host}`
    } catch (error) {
      console.error('[Protocol Handler] Failed to parse URL:', error)
      return null
    }
  }

  /**
   * Find matching server via proxyKey
   */
  const findServersByProxyKey = (proxyKey: string): StoredMCPServer[] => {
    try {
      const storedData = localStorage.getItem('mcpServers')
      if (!storedData) {
        console.log('[Protocol Handler] No servers found in localStorage')
        return []
      }

      const allServers: StoredMCPServer[] = JSON.parse(storedData)
      console.log(
        '[Protocol Handler] Total servers in storage:',
        allServers.length
      )

      // Match server via proxyKey
      const matched = allServers.filter((server: any) => {
        return server.proxyKey === proxyKey
      })

      console.log(`[Protocol Handler] Found ${matched.length} server(s) with proxyKey: ${proxyKey}`)
      return matched
    } catch (error) {
      console.error(
        '[Protocol Handler] Error reading servers from localStorage:',
        error
      )
      return []
    }
  }

  /**
   * Read from localStorage and match serverUrl as fallback
   */
  const findMatchingServers = (serverAddress: string): StoredMCPServer[] => {
    try {
      const storedData = localStorage.getItem('mcpServers')
      if (!storedData) {
        console.log('[Protocol Handler] No servers found in localStorage')
        return []
      }

      const allServers: StoredMCPServer[] = JSON.parse(storedData)
      console.log(
        '[Protocol Handler] Total servers in storage:',
        allServers.length
      )

      // Match server address
      const matched = allServers.filter((server) => {
        const normalizedServerUrl = server.serverUrl.replace(/\/$/, '') // Remove trailing slash
        const normalizedAddress = serverAddress.replace(/\/$/, '')
        return normalizedServerUrl === normalizedAddress
      })

      return matched
    } catch (error) {
      console.error(
        '[Protocol Handler] Error reading servers from localStorage:',
        error
      )
      return []
    }
  }

  /**
   * Handle opening the browser
   */
  const handleOpenBrowser = async () => {
    if (!selectedServerId) {
      setError('Please select a server')
      return
    }

    if (!password) {
      setError('Please enter your master password')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      // Verify master password
      if (window.electron?.password) {
        const result = await window.electron.password.verify(password)
        if (!result.success) {
          setError('Incorrect master password')
          setIsProcessing(false)
          return
        }
      } else {
        setError('Password manager not available')
        setIsProcessing(false)
        return
      }

      // Find selected server
      const selectedServer = matchedServers.find(
        (s) => s.id === selectedServerId
      )
      if (!selectedServer) {
        setError('Selected server not found')
        setIsProcessing(false)
        return
      }

      // Decrypt token
      if (!window.electron?.crypto) {
        setError('Crypto module not available')
        setIsProcessing(false)
        return
      }

      const decryptResult = await window.electron.crypto.decryptToken(
        selectedServer.token,
        password
      )

      if (!decryptResult.success || !decryptResult.token) {
        setError('Failed to decrypt token. Incorrect password?')
        setIsProcessing(false)
        return
      }

      const decryptedToken = decryptResult.token
      console.log('[Protocol Handler] Token decrypted successfully')

      // Build final URL (original URL + token)
      const finalUrl = `${targetUrl}${
        targetUrl.includes('?') ? '&' : '?'
      }token=${encodeURIComponent(decryptedToken)}`
      console.log('[Protocol Handler] Opening browser with URL:', finalUrl)

      // Open browser
      if (window.electron?.shell) {
        await window.electron.shell.openExternal(finalUrl)

        // Return to previous page after success
        setTimeout(() => {
          console.log('[Protocol Handler] Returning to:', returnUrl)
          router.push(returnUrl)
        }, 500)
      } else {
        setError('Shell module not available')
        setIsProcessing(false)
      }
    } catch (error) {
      console.error('[Protocol Handler] Error:', error)
      setError('An error occurred while processing the request')
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showSettingsButton={true} />

      <div className="max-w-md mx-auto mt-[100px] w-full flex-1 flex flex-col px-4">
        <div className="w-full flex-1">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#26251E] dark:border-gray-700"></div>
              <p className="mt-4 text-[14px] text-[#8E8E93] dark:text-gray-400">Loading authorization request...</p>
            </div>
          )}

          {/* Title */}
          {!isLoading && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <LockOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-[30px] font-bold text-[#0A0A0A] dark:text-gray-100">
                  Authorization to Client.
                </h1>
              </div>
              <p className="text-[14px] text-[#8E8E93] dark:text-gray-400 leading-[20px]">
                Select a server and enter your password to continue
              </p>
            </div>
          )}

          {/* Server Selection */}
          {!isLoading && matchedServers.length > 0 && (
            <div className="mb-6">
              <label className="block text-[16px] font-semibold text-[#0A0A0A] dark:text-gray-100 mb-[8px]">
                Select Server
              </label>
              <select
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                className="w-full h-[48px] px-[16px] text-[16px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#26251E] dark:focus:ring-white focus:border-transparent disabled:opacity-50 text-gray-900 dark:text-gray-100"
                disabled={matchedServers.length === 1}
              >
                {matchedServers.length > 1 && (
                  <option value="">-- Select a server --</option>
                )}
                {matchedServers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.serverName} ({server.serverUrl})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isLoading && matchedServers.length === 0 && !error && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-[12px] p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[14px] font-medium text-yellow-900 dark:text-yellow-100">
                    No matching servers found
                  </div>
                  <div className="text-[12px] text-yellow-700 dark:text-yellow-300 mt-1">
                    Please add a server configuration that matches the target URL
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Token Decrypt Notice */}
          {!isLoading && matchedServers.length > 0 && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-[12px] p-4">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <div>
                  <div className="text-[14px] font-medium text-blue-900 dark:text-blue-100">
                    Token Decryption Required
                  </div>
                  <div className="text-[12px] text-blue-700 dark:text-blue-300 mt-1">
                    The server token is encrypted. Enter your master password to
                    decrypt it and open the URL.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Master Password Input */}
          {!isLoading && matchedServers.length > 0 && (
            <div className="mb-6">
              <label className="block text-[16px] font-semibold text-[#0A0A0A] dark:text-gray-100 mb-[8px]">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isProcessing) {
                      handleOpenBrowser()
                    }
                  }}
                  placeholder="Enter master password"
                  autoFocus
                  disabled={isProcessing}
                  className="w-full h-[48px] px-[16px] pr-[48px] text-[16px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#26251E] dark:focus:ring-white focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[16px] top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200"
                  disabled={isProcessing}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {error && (
                <p className="text-[14px] text-red-500 dark:text-red-400 mt-2">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Bottom Buttons */}
        {!isLoading && (
          <div className="flex gap-4 pb-6 sticky bottom-0 pt-4">
            <button
              onClick={() => router.push(returnUrl)}
              disabled={isProcessing}
              className="flex-1 h-[48px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-[#0A0A0A] dark:text-gray-100 text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            {matchedServers.length > 0 && (
              <button
                onClick={handleOpenBrowser}
                disabled={!selectedServerId || !password || isProcessing}
                className="flex-1 h-[48px] rounded-[12px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Open Browser'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
