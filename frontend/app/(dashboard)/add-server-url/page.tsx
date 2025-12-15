'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/common/header'
import { PasswordDialog } from '@/components/common/password-dialog'
import { useSocket } from '@/contexts/socket-context'

function AddServerUrlContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serverId = searchParams.get('serverId')
  const { connections } = useSocket()

  const [showWarning, setShowWarning] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const [copyButtonText, setCopyButtonText] = useState('Copy')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [isTokenEncrypted, setIsTokenEncrypted] = useState(false)

  useEffect(() => {
    // Get server connection info
    if (serverId) {
      // First try to get from active connection
      const conn = connections.get(serverId)

      if (conn?.token) {
        // Server is connected, use decrypted token
        generateUrl(serverId, conn.token)
        setIsTokenEncrypted(false)
      } else {
        // Server not connected, token is encrypted
        const mcpServers = JSON.parse(
          localStorage.getItem('mcpServers') || '[]'
        )
        const server = mcpServers.find((s: any) => s.id === serverId)

        if (server && server.serverUrl) {
          generateUrl(serverId, '********************')
          setIsTokenEncrypted(true)
        } else {
          console.error('Server not found or missing serverUrl:', serverId)
          setServerUrl('Server not found')
        }
      }
    }
  }, [serverId, connections])

  const generateUrl = (serverId: string, token: string) => {
    const mcpServers = JSON.parse(
      localStorage.getItem('mcpServers') || '[]'
    )
    const server = mcpServers.find((s: any) => s.id === serverId)

    if (!server) return

    // Remove trailing slash to avoid double slashes
    const url = server.serverUrl.replace(/\/$/, '')

    // Check if serverUrl starts with IP address
    if (url.match(/^https?:\/\/\d+\.\d+\.\d+\.\d+/)) {
      setShowWarning(true)
      // Still add token even for IP addresses
      setServerUrl(`${url}/mcp?token=${token}`)
    } else {
      setShowWarning(false)
      // Generate URL with token
      setServerUrl(`${url}/mcp?token=${token}`)
    }
  }

  const handleCopy = async () => {
    // If token is encrypted, show password dialog
    if (isTokenEncrypted) {
      setShowPasswordDialog(true)
      return
    }

    // Token is already decrypted, copy directly
    try {
      await navigator.clipboard.writeText(serverUrl)
      setCopyButtonText('Copied!')
      setTimeout(() => {
        setCopyButtonText('Copy')
      }, 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!serverId) return

    try {
      // Get encrypted token from localStorage
      const mcpServers = JSON.parse(
        localStorage.getItem('mcpServers') || '[]'
      )
      const server = mcpServers.find((s: any) => s.id === serverId)

      if (!server || !server.token) {
        alert('Server or token not found')
        setShowPasswordDialog(false)
        return
      }

      // Decrypt token
      if (!window.electron?.crypto) {
        alert('Crypto API not available')
        setShowPasswordDialog(false)
        return
      }

      const decryptResult = await window.electron.crypto.decryptToken(
        server.token,
        password
      )

      if (!decryptResult.success || !decryptResult.token) {
        alert('Failed to decrypt token. Incorrect password?')
        return // Keep dialog open for retry
      }

      console.log('✅ Token decrypted successfully')

      // Regenerate URL with decrypted token
      generateUrl(serverId, decryptResult.token)
      setIsTokenEncrypted(false)

      // Close dialog
      setShowPasswordDialog(false)

      // Auto copy after decrypt
      setTimeout(async () => {
        try {
          const url = `${server.serverUrl}/mcp?token=${decryptResult.token}`
          await navigator.clipboard.writeText(url)
          setCopyButtonText('Copied!')
          setTimeout(() => {
            setCopyButtonText('Copy')
          }, 2000)
        } catch (error) {
          console.error('Failed to copy:', error)
        }
      }, 100)
    } catch (error) {
      console.error('Error decrypting token:', error)
      alert('Failed to decrypt token')
    }
  }

  const handleClose = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] dark:bg-gray-900">
      <Header showSettingsButton={true} />

      <div className="max-w-2xl mx-auto mt-[100px] w-full flex-1 flex flex-col px-4">
        <div className="w-full flex-1">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-[30px] font-bold text-[#0A0A0A] dark:text-gray-100 mb-[4px]">
              Add MCP Server With URL
            </h1>
            <p className="text-[14px] text-[#8E8E93] dark:text-gray-400 leading-[20px]">
              Copy the url configuration below to your MCP client configuration
              file to connect to Peta Desk service.
            </p>
          </div>

          {/* URL Display */}
          <div className="bg-[#F5F5F5] dark:bg-gray-800 rounded-[12px] border border-[#D1D1D6] dark:border-gray-700 p-4 mb-4 relative">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-[8px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[13px] font-medium transition-colors flex items-center gap-1.5 z-10"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="5"
                  y="5"
                  width="9"
                  height="9"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M3 11V3C3 2.44772 3.44772 2 4 2H10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              {copyButtonText}
            </button>
            <div className="font-mono text-[13px] text-[#0A0A0A] dark:text-gray-100 break-all leading-[20px] pr-20">
              {serverUrl || 'Loading...'}
            </div>
            {/* Prevent manual copy when token is encrypted */}
            {isTokenEncrypted && (
              <div className="absolute inset-0 bg-transparent cursor-not-allowed" style={{ userSelect: 'none' }} />
            )}
          </div>

          {/* Warning Message (conditional) */}
          {showWarning && (
            <div className="bg-[#E8F4FD] dark:bg-blue-900/20 rounded-[12px] border border-[#B3D9F2] dark:border-blue-800 p-4 mb-6">
              <p className="text-[13px] text-[#0066CC] dark:text-blue-300 leading-[18px]">
                Some clients (such as Claude Desktop) do not support IP address
                connections. Please go to the Network Access feature of Peta
                Console to turn on domain name access.
              </p>
            </div>
          )}

          {/* Encrypted Token Warning */}
          {isTokenEncrypted && (
            <div className="bg-[#FFF4E5] dark:bg-yellow-900/20 rounded-[12px] border border-[#FFD699] dark:border-yellow-800 p-4 mb-6">
              <p className="text-[13px] text-[#8B5A00] dark:text-yellow-300 leading-[18px]">
                ⚠️ The access token is encrypted. Click the Copy button to decrypt it with your master password before copying.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-4 pb-6 sticky bottom-0 bg-[#F5F5F5] dark:bg-gray-900 pt-4">
          <button
            onClick={handleClose}
            className="w-full h-[48px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-[#0A0A0A] dark:text-gray-100 text-[14px] font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Password Dialog */}
      <PasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onSubmit={handlePasswordSubmit}
        title="Decrypt Server URL"
        description="Enter your master password to decrypt the access token and copy the complete URL."
        buttonText="Decrypt & Copy"
      />
    </div>
  )
}

export default function AddServerUrlPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <AddServerUrlContent />
    </Suspense>
  )
}
