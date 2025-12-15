'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { useSocket } from '@/contexts/socket-context'
import Header from '@/components/common/header'
import { useUnlock } from '@/contexts/unlock-context'

// ========================================
// Types and Constants (inlined, previously from shared module)
// ========================================

/**
 * Client type enumeration
 */
enum ClientType {
  CLAUDE = 'claude',
  CURSOR = 'cursor',
  VSCODE = 'vscode',
  OTHER = 'other',
  INTERNAL = 'internal' // Internal server type
}

/**
 * Server permissions configuration
 */
interface ServerPermissions {
  tools: Record<
    string,
    { enabled: boolean; description?: string; serverName: string }
  >
  resources: Record<
    string,
    { enabled: boolean; description?: string; serverName: string }
  >
  prompts: Record<
    string,
    { enabled: boolean; description?: string; serverName: string }
  >
}

/**
 * Server configuration
 */
interface ServerConfig extends ServerPermissions {
  id: string
  uuid?: string // New UUID field for communication and operations
  serverName: string
  serverUrl: string
  token: string
  clientType: ClientType
  enabled: boolean // Default is true
  reason?: string // Reason for status change (optional)
}

interface MCPServer extends ServerConfig {
  configId?: string // PETA proxy configuration ID (optional, for backwards compatibility)
  configIds?: Record<string, string> // ConfigId mapping for each client platform (clientKey -> configId)
  createdAt: string
}

// UUID generator utility
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: generate a simple UUID format
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default function ServerManagementPage() {
  const router = useRouter()
  const [servers, setServers] = useState<MCPServer[]>([])
  const { disconnectFromServer } = useSocket()
  const { showUnlock } = useUnlock()

  // Update dashboard cache when servers change
  const updateDashboardCacheAfterServerChange = () => {
    try {
      // Clear dashboard cache to force reload next visit
      localStorage.removeItem('dashboardData')
      console.log('Dashboard cache cleared after server change')

      // Optional: trigger dashboard data refresh immediately
      if (
        typeof window !== 'undefined' &&
        window.electron?.proxy?.getDashboardData
      ) {
        window.electron.proxy
          .getDashboardData()
          .then((result) => {
            if (result.success && result.data) {
              // Update cache
              localStorage.setItem(
                'dashboardData',
                JSON.stringify({
                  clients: result.data.clients,
                  proxyStates: result.proxyStates,
                  lastUpdated: Date.now()
                })
              )
              console.log('Dashboard cache refreshed after server change')
            }
          })
          .catch((error) => {
            console.error('Failed to refresh dashboard cache:', error)
          })
      }
    } catch (error) {
      console.error(
        'Failed to update dashboard cache after server change:',
        error
      )
    }
  }

  useEffect(() => {
    // Load actual server data from localStorage
    const storedServers = localStorage.getItem('mcpServers')
    if (storedServers) {
      try {
        const parsedServers: MCPServer[] = JSON.parse(storedServers)

        // Generate and persist UUIDs for servers missing one
        let needsUpdate = false
        const updatedServers = parsedServers.map((server) => {
          if (!server.uuid) {
            needsUpdate = true
            return { ...server, uuid: generateUUID() }
          }
          return server
        })

        if (needsUpdate) {
          localStorage.setItem('mcpServers', JSON.stringify(updatedServers))
          setServers(updatedServers)
        } else {
          setServers(parsedServers)
        }
      } catch (error) {
        console.error('Failed to parse mcpServers:', error)
        setServers([])
      }
    } else {
      setServers([])
    }
  }, [])


  const handleAdd = () => {
    // Navigate to mcp-setup to add a server
    router.push('/mcp-setup?mode=add')
  }

  const handleEdit = (server: MCPServer) => {
    // Save server info to edit into localStorage
    localStorage.setItem('editingServer', JSON.stringify(server))
    // Navigate to mcp-setup to edit
    router.push(`/mcp-setup?mode=edit&id=${server.id}`)
  }

  const handleDeleteClick = (server: MCPServer) => {
    showUnlock('delete-server', async () => {
      await performServerDeletion(server)
    })
  }

  const performServerDeletion = async (serverToDelete: MCPServer) => {
    if (serverToDelete) {
      try {
        // 0. FIRST: Disconnect Socket.IO connection
        console.log(
          `🔌 Disconnecting socket connection for ${serverToDelete.serverName}`
        )
        disconnectFromServer(serverToDelete.id)

        // 1. Stop all related proxy processes (handle multiple configIds)
        if (window.electron?.proxy) {
          // If configIds map exists, stop proxy processes on all platforms
          if (
            serverToDelete.configIds &&
            typeof serverToDelete.configIds === 'object'
          ) {
            console.log('🛑 Stopping proxy processes for all platforms...')
            for (const [platform, configId] of Object.entries(
              serverToDelete.configIds
            )) {
              try {
                console.log(
                  `🛑 Stopping proxy for ${platform} (configId: ${configId})`
                )
                window.electron.proxy.control('stop', configId)
              } catch (error) {
                console.error(`Failed to stop proxy for ${platform}:`, error)
              }
            }
          } else if (serverToDelete.configId) {
            // Compat for a single legacy configId
            console.log(
              `🛑 Stopping proxy process (configId: ${serverToDelete.configId})`
            )
            window.electron.proxy.control('stop', serverToDelete.configId)
          }
        }

        // 2. Remove server from MCP config (Claude/Cursor)
        if (window.electron?.mcpConfig) {
          const result = await window.electron.mcpConfig.removeServer(
            serverToDelete.serverName
          )
          if (result.success) {
            console.log('Server removed from MCP configs:', result.results)
            // Optionally show success notification
            if (result.results) {
              const successfulApps = []
              const failedApps = []

              // Check all supported apps
              Object.entries(result.results).forEach(([app, success]) => {
                if (success) {
                  successfulApps.push(
                    app.charAt(0).toUpperCase() + app.slice(1)
                  )
                } else {
                  failedApps.push(app.charAt(0).toUpperCase() + app.slice(1))
                }
              })

              if (successfulApps.length > 0) {
                console.log(
                  `✅ Successfully removed from: ${successfulApps.join(', ')}`
                )
              }
              if (failedApps.length > 0) {
                console.log(
                  `⚠️ Not found or failed in: ${failedApps.join(', ')}`
                )
              }
            }
          } else {
            console.error(
              'Failed to remove server from MCP configs:',
              result.error
            )
          }
        }

        // 3. Clean related localStorage data
        const selectedClientsKey = `selectedClients_${serverToDelete.id}`
        localStorage.removeItem(selectedClientsKey)
        console.log(
          `🧹 Cleaned up selectedClients data for server ${serverToDelete.id}`
        )

        // 4. Remove server from the list (by UUID or ID)
        const updatedServers = servers.filter((s) => {
          if (serverToDelete.uuid) {
            return s.uuid !== serverToDelete.uuid
          }
          return s.id !== serverToDelete.id
        })
        setServers(updatedServers)
        localStorage.setItem('mcpServers', JSON.stringify(updatedServers))
        console.log(
          `✅ Server deleted successfully. Remaining servers: ${updatedServers.length}`
        )

        // Update tray icon based on remaining servers
        if (window.electron?.updateServersStatus) {
          window.electron.updateServersStatus(updatedServers.length > 0)
        }

        // Update dashboard cache after deletion
        updateDashboardCacheAfterServerChange()
      } catch (error) {
        console.error('Error deleting server:', error)
        throw error // Rethrow so sensitive action handler knows the failure
      }
    }
  }

  const handleClose = () => {
    router.push('/dashboard')
  }

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header showSettingsButton={true} />
      <div className="max-w-md mt-[14px] w-full flex-1 flex flex-col h-full justify-between">
        {/* Content area */}
        {/* Title */}
        <h1 className="text-[20px] leading-tight font-bold text-[#26251e] dark:text-gray-100 p-[16px]">
          Manage MCP Server
        </h1>
        <div className="space-y-[12px] p-[16px]">
          {servers.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No server configurations
            </div>
          ) : (
            servers.map((server) => (
              <div
                key={server.id}
                className="bg-white dark:bg-gray-900 h-[46px] rounded-[8px] border border-gray-200 dark:border-gray-700 px-[16px] py-[8px] flex items-center justify-between"
              >
                {/* Left: Icon and Server Name */}
                <div className="flex items-center gap-3">
                  <img
                    src="/images/serverIcon.png"
                    alt="server-icon"
                    className="w-[26px] h-[26px] flex-shrink-0"
                  />
                  <span className="text-[16px] font-semibold text-[#0A0A0A] dark:text-gray-100">
                    {server.serverName}
                  </span>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-[6px]">
                  {/* Delete Icon - gray by default, red on hover */}
                  <button
                    onClick={() => handleDeleteClick(server)}
                    className="p-[4px] hover:bg-red-50 dark:bg-red-900/20 rounded-[8px] transition-colors group"
                  >
                    <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-500 dark:text-red-400 transition-colors" />
                  </button>
                  {/* Config Button */}
                  <button
                    onClick={() => handleEdit(server)}
                    className="px-[12px] py-[4px] bg-white dark:bg-gray-900 border border-[#D1D1D6] dark:border-gray-700 rounded-[8px] text-[14px] font-medium text-[#0A0A0A] dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Config
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="mt-auto flex flex-row p-[16px] gap-[12px]">
          <button
            onClick={handleClose}
            className="flex-1 h-[40px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-[#26251e] dark:text-gray-100 text-[14px] font-[500] rounded-[8px] transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleAdd}
            className="flex-1 h-[40px] bg-[#26251e] dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-[14px] font-[500] rounded-[8px] transition-colors"
          >
            Add MCP Server
          </button>
        </div>
      </div>
    </div>
  )
}
