'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Header from '@/components/common/header'
import { useSocket } from '@/contexts/socket-context'
import { Loader2 } from 'lucide-react'

export default function RestartClientPage() {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [latestServerId, setLatestServerId] = useState<string>('')
  const [isWaiting, setIsWaiting] = useState(false)
  const [waitingStatus, setWaitingStatus] = useState<string>('')
  const [isConnected, setIsConnected] = useState(false)
  const [hasReceivedCapabilities, setHasReceivedCapabilities] = useState(false)

  const router = useRouter()
  const { connections, getCapabilities } = useSocket()

  // Get user-selected clients and latest server ID
  useEffect(() => {
    try {
      // Get the ID of the most recently added server
      const mcpServersData = localStorage.getItem('mcpServers')
      if (mcpServersData) {
        const servers = JSON.parse(mcpServersData)
        if (servers.length > 0) {
          // Get the latest server (last one)
          const latestServer = servers[servers.length - 1]
          setLatestServerId(latestServer.id)

          const selectedClientsKey = `selectedClients_${latestServer.id}`
          const savedSelectedClients = localStorage.getItem(selectedClientsKey)

          if (savedSelectedClients) {
            const clients = JSON.parse(savedSelectedClients)
            setSelectedClients(clients)
            console.log('📱 Selected clients for restart:', clients)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load selected clients:', error)
    }
  }, [])

  // Monitor Socket connection status
  useEffect(() => {
    if (!latestServerId) return

    const conn = connections.get(latestServerId)
    if (conn && conn.isConnected) {
      console.log('✅ Socket connected to latest server')
      setIsConnected(true)
    } else {
      setIsConnected(false)
    }
  }, [connections, latestServerId])

  // After connection succeeds, try to get capabilities
  useEffect(() => {
    if (!isConnected || !latestServerId || hasReceivedCapabilities || isWaiting) return

    const checkCapabilities = async () => {
      console.log('🔍 Checking if capabilities are available...')
      const result = await getCapabilities(latestServerId)

      if (result.success && result.capabilities && Object.keys(result.capabilities).length > 0) {
        console.log('✅ Capabilities received from core')
        setHasReceivedCapabilities(true)
      } else {
        console.log('⏳ Capabilities not yet available, will retry...')
      }
    }

    // Check after 1 second delay, give core some time to send notification
    const timer = setTimeout(checkCapabilities, 1000)
    return () => clearTimeout(timer)
  }, [isConnected, latestServerId, hasReceivedCapabilities, isWaiting, getCapabilities])

  // Listen for capabilities change notifications
  useEffect(() => {
    const handleCapabilitiesChanged = (event: CustomEvent) => {
      const { serverId } = event.detail
      console.log('🔔 Capabilities changed notification received for:', serverId)

      if (serverId === latestServerId) {
        console.log('✅ Capabilities received for latest server')
        setHasReceivedCapabilities(true)
      }
    }

    window.addEventListener('capabilities-changed', handleCapabilitiesChanged as any)

    return () => {
      window.removeEventListener('capabilities-changed', handleCapabilitiesChanged as any)
    }
  }, [latestServerId])

  const handleContinue = async () => {
    if (!isConnected) {
      setWaitingStatus('Waiting for Socket connection...')
      setIsWaiting(true)
      // Wait for connection
      const checkInterval = setInterval(() => {
        const conn = connections.get(latestServerId)
        if (conn && conn.isConnected) {
          clearInterval(checkInterval)
          setWaitingStatus('Connected! Waiting for server information...')
          checkAndContinue()
        }
      }, 500)

      // 30 second timeout
      setTimeout(() => {
        clearInterval(checkInterval)
        if (!isConnected) {
          setWaitingStatus('Connection timeout. Please check your server.')
          setIsWaiting(false)
        }
      }, 30000)

      return
    }

    if (!hasReceivedCapabilities) {
      setWaitingStatus('Waiting for server information...')
      setIsWaiting(true)
      checkAndContinue()
      return
    }

    // All conditions met, navigate directly
    router.push('/dashboard')
  }

  const checkAndContinue = async () => {
    // Poll for capabilities
    const maxAttempts = 20 // Maximum 20 times, 1 second each, total 20 seconds
    let attempts = 0

    const checkInterval = setInterval(async () => {
      attempts++

      const result = await getCapabilities(latestServerId)

      if (result.success && result.capabilities && Object.keys(result.capabilities).length > 0) {
        clearInterval(checkInterval)
        console.log('✅ Server information received, redirecting to dashboard...')
        setHasReceivedCapabilities(true)
        setIsWaiting(false)
        router.push('/dashboard')
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        setWaitingStatus('Timeout waiting for server information. You can try again later.')
        setIsWaiting(false)
      }
    }, 1000)
  }

  return (
    <div className="h-screen bg-[rgba(255, 255, 0.70)] flex flex-col">
      <Header showLockButton={false} />
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-[388px]">
          {/* Client Icons - Dynamic based on selected clients */}
          <div className="flex justify-center space-x-4 mb-[14px]">
            {selectedClients.length > 0 ? (
              selectedClients.map((clientKey) => {
                // Map client keys to display styles
                const appStyles: Record<
                  string,
                  { bg: string; icon: string; name: string }
                > = {
                  claude: { bg: 'bg-[#FF6B35]', icon: '✱', name: 'Claude' },
                  cursor: { bg: 'bg-black', icon: '⟷', name: 'Cursor' },
                  vscode: { bg: 'bg-blue-600', icon: '{ }', name: 'VS Code' },
                  windsurf: { bg: 'bg-teal-600', icon: '〜', name: 'Windsurf' }
                }
                const style = appStyles[clientKey] || {
                  bg: 'bg-gray-600',
                  icon: '?',
                  name: 'Unknown'
                }

                return (
                  <div
                    key={clientKey}
                    className={`w-16 h-16 ${style.bg} rounded-2xl flex items-center justify-center transition-all`}
                    title={style.name}
                  >
                    <div className="text-white text-2xl">{style.icon}</div>
                  </div>
                )
              })
            ) : (
              // Fallback to default icons if no selected clients found
              <>
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center transition-all">
                  <div className="text-white text-2xl">✱</div>
                </div>
                <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center transition-all">
                  <div className="text-white text-2xl">⟷</div>
                </div>
              </>
            )}
          </div>

          <div className="text-center mb-[24px]">
            <h2 className="text-[30px] text-[#0F172A] font-bold">
              Connecting to Server
            </h2>
            <div className="text-[#64748B] text-[14px] leading-relaxed">
              <p>
                <strong>Server configured successfully!</strong>
              </p>
              <p>
                Establishing socket connection to your server. Once connected, you'll be able to manage your MCP clients
                {selectedClients.length > 0 && (
                  <> (
                    {selectedClients
                        .map((client) => {
                          const names: Record<string, string> = {
                            claude: 'Claude Desktop',
                            cursor: 'Cursor',
                            vscode: 'VS Code',
                            windsurf: 'Windsurf'
                          }
                          return names[client] || client
                        })
                        .join(', ')
                    })
                  </>
                )} from the dashboard.
              </p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {isConnected ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-green-600 dark:text-green-400">Socket Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-gray-500 dark:text-gray-400">Waiting for connection...</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {hasReceivedCapabilities ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-green-600 dark:text-green-400">Server Information Received</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <span className="text-gray-500 dark:text-gray-400">Waiting for server information...</span>
                </>
              )}
            </div>
          </div>

          {/* Waiting status message */}
          {isWaiting && waitingStatus && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-blue-700 dark:text-blue-300">{waitingStatus}</span>
            </div>
          )}

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={isWaiting}
            className="w-full h-[22px] rounded-[5px] font-medium transition-all bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isWaiting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Please wait...
              </span>
            ) : isConnected && hasReceivedCapabilities ? (
              'Continue to Dashboard'
            ) : (
              'Continue (will wait for ready)'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
