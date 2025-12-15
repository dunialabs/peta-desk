'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShieldAlert, Info, AlertTriangle } from 'lucide-react'
import Header from '@/components/common/header'
import { useLock } from '@/contexts/lock-context'
import { ServerConfig } from '@/contexts/socket-context'
import { useConfirmDialogStore, type ConfirmRequest } from '@/store/confirm-dialog-store'

// MCP server format read from localStorage
interface StoredMCPServer {
  id: string
  serverName: string
  serverUrl: string
  token: string // Encrypted token
}

function UnlockPasswordContent() {
  const router = useRouter()
  const { unlockApp } = useLock()
  const { request: confirmRequest, confirm: confirmDialog, cancel: cancelDialog, closeSilently } = useConfirmDialogStore()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [returnUrl, setReturnUrl] = useState('/dashboard')
  const [purpose, setPurpose] = useState('unlock')

  // Read URL params from browser to avoid SSR hydration issues
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setReturnUrl(params.get('returnUrl') || '/dashboard')
      setPurpose(params.get('purpose') || 'unlock')
    }
  }, [])

  // Parse tool parameters for display
  let parsedParams: any = null
  if (confirmRequest?.toolParams) {
    try {
      if (confirmRequest.toolParams.trim()) {
        parsedParams = JSON.parse(confirmRequest.toolParams)
      }
    } catch (error) {
      parsedParams = confirmRequest.toolParams
    }
  }

  const handleUnlock = async () => {
    if (!password) {
      setError('Please enter your master password')
      return
    }

    setIsUnlocking(true)
    setError('')

    try {
      // Validate password
      if (window.electron?.password) {
        const result = await window.electron.password.verify(password)
        if (!result.success) {
          setError('Incorrect master password. Please try again.')
          setIsUnlocking(false)
          return
        }
      } else {
        setError('Password manager not available.')
        setIsUnlocking(false)
        return
      }

      // add-server scenario (from mcp-setup)
      if (purpose === 'add-server') {
        console.log('➕ Add server purpose detected, verifying password...')

        // Store password in session for mcp-setup to use
        sessionStorage.setItem('unlocked-password', password)
        sessionStorage.setItem('unlock-success', 'true')
        router.push(returnUrl)
      }
      // delete-server scenario (from server-management)
      else if (purpose === 'delete-server') {
        console.log('🗑️ Delete server purpose detected, verifying password...')

        // Store password verification result in session for server-management to use
        sessionStorage.setItem('unlock-success', 'true')
        router.push(returnUrl)
      }
      // single-reconnect scenario (from dashboard sync button)
      else if (purpose === 'single-reconnect') {
        console.log(
          '🔄 Single reconnect purpose detected, processing in unlock-password page...'
        )

        try {
          // Get pending single reconnect data
          const serverDataStr = localStorage.getItem('pending-single-reconnect')

          if (serverDataStr) {
            const serverData = JSON.parse(serverDataStr)
            console.log('📋 Found server to reconnect:', serverData)

            // Decrypt token
            if (serverData.token && window.electron?.crypto) {
              const decryptResult = await window.electron.crypto.decryptToken(
                serverData.token,
                password
              )
              if (decryptResult.success) {
                console.log(
                  `✅ Token decrypted for server: ${serverData.serverName}`
                )

                // Import useSocket to get connectToServer
                const { connectToServer } = await import(
                  '@/contexts/socket-context'
                ).then((mod) => ({
                  connectToServer: (window as any).__socketContext
                    ?.connectToServer
                }))

                // Store decrypted password in session for dashboard to use
                sessionStorage.setItem('unlocked-password', password)

                // Navigate back to dashboard with success flag
                sessionStorage.setItem(
                  'single-reconnect-data',
                  JSON.stringify({
                    serverId: serverData.serverId,
                    serverName: serverData.serverName,
                    serverUrl: serverData.serverUrl,
                    token: decryptResult.token
                  })
                )

                // Clean up
                localStorage.removeItem('pending-single-reconnect')

                // Navigate to dashboard
                router.push(returnUrl)
              } else {
                console.error('❌ Failed to decrypt token')
                setError('Failed to decrypt token')
                setIsUnlocking(false)
              }
            } else {
              setError('Server token not available')
              setIsUnlocking(false)
            }
          } else {
            setError('No pending reconnect data found')
            setIsUnlocking(false)
          }
        } catch (error) {
          console.error('Failed to process single reconnect:', error)
          setError('Failed to reconnect server')
          setIsUnlocking(false)
        }
      }
      // reconnect scenario (from ReconnectPasswordHandler after app restart)
      else if (purpose === 'reconnect') {
        console.log(
          '🔄 Multi-server reconnect purpose detected, processing in unlock-password page...'
        )

        try {
          // Unlock app if needed
          const wasLockedBeforeRestart =
            localStorage.getItem('app-locked-state') === 'true'
          const requirePasswordOnStartup =
            localStorage.getItem('require-password-on-startup') === 'true'
          if (wasLockedBeforeRestart || requirePasswordOnStartup) {
            console.log('🔓 Also unlocking the application...')
            await unlockApp(password)
          }

          // Get pending reconnect data
          const serversStr = localStorage.getItem('pending-reconnect-servers')
          const callbacks = (window as any).__reconnectCallbacks

          if (serversStr && callbacks?.onDecrypted) {
            const servers = JSON.parse(serversStr) as StoredMCPServer[]
            console.log('📋 Found servers to reconnect:', servers)

            // Decrypt tokens
            const decryptedServers: ServerConfig[] = []
            for (const server of servers) {
              if (server.token && window.electron?.crypto) {
                const decryptResult = await window.electron.crypto.decryptToken(
                  server.token,
                  password
                )
                if (decryptResult.success) {
                  decryptedServers.push({
                    id: server.id,
                    name: server.serverName,
                    url: server.serverUrl,
                    token: decryptResult.token
                  })
                  console.log(
                    `✅ Token decrypted for server: ${server.serverName}`
                  )
                }
              }
            }

            // Connect to servers
            if (decryptedServers.length > 0) {
              console.log(
                `🔌 Connecting to ${decryptedServers.length} server(s)...`
              )
              await callbacks.onDecrypted(decryptedServers)
              console.log('✅ All connections complete')
            }

            // Clean up
            localStorage.removeItem('pending-reconnect-servers')
            localStorage.removeItem('pending-reconnect-callback')
            delete (window as any).__reconnectCallbacks
          }

          // Navigate to dashboard
          router.push(returnUrl)
        } catch (error) {
          console.error('Failed to reconnect:', error)
          setError('Failed to reconnect servers')
          setIsUnlocking(false)
        }
      } else if (purpose === 'authorize' && confirmRequest) {
        // Authorization flow: perform the confirmation after password verification
        console.log('✅ Password verified, authorizing request...')
        confirmDialog()
        closeSilently() // Close dialog store silently
        router.push(returnUrl)
      } else {
        // Other flows: set sessionStorage and return to the previous page
        sessionStorage.setItem('unlocked-password', password)
        sessionStorage.setItem('unlock-success', 'true')
        router.push(returnUrl)
      }
    } catch (error) {
      console.error('Failed to unlock:', error)
      setError('An unexpected error occurred')
      setIsUnlocking(false)
    }
  }

  const handleClose = () => {
    // Cancel authorization when in the authorize flow
    if (purpose === 'authorize' && confirmRequest) {
      cancelDialog()
      closeSilently()
    }
    // Cancel action and mark as cancelled
    sessionStorage.setItem('unlock-success', 'false')
    router.push(returnUrl)
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isUnlocking) {
      handleUnlock()
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showSettingsButton={true} />

      <div className="max-w-md mx-auto mt-[100px] w-full flex-1 flex flex-col px-4">
        <div className="w-full flex-1">
          {/* Title */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              {purpose === 'authorize' && confirmRequest ? (
                <div className="p-2 rounded-full bg-yellow-100">
                  <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              ) : null}
              <h1 className="text-[30px] font-bold text-[#0A0A0A] dark:text-gray-100">
                {purpose === 'authorize' && confirmRequest
                  ? 'Authorization Required'
                  : 'Master Password Required'}
              </h1>
            </div>
            <p className="text-[14px] text-[#8E8E93] dark:text-gray-400 leading-[20px]">
              {purpose === 'authorize' && confirmRequest
                ? 'Enter your master password to authorize this action'
                : 'Enter your master password to unlock your encrypted data'}
            </p>
          </div>

          {/* Authorization Details - only show when purpose is authorize */}
          {purpose === 'authorize' && confirmRequest && (
            <div className="mb-6 space-y-4">
              {/* Server and Source Information */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Server:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {confirmRequest.serverName}
                  </span>
                </div>
                {confirmRequest.userAgent && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Source:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {confirmRequest.userAgent}
                    </span>
                  </div>
                )}
              </div>

              {/* Tool Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      {confirmRequest.toolName}
                    </div>
                    {confirmRequest.toolDescription && (
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        {confirmRequest.toolDescription}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tool Parameters - only show if params exist */}
              {parsedParams && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">Parameters</div>
                      <div className="text-sm text-yellow-800 font-mono">
                        {typeof parsedParams === 'object' ? (
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(parsedParams, null, 2)}
                          </pre>
                        ) : (
                          parsedParams
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Password Input */}
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
                onKeyDown={handleKeyDown}
                placeholder="Enter master password"
                autoFocus
                disabled={isUnlocking}
                className="w-full h-[48px] px-[16px] pr-[48px] text-[16px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#26251E] dark:focus:ring-white focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[16px] top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200"
                disabled={isUnlocking}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {error && <p className="text-[14px] text-red-500 dark:text-red-400 mt-2">{error}</p>}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-4 pb-6 sticky bottom-0 pt-4">
          {/* Only show Close button if not reconnect purpose (app restart) */}
          {purpose !== 'reconnect' && purpose !== 'single-reconnect' && purpose !== 'delete-server' && (
            <button
              onClick={handleClose}
              disabled={isUnlocking}
              className="flex-1 h-[48px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-[#0A0A0A] dark:text-gray-100 text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Close
            </button>
          )}
          <button
            onClick={handleUnlock}
            disabled={isUnlocking || !password}
            className={`${purpose === 'reconnect' || purpose === 'single-reconnect' || purpose === 'delete-server' ? 'w-full' : 'flex-1'} h-[48px] rounded-[12px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isUnlocking ? 'Unlocking...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UnlockPasswordPage() {
  return <UnlockPasswordContent />
}
