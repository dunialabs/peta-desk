'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/common/header'
import { Loader2, X, CheckCircle } from 'lucide-react'
import { useSocket } from '@/contexts/socket-context'

function ConfigToClientContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serverId = searchParams.get('serverId')
  const appName = searchParams.get('appName')
  const { connections } = useSocket()

  const [status, setStatus] = useState<'configuring' | 'success' | 'failed'>(
    'configuring'
  )
  const [errorMessage, setErrorMessage] = useState('')

  const appLabels: Record<string, string> = {
    claude: 'Claude',
    cursor: 'Cursor',
    vscode: 'VS Code',
    windsurf: 'Windsurf',
    antigravity: 'Antigravity'
  }

  // Check if we have a decrypted password from unlock page
  useEffect(() => {
    const unlockSuccess = sessionStorage.getItem('unlock-success')
    if (unlockSuccess === 'true') {
      // Clear the flag
      sessionStorage.removeItem('unlock-success')
      // Password is available in sessionStorage, continue with config
    } else if (unlockSuccess === 'false') {
      // User cancelled unlock
      sessionStorage.removeItem('unlock-success')
      setStatus('failed')
      setErrorMessage('Password unlock cancelled')
    }
  }, [])

  useEffect(() => {
    if (!serverId || !appName) {
      setStatus('failed')
      setErrorMessage('Missing server ID or app name')
      return
    }

    const performConfig = async () => {
      try {
        // First check if already configured
        const mcpServersCheck = JSON.parse(
          localStorage.getItem('mcpServers') || '[]'
        )
        const serverCheck = mcpServersCheck.find((s: any) => s.id === serverId)

        if (serverCheck?.configuredApps?.includes(appName)) {
          console.log(`✅ Server already configured for ${appName}, showing success state`)
          setStatus('success')
          return
        }

        // Wait 2 seconds to simulate configuration
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Get server info from localStorage
        const mcpServers = JSON.parse(
          localStorage.getItem('mcpServers') || '[]'
        )
        const server = mcpServers.find((s: any) => s.id === serverId)

        if (!server) {
          setStatus('failed')
          setErrorMessage('Server not found')
          return
        }

        const serverName = server.serverName || 'peta-mcp-desk'
        let url = server.serverUrl
        let token = server.token

        // Ensure URL ends with /mcp
        if (!url.endsWith('/mcp')) {
          url = url.replace(/\/$/, '') + '/mcp'
        }

        // Check if server is connected (token already decrypted)
        const conn = connections.get(serverId)
        const isTokenEncrypted = !conn?.token

        if (isTokenEncrypted) {
          // Token is encrypted, need to decrypt
          // Try to get password from sessionStorage (from unlock-password page)
          const unlockedPassword = sessionStorage.getItem('unlocked-password')

          if (!unlockedPassword) {
            // No password available, redirect to unlock page
            const currentUrl = `/config-to-client?serverId=${serverId}&appName=${appName}`
            router.push(`/unlock-password?returnUrl=${encodeURIComponent(currentUrl)}&purpose=decrypt`)
            return
          }

          // Decrypt token using the password
          if (!window.electron?.crypto) {
            setStatus('failed')
            setErrorMessage('Crypto API not available')
            return
          }

          const decryptResult = await window.electron.crypto.decryptToken(
            token,
            unlockedPassword
          )

          if (!decryptResult.success || !decryptResult.token) {
            setStatus('failed')
            setErrorMessage('Failed to decrypt token. Incorrect password?')
            // Clear the stored password
            sessionStorage.removeItem('unlocked-password')
            return
          }

          // Use decrypted token
          token = decryptResult.token
          // Clear the password from sessionStorage for security
          sessionStorage.removeItem('unlocked-password')
        } else {
          // Server is connected, use the already decrypted token from connection
          token = conn.token
        }

        // Build MCP server configuration
        const mcpServerConfig: any = {
          type: 'http'
        }

        // Antigravity uses 'serverUrl', others use 'url'
        if (appName === 'antigravity') {
          mcpServerConfig.serverUrl = url
        } else {
          mcpServerConfig.url = url
        }

        if (token && token.trim() !== '') {
          mcpServerConfig.headers = {
            Authorization: `Bearer ${token}`
          }
        }

        // Write configuration using Electron API
        if (!window.electron?.mcpConfig) {
          setStatus('failed')
          setErrorMessage('MCP Config API not available')
          return
        }

        const result = await window.electron.mcpConfig.addServer(
          appName,
          serverName,
          mcpServerConfig
        )

        if (result && result.success) {
          // Update localStorage to track configured apps
          const updatedServers = mcpServers.map((s: any) => {
            if (s.id === serverId) {
              const configuredApps = s.configuredApps || []
              if (!configuredApps.includes(appName)) {
                configuredApps.push(appName)
              }
              return { ...s, configuredApps }
            }
            return s
          })
          localStorage.setItem('mcpServers', JSON.stringify(updatedServers))

          setStatus('success')
        } else {
          setStatus('failed')
          setErrorMessage(result?.error || 'Configuration failed')
        }
      } catch (error) {
        console.error('Config error:', error)
        setStatus('failed')
        setErrorMessage(
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }

    performConfig()
  }, [serverId, appName])

  const handleClose = () => {
    router.push('/dashboard')
  }

  const handleRetry = () => {
    setStatus('configuring')
    setErrorMessage('')
    // Reload page to retry
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showSettingsButton={true} />

      <div className="max-w-md mx-auto mt-[100px] w-full flex-1 flex flex-col px-4">
        <div className="w-full flex-1">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-[30px] font-bold text-[#0A0A0A] mb-[4px]">
              Config To {appLabels[appName || ''] || appName}
            </h1>
            <p className="text-[14px] text-[#8E8E93] leading-[20px]">
              The configuration will be automatically written to the{' '}
              {appLabels[appName || ''] || appName} configuration file.
            </p>
          </div>

          {/* Status Display */}
          <div className="space-y-4">
            {/* Configuring State */}
            {status === 'configuring' && (
              <div className="bg-[#E8F4FD] rounded-[12px] border border-[#B3D9F2] p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#0066CC] animate-spin" />
                <p className="text-[13px] text-[#0066CC] leading-[18px]">
                  Writing to the {appLabels[appName || ''] || appName}{' '}
                  configuration file
                </p>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <div className="bg-[#E8F5E9] rounded-[12px] border border-[#A5D6A7] p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-[#2E7D32]" />
                <p className="text-[13px] text-[#2E7D32] leading-[18px]">
                  Configuration completed successfully!
                </p>
              </div>
            )}

            {/* Failed State */}
            {status === 'failed' && (
              <div className="bg-[#FFEBEE] rounded-[12px] border border-[#EF9A9A] p-4 flex items-center gap-3">
                <X className="w-5 h-5 text-[#C62828]" />
                <div>
                  <p className="text-[13px] text-[#C62828] font-semibold leading-[18px]">
                    Config Failed
                  </p>
                  {errorMessage && (
                    <p className="text-[12px] text-[#C62828] leading-[16px] mt-1">
                      {errorMessage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-4 sticky bottom-0 p-[16px]">
          <button
            onClick={handleClose}
            className="flex-1 h-[48px] border border-[#D1D1D6] rounded-[12px] bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 text-[#0A0A0A] text-[14px] font-medium transition-colors"
          >
            Close
          </button>
          {status === 'failed' && (
            <button
              onClick={handleRetry}
              className="flex-1 h-[48px] rounded-[12px] bg-[#26251E] hover:bg-[#3A3933] text-white text-[14px] font-medium transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ConfigToClientPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <ConfigToClientContent />
    </Suspense>
  )
}
