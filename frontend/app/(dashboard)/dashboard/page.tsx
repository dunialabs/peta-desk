'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import Header from '@/components/common/header'
import { useLock } from '@/contexts/lock-context'
import { useSocket } from '@/contexts/socket-context'
import {
  convertCapabilitiesToClients,
  convertClientsToCapabilities
} from '@/lib/capabilities-adapter'
import type {
  MCPClient,
  MCPFunction,
  MCPTool
} from '@/lib/capabilities-adapter'
import { toast } from 'sonner'
import { DisconnectIcon } from '@/components/icons/disconnect-icon'
import { LoadingSpinner } from '@/components/icons/loading-spinner'

const timeOptions = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: 'Never', value: -1 }
]

// DangerLevel enum matching peta-core
enum DangerLevel {
  Unconfigured = -1, // Unconfigured - No configuration for the tool
  Silent = 0, // Execute Silently - Function executes automatically without user notification
  Notification = 1, // Execute with Notification - Function executes automatically and displays result to user
  Approval = 2 // Require Manual Approval - User must manually approve before function execution
}

const dangerLevelOptions = [
  { label: 'Silent', value: DangerLevel.Silent },
  { label: 'Notification', value: DangerLevel.Notification },
  { label: 'Approval', value: DangerLevel.Approval }
]

function DashboardContent() {
  const router = useRouter()
  const { updateAutoLockTimer, autoLockTimer: globalAutoLockTimer } = useLock()
  const {
    getCapabilities,
    setCapabilities,
    getAllConnectedServers,
    connections,
    configureServer,
    unconfigureServer,
    connectToServer
  } = useSocket()

  // Store clients keyed by serverId
  const [serverClients, setServerClients] = useState<
    Record<string, MCPClient[]>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [autoLockTimer, setAutoLockTimer] = useState(globalAutoLockTimer)
  const [serverSwitches, setServerSwitches] = useState<Record<string, boolean>>(
    {}
  )
  const [googleDriveAuth, setGoogleDriveAuth] = useState<{
    authenticated: boolean
    userInfo?: any
  }>({ authenticated: false })
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authenticatingToolId, setAuthenticatingToolId] = useState<
    string | null
  >(null) // Track which tool is being authorized
  const [authStatus, setAuthStatus] = useState<
    Record<string, 'connecting' | 'failed' | null>
  >({}) // Track auth status per tool
  const [hoveredDisconnectBtn, setHoveredDisconnectBtn] = useState<
    string | null
  >(null)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [disconnectTargetServerId, setDisconnectTargetServerId] = useState<
    string | undefined
  >(undefined)
  const [configuredApps, setConfiguredApps] = useState<
    Record<string, string[]>
  >({}) // serverId -> [app names that are configured]
  const [reconnectingServers, setReconnectingServers] = useState<Set<string>>(
    new Set()
  ) // Track which servers are currently reconnecting

  // Check Google Drive authorization status
  const checkGoogleDriveAuth = useCallback(async () => {
    try {
      if (
        typeof window !== 'undefined' &&
        (window as any).electronAPI?.googleDrive
      ) {
        const result = await (
          window as any
        ).electronAPI.googleDrive.isAuthenticated()
        if (result.success && result.authenticated) {
          const userInfo = await (
            window as any
          ).electronAPI.googleDrive.getUserInfo()
          setGoogleDriveAuth({
            authenticated: true,
            userInfo: userInfo.success ? userInfo.data : undefined
          })
        } else {
          setGoogleDriveAuth({ authenticated: false })
        }
      }
    } catch (error) {
      console.error('Failed to check Google Drive auth:', error)
    }
  }, [])

  // Get all servers (including failed connections)
  const getAllServers = useCallback((): string[] => {
    // Get all server IDs from localStorage mcpServers
    if (typeof window === 'undefined') return []

    try {
      const mcpServers = JSON.parse(localStorage.getItem('mcpServers') || '[]')
      return mcpServers.map((s: any) => s.id)
    } catch (error) {
      console.error('Failed to parse mcpServers:', error)
      return []
    }
  }, [])

  // Load data for all servers
  const loadAllServersData = useCallback(async () => {
    const allServers = getAllServers()

    // Update tray icon based on servers status
    if (window.electron?.updateServersStatus) {
      window.electron.updateServersStatus(allServers.length > 0)
    }

    if (allServers.length === 0) {
      setIsLoading(false)
      setServerClients({})
      return
    }

    setIsLoading(true)
    try {
      const newServerClients: Record<string, MCPClient[]> = {}

      // Load capabilities for all servers in parallel
      await Promise.all(
        allServers.map(async (serverId) => {
          try {
            const result = await getCapabilities(serverId)

            if (result.success && result.capabilities) {
              // Read directly from connections context; no dependency needed
              const conn = connections.get(serverId)
              const serverName = conn?.serverName || 'Gateway Server'

              const clientsList = convertCapabilitiesToClients(
                result.capabilities,
                serverName
              )
              newServerClients[serverId] = clientsList
            } else {
              newServerClients[serverId] = []
            }
          } catch (error) {
            newServerClients[serverId] = []
          }
        })
      )

      setServerClients(newServerClients)
    } catch (error) {
      console.error('Failed to load capabilities:', error)
      toast.error('Failed to load capabilities')
      setServerClients({})
    } finally {
      setIsLoading(false)
    }
    // Removed connections dependency to avoid reloading on every change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllServers, getCapabilities])

  // Load configured apps from localStorage
  const loadConfiguredApps = useCallback(() => {
    try {
      const mcpServers = JSON.parse(localStorage.getItem('mcpServers') || '[]')
      const configured: Record<string, string[]> = {}

      for (const server of mcpServers) {
        if (server.configuredApps && Array.isArray(server.configuredApps)) {
          configured[server.id] = server.configuredApps
        } else {
          configured[server.id] = []
        }
      }

      setConfiguredApps(configured)
    } catch (error) {
      console.error('Failed to load configured apps:', error)
    }
  }, [])

  // Load data
  useEffect(() => {
    loadAllServersData()
    loadConfiguredApps()
  }, [loadAllServersData, loadConfiguredApps])

  // Check for single reconnect data after returning from unlock-password page
  useEffect(() => {
    const reconnectDataStr = sessionStorage.getItem('single-reconnect-data')
    if (reconnectDataStr) {
      console.log('🔄 Found single reconnect data, processing...')
      sessionStorage.removeItem('single-reconnect-data')

      const reconnectData = JSON.parse(reconnectDataStr)

      // Mark as reconnecting
      setReconnectingServers((prev) =>
        new Set(prev).add(reconnectData.serverId)
      )

      // Connect to server
      connectToServer({
        id: reconnectData.serverId,
        name: reconnectData.serverName,
        url: reconnectData.serverUrl,
        token: reconnectData.token
      })
        .then((result) => {
          console.log('🔌 Reconnect result:', result)
          if (result.success) {
            console.log('✅ Reconnected successfully')
            toast.success('Reconnected successfully')
            // Reload data
            loadAllServersData()
          } else {
            console.error('❌ Reconnection failed:', result.error)
            toast.error(`Reconnection failed: ${result.error}`)
          }
        })
        .catch((error) => {
          console.error('❌ Reconnect error:', error)
          toast.error('Reconnection failed')
        })
        .finally(() => {
          // Remove from reconnecting set
          setReconnectingServers((prev) => {
            const newSet = new Set(prev)
            newSet.delete(reconnectData.serverId)
            return newSet
          })
        })
    }
  }, [])

  // Handle reconnect for failed servers
  const handleReconnect = useCallback(
    async (serverId: string) => {
      // Mark as reconnecting
      setReconnectingServers((prev) => new Set(prev).add(serverId))

      try {
        console.log('🔄 Starting reconnect for server:', serverId)

        // Get server info from localStorage
        const mcpServers = JSON.parse(
          localStorage.getItem('mcpServers') || '[]'
        )
        const server = mcpServers.find((s: any) => s.id === serverId)

        if (!server) {
          console.error('❌ Server not found:', serverId)
          toast.error('Server not found')
          return
        }

        console.log('📋 Server info:', server)

        // Get decrypted token from connection (if connected before) or decrypt it
        const connection = connections.get(serverId)
        let token = connection?.token

        if (!token) {
          console.log('🔐 Token not in connection, need to decrypt')
          // Need to decrypt token
          const unlockedPassword = sessionStorage.getItem('unlocked-password')
          if (!unlockedPassword) {
            console.log('❌ No unlocked password, redirecting to unlock page')

            // Store server info for reconnect after unlock
            localStorage.setItem(
              'pending-single-reconnect',
              JSON.stringify({
                serverId: serverId,
                serverName: server.serverName,
                serverUrl: server.serverUrl,
                token: server.token
              })
            )

            // Redirect to unlock password page
            router.push(
              `/unlock-password?returnUrl=/dashboard&purpose=single-reconnect`
            )
            return
          }

          if (window.electron?.crypto) {
            console.log('🔓 Decrypting token...')
            const decryptResult = await window.electron.crypto.decryptToken(
              server.token,
              unlockedPassword
            )
            if (decryptResult.success) {
              token = decryptResult.token
              console.log('✅ Token decrypted successfully')
            } else {
              console.error('❌ Failed to decrypt token:', decryptResult.error)
              toast.error('Failed to decrypt token')
              return
            }
          }
        }

        if (!token) {
          console.error('❌ Token not available')
          toast.error('Token not available')
          return
        }

        // Reconnect
        console.log('🔌 Attempting to reconnect...')
        toast.info('Reconnecting...')
        const result = await connectToServer({
          id: serverId,
          name: server.serverName,
          url: server.serverUrl,
          token: token
        })

        console.log('🔌 Reconnect result:', result)

        if (result.success) {
          console.log('✅ Reconnected successfully')
          toast.success('Reconnected successfully')
          // Reload data
          await loadAllServersData()
        } else {
          console.error('❌ Reconnection failed:', result.error)
          toast.error(`Reconnection failed: ${result.error}`)
        }
      } catch (error) {
        console.error('❌ Reconnect error:', error)
        toast.error('Reconnection failed')
      } finally {
        // Remove from reconnecting set
        setReconnectingServers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(serverId)
          return newSet
        })
      }
    },
    [connections, connectToServer, loadAllServersData, router]
  )

  // Check which apps actually have this server configured in their config files
  const checkActualConfiguration = useCallback(
    async (serverId: string): Promise<string[]> => {
      try {
        // Get server info from localStorage
        const mcpServers = JSON.parse(
          localStorage.getItem('mcpServers') || '[]'
        )
        const server = mcpServers.find((s: any) => s.id === serverId)

        if (!server) {
          console.warn('Server not found:', serverId)
          return []
        }

        const serverName = server.serverName || 'peta-mcp-desk'
        const appNames = ['claude', 'cursor', 'vscode', 'windsurf', 'antigravity']
        const actualConfigured: string[] = []

        // Check each app's config file
        for (const appName of appNames) {
          try {
            if (window.electron?.mcpConfig?.getServers) {
              const result = await window.electron.mcpConfig.getServers(appName)

              if (result?.success && result.servers) {
                // Check if our server exists in the config
                const hasServer = Object.keys(result.servers).includes(
                  serverName
                )
                if (hasServer) {
                  actualConfigured.push(appName)
                }
              }
            }
          } catch (error) {
            console.error(`Failed to check config for ${appName}:`, error)
          }
        }

        // Update localStorage to reflect actual state
        const updatedServers = mcpServers.map((s: any) => {
          if (s.id === serverId) {
            return { ...s, configuredApps: actualConfigured }
          }
          return s
        })
        localStorage.setItem('mcpServers', JSON.stringify(updatedServers))

        // Update state
        setConfiguredApps((prev) => ({
          ...prev,
          [serverId]: actualConfigured
        }))

        return actualConfigured
      } catch (error) {
        console.error('Failed to check actual configuration:', error)
        return []
      }
    },
    []
  )

  // Handle config to specific app - entry point
  const handleConfigToApp = useCallback(
    async (serverId: string, appName: string) => {
      // Navigate to config-to-client page which handles decryption
      router.push(`/config-to-client?serverId=${serverId}&appName=${appName}`)
    },
    [router]
  )

  // Listen for capabilities change notifications and auto-refresh data
  useEffect(() => {
    const handleCapabilitiesChanged = (event: CustomEvent) => {
      const { serverId, serverName } = event.detail
      console.log(
        `🔄 [Dashboard] Capabilities changed for ${serverName}, auto-refreshing...`
      )

      // Reload all data when any server capabilities change
      loadAllServersData()
      toast.success(`Capabilities updated for ${serverName}`)
    }

    window.addEventListener(
      'capabilities-changed',
      handleCapabilitiesChanged as any
    )

    return () => {
      window.removeEventListener(
        'capabilities-changed',
        handleCapabilitiesChanged as any
      )
    }
  }, [loadAllServersData])

  // Listen for native menu actions
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.electron?.onConnectionMenuAction
    ) {
      return
    }

    const handleMenuAction = (data: { serverId: string; action: string }) => {
      console.log('Connection menu action:', data)
      const { serverId, action } = data

      if (action === 'add-url') {
        console.log('Add MCP Server with URL for server:', serverId)
        // Navigate to add-server-url page with serverId
        router.push(`/add-server-url?serverId=${serverId}`)
      } else if (action === 'add-json') {
        console.log('Add MCP Server with JSON for server:', serverId)
        // Navigate to add-server-json page with serverId
        router.push(`/add-server-json?serverId=${serverId}`)
      } else if (action.startsWith('config-')) {
        // Handle configuration for clients (claude, cursor, vscode, windsurf)
        const appName = action.replace('config-', '')
        console.log(`Config to ${appName} for server:`, serverId)

        // Pull server info from localStorage
        handleConfigToApp(serverId, appName)
      }
    }

    window.electron.onConnectionMenuAction(handleMenuAction)
  }, [handleConfigToApp, router])

  // Clear all cache function
  const clearAllCache = useCallback(async () => {
    try {
      const confirmation = confirm(
        'Are you sure you want to clear all cached data? This will:\n- Clear all MCP server configurations\n- Clear Master Password\n- Clear Dashboard cache\n- Reset the app to initial state\n\nThis operation cannot be undone!'
      )

      if (!confirmation) return

      const cacheKeys = [
        'dashboardData',
        'mcpServers',
        'currentServerId',
        'mcpServerConnected',
        'editingServer',
        'masterPasswordSet',
        'dashboard_capabilities_cached'
      ]

      cacheKeys.forEach((key) => {
        localStorage.removeItem(key)
      })

      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('selectedClients_')) {
          localStorage.removeItem(key)
        }
      })

      if (window.electron?.clearAllAppData) {
        try {
          const result = await window.electron.clearAllAppData()
          if (result?.success) {
            console.log('All application data cleared successfully')
          } else {
            console.error('Failed to clear application data:', result?.error)
          }
        } catch (error) {
          console.error('Failed to clear application data:', error)
        }
      }

      if (window.electron?.updateConnectionStatus) {
        window.electron.updateConnectionStatus(false)
      }

      console.log('All cache and data cleared successfully')
      alert(
        'Cache cleared successfully! The app will redirect to the initial setup page.'
      )

      router.push('/welcome')
    } catch (error) {
      console.error('Failed to clear all cache:', error)
      alert(
        'Error clearing cache: ' +
          (error instanceof Error ? error.message : String(error))
      )
    }
  }, [router])

  // Handle auto-lock time selection
  const handleAutoLockTimeSelect = useCallback(
    (time: number) => {
      setAutoLockTimer(time)
      updateAutoLockTimer(time)
    },
    [updateAutoLockTimer]
  )

  // Listen for settings menu actions
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.electron?.onSettingsMenuAction
    ) {
      return
    }

    const handleSettingsMenuAction = async (data: {
      action: string
      value?: number
    }) => {
      console.log('Settings menu action:', data)
      const { action, value } = data

      switch (action) {
        case 'add-server':
          router.push('/mcp-setup')
          break
        case 'manage-server':
          router.push('/server-management')
          break
        case 'add-client':
          router.push('/add-mcp-client-manually?mode=add')
          break
        case 'auto-lock-time':
          // Handle auto-lock time change
          if (value !== undefined) {
            handleAutoLockTimeSelect(value)
          }
          break
        case 'security':
          router.push('/security-settings')
          break
        case 'backup':
          router.push('/backup-restore')
          break
        case 'playground':
          console.log('Navigate to playground')
          break
        case 'reset-password':
          router.push('/reset-master-password')
          break
        case 'clear-cache':
          await clearAllCache()
          break
        default:
          console.log('Unknown settings action:', action)
      }
    }

    window.electron.onSettingsMenuAction(handleSettingsMenuAction)
  }, [router, handleAutoLockTimeSelect, clearAllCache])

  useEffect(() => {
    // Sync auto-lock timer settings from localStorage to global state
    try {
      const savedAutoLockTimer = localStorage.getItem('autoLockTimer')
      if (savedAutoLockTimer) {
        const timerValue = parseInt(savedAutoLockTimer)
        if (timerValue !== globalAutoLockTimer) {
          updateAutoLockTimer(timerValue)
        }
      }
    } catch (error) {
      console.error('Failed to sync autoLockTimer:', error)
    }

    // Load server switch states
    try {
      const savedSwitches = localStorage.getItem('serverSwitches')
      if (savedSwitches) {
        const switches = JSON.parse(savedSwitches)
        setServerSwitches(switches)
      }
    } catch (error) {
      console.error('Failed to load server switches:', error)
    }

    setAutoLockTimer(globalAutoLockTimer)

    // Check Google Drive authorization status
    checkGoogleDriveAuth()
  }, [globalAutoLockTimer, updateAutoLockTimer, checkGoogleDriveAuth])

  // Google Drive authorization handling
  // Helper function to get auth type display name
  const getAuthTypeName = (authType: number): string => {
    switch (authType) {
      case 2: return 'Google Drive'
      case 3: return 'Notion'
      case 4: return 'Figma'
      default: return 'OAuth'
    }
  }

  const handleOAuthAuth = async (
    gatewayServerId: string,
    mcpServerId?: string,
    toolId?: string,
    authType?: number
  ) => {
    try {
      setIsAuthenticating(true)
      if (toolId) {
        setAuthenticatingToolId(toolId)
        setAuthStatus((prev) => ({ ...prev, [toolId]: 'connecting' }))
      }

      // Get the tool's configTemplate
      const clients = serverClients[gatewayServerId] || []
      const tool = clients
        .flatMap((c) => c.tools)
        .find((t) => t.serverId === mcpServerId)

      if (!tool || !tool.configTemplate) {
        console.error('Tool configTemplate not found')
        setAuthStatus((prev) => ({ ...prev, [toolId || '']: 'failed' }))
        setIsAuthenticating(false)
        setAuthenticatingToolId(null)
        return
      }

      // Determine authType from tool if not provided
      const effectiveAuthType = authType || tool.authType

      // Parse configTemplate to get authConfig
      let configTemplateObj
      try {
        configTemplateObj = JSON.parse(tool.configTemplate)
      } catch (error) {
        console.error('Failed to parse configTemplate:', error)
        setAuthStatus((prev) => ({ ...prev, [toolId || '']: 'failed' }))
        setIsAuthenticating(false)
        setAuthenticatingToolId(null)
        return
      }

      const authConfigEncrypted = configTemplateObj.authConfig
      if (!authConfigEncrypted) {
        console.error('authConfig not found in configTemplate')
        setAuthStatus((prev) => ({ ...prev, [toolId || '']: 'failed' }))
        setIsAuthenticating(false)
        setAuthenticatingToolId(null)
        return
      }

      // Decrypt authConfig to get credentials
      const { decryptAuthConfig, getConfigValue } = await import(
        '@/lib/aes-gcm-decrypt'
      )
      const decryptedConfig = await decryptAuthConfig(authConfigEncrypted)

      if (!decryptedConfig) {
        console.error('Failed to decrypt authConfig')
        setAuthStatus((prev) => ({ ...prev, [toolId || '']: 'failed' }))
        setIsAuthenticating(false)
        setAuthenticatingToolId(null)
        return
      }

      console.log('✅ Decrypted authConfig successfully')
      console.log('  Decrypted config (full array):', decryptedConfig)

      // Select the correct config based on allowUserInput
      // Index 0: System default config
      // Index 1: User custom config (when allowUserInput=true)
      const configIndex = tool.allowUserInput ? 1 : 0

      if (!Array.isArray(decryptedConfig) || decryptedConfig.length <= configIndex) {
        console.error(`Config at index ${configIndex} not found in decrypted authConfig`)
        setAuthStatus((prev) => ({ ...prev, [toolId || '']: 'failed' }))
        setIsAuthenticating(false)
        setAuthenticatingToolId(null)
        return
      }

      const selectedConfig = decryptedConfig[configIndex]
      console.log(`  Using config at index ${configIndex} (allowUserInput=${tool.allowUserInput}):`, selectedConfig)

      // Get credentials definition from configTemplate
      const credentials = configTemplateObj.credentials || []
      console.log('  Credentials definition:', credentials)

      // Extract clientId and clientSecret based on credentials definition
      const clientIdCred = credentials.find(
        (c: any) => c.key === 'YOUR_CLIENT_ID'
      )
      const clientSecretCred = credentials.find(
        (c: any) => c.key === 'YOUR_CLIENT_SECRET'
      )

      if (!clientIdCred || !clientSecretCred) {
        console.error(
          'Client ID or Client Secret credential not defined in configTemplate'
        )
        setAuthStatus((prev) => ({ ...prev, [toolId || '']: 'failed' }))
        setIsAuthenticating(false)
        setAuthenticatingToolId(null)
        return
      }

      // selectedConfig is an object like {ClientId: '...', ClientSecret: '...'}
      // We need to extract values using the credential names
      const clientId = selectedConfig[clientIdCred.name] || selectedConfig[clientIdCred.key]
      const clientSecret = selectedConfig[clientSecretCred.name] || selectedConfig[clientSecretCred.key]
      console.log('  clientId:', clientId)
      console.log('  clientSecret:', clientSecret ? '***' : 'missing')

      if (!clientId || !clientSecret) {
        console.error(
          'clientId or clientSecret not found in selected config',
          'Available keys:',
          Object.keys(selectedConfig)
        )
        setAuthStatus((prev) => ({ ...prev, [toolId || '']: 'failed' }))
        setIsAuthenticating(false)
        setAuthenticatingToolId(null)
        return
      }

      // Perform OAuth authorization through Electron
      // Pass the decrypted clientId and clientSecret with authType
      const authResult = await (
        window as any
      ).electronAPI.oauth.authenticate(effectiveAuthType, clientId, clientSecret)

      console.log('🔍 Full auth result:', authResult)

      if (authResult.success && mcpServerId && gatewayServerId) {
        // After successful authorization, notify core via socket
        console.log('====================================')
        console.log('📤 Sending to Core (configure_server):')
        console.log('====================================')
        console.log('Gateway Server ID:', gatewayServerId)
        console.log('MCP Server ID:', mcpServerId)

        // Assemble authConf dynamically based on credentials definition and authType
        const authConf = credentials.map((cred: any) => {
          let value = ''

          if (effectiveAuthType === 2) {
            // Google Drive: only refresh_token from OAuth result
            if (cred.key === 'YOUR_REFRESH_TOKEN') {
              value = authResult.tokenInfo.refresh_token || ''
            } else {
              value = selectedConfig[cred.name] || selectedConfig[cred.key] || ''
            }
          } else if (effectiveAuthType === 3) {
            // Notion: both access_token and refresh_token from OAuth result
            if (cred.key === 'YOUR_ACCESS_TOKEN') {
              value = authResult.tokenInfo.access_token || ''
            } else if (cred.key === 'YOUR_REFRESH_TOKEN') {
              value = authResult.tokenInfo.refresh_token || ''
            } else {
              value = selectedConfig[cred.name] || selectedConfig[cred.key] || ''
            }
          } else if (effectiveAuthType === 4) {
            // Figma: both access_token and refresh_token from OAuth result (same as Notion)
            if (cred.key === 'YOUR_ACCESS_TOKEN') {
              value = authResult.tokenInfo.access_token || ''
            } else if (cred.key === 'YOUR_REFRESH_TOKEN') {
              value = authResult.tokenInfo.refresh_token || ''
            } else {
              value = selectedConfig[cred.name] || selectedConfig[cred.key] || ''
            }
          } else {
            // Default fallback
            value = selectedConfig[cred.name] || selectedConfig[cred.key] || ''
          }

          return {
            key: cred.key,
            value: value,
            dataType: cred.dataType || 1
          }
        })

        console.log('\nAuth Configuration:')
        authConf.forEach((conf, index) => {
          console.log(`\n[${index + 1}] ${conf.key}`)
          console.log(`    Value: ${conf.value}`)
          console.log(`    Data Type: ${conf.dataType}`)
          console.log(`    Type of value:`, typeof conf.value)
          console.log(`    Type of dataType:`, typeof conf.dataType)
        })
        console.log('\nAuthConf Array:')
        console.log(JSON.stringify(authConf, null, 2))
        console.log('====================================')

        // Send configuration via socket
        console.log('🚀 Calling configureServer with:')
        console.log(
          '  gatewayServerId:',
          gatewayServerId,
          '(type:',
          typeof gatewayServerId,
          ')'
        )
        console.log(
          '  mcpServerId:',
          mcpServerId,
          '(type:',
          typeof mcpServerId,
          ')'
        )
        console.log(
          '  authConf:',
          authConf,
          '(type:',
          typeof authConf,
          ', isArray:',
          Array.isArray(authConf),
          ')'
        )

        const configResult = await configureServer(
          gatewayServerId,
          mcpServerId,
          authConf
        )

        if (!configResult.success) {
          toast.error(`Failed to configure server: ${configResult.error}`)
          if (toolId) {
            setAuthStatus((prev) => ({ ...prev, [toolId]: 'failed' }))
          }
          setIsAuthenticating(false)
          setAuthenticatingToolId(null)
          return
        }

        console.log('✅ Core notified successfully:', configResult.data)
      }

      const result = authResult
      if (result.success) {
        // Print complete authorization information in frontend console
        console.log('====================================')
        console.log(`✅ ${getAuthTypeName(effectiveAuthType)} Authorization Successful!`)
        console.log('====================================')

        if (result.userInfo) {
          console.log('👤 User Information:')
          console.log('   📧 Email:', result.userInfo.email)
          console.log('   👤 Name:', result.userInfo.name || 'N/A')
          console.log('   🖼️  Picture:', result.userInfo.picture || 'N/A')
          console.log('   🆔 User ID:', result.userInfo.id || 'N/A')
          console.log('')
        }

        if (result.tokenInfo) {
          console.log('🔐 Token Information:')
          console.log('   - Token Type:', result.tokenInfo.token_type)
          console.log('   - Scope:', result.tokenInfo.scope)
          console.log('   - Expires At:', result.tokenInfo.expires_at)
          console.log(
            '   - Has Refresh Token:',
            result.tokenInfo.has_refresh_token ? '✓ Yes' : '✗ No'
          )
          console.log('')
          console.log('🔧 Debug Information (Development Only):')
          console.log('   - Access Token:', result.tokenInfo.access_token)
          console.log('   - Refresh Token:', result.tokenInfo.refresh_token)
          console.log('')
        }

        if (result.storage_path) {
          console.log('💾 Storage Path:', result.storage_path)
          console.log('')
        }

        if (result.tokenInfo?.full_tokens) {
          console.log('📝 Full Token Object:')
          console.log(result.tokenInfo.full_tokens)
        }

        console.log('====================================')

        toast.success(`${getAuthTypeName(effectiveAuthType)} authorization successful!`)
        await checkGoogleDriveAuth()
        // Clear auth status on success
        if (toolId) {
          setAuthStatus((prev) => ({ ...prev, [toolId]: null }))
        }
      } else {
        toast.error(`Authorization failed: ${result.error}`)
        if (toolId) {
          setAuthStatus((prev) => ({ ...prev, [toolId]: 'failed' }))
        }
      }
    } catch (error) {
      console.error('OAuth auth error:', error)
      toast.error(`Failed to authorize ${getAuthTypeName(effectiveAuthType || 0)}`)
      if (toolId) {
        setAuthStatus((prev) => ({ ...prev, [toolId]: 'failed' }))
      }
    } finally {
      setIsAuthenticating(false)
      setAuthenticatingToolId(null)
    }
  }

  // Show disconnect authorization confirmation dialog
  const handleOAuthLogout = (
    gatewayServerId: string,
    mcpServerId?: string,
    authType?: number
  ) => {
    // Store gatewayServerId, mcpServerId, and authType for confirmDisconnect
    setDisconnectTargetServerId(
      mcpServerId ? `${gatewayServerId}:${mcpServerId}:${authType}` : undefined
    )
    setShowDisconnectDialog(true)
  }

  // Confirm disconnect authorization
  const confirmDisconnect = async () => {
    try {
      setIsAuthenticating(true) // Use the same loading state

      if (!disconnectTargetServerId) return

      // Parse gatewayServerId, mcpServerId, and authType
      const [gatewayServerId, mcpServerId, authTypeStr] =
        disconnectTargetServerId.split(':')
      const authType = parseInt(authTypeStr, 10)

      // Clear local token through Electron
      const result = await (window as any).electronAPI.oauth.logout(authType)

      if (result.success) {

        // After successful logout, notify core to unconfigure via socket
        console.log('====================================')
        console.log('📤 Sending to Core (unconfigure_server):')
        console.log('====================================')
        console.log('Gateway Server ID:', gatewayServerId)
        console.log('MCP Server ID:', mcpServerId)
        console.log('====================================')

        const unconfigResult = await unconfigureServer(
          gatewayServerId,
          mcpServerId
        )

        if (!unconfigResult.success) {
          console.warn(
            'Failed to notify core about logout:',
            unconfigResult.error
          )
          // Does not affect local logout
        } else {
          console.log('✅ Core notified successfully:', unconfigResult.data)
        }
      }

      if (result.success) {
        toast.success(`Disconnected from ${getAuthTypeName(authType)}`)
        if (authType === 2) {
          setGoogleDriveAuth({ authenticated: false })
        }
        // Refresh data to update configured status
        await loadAllServersData()
      } else {
        toast.error(`Disconnect failed: ${result.error}`)
      }
    } catch (error) {
      console.error('OAuth disconnect error:', error)
      toast.error('Failed to disconnect')
    } finally {
      setIsAuthenticating(false)
      setAuthenticatingToolId(null)
      setShowDisconnectDialog(false)
      setDisconnectTargetServerId(undefined)
    }
  }

  const saveData = async (
    gatewayServerId: string,
    updatedClients: MCPClient[]
  ) => {
    try {
      const capabilities = convertClientsToCapabilities(updatedClients)

      const result = await setCapabilities(gatewayServerId, capabilities)

      if (result.success) {
        toast.success('Configuration saved successfully')
        // Update local state
        setServerClients((prev) => ({
          ...prev,
          [gatewayServerId]: updatedClients
        }))
      } else {
        toast.error(`Failed to save: ${result.error}`)
      }
    } catch (error) {
      console.error('Failed to save capabilities:', error)
      toast.error('Failed to save configuration')
    }
  }

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showSettingsMenu && !target.closest('.relative')) {
        setShowSettingsMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettingsMenu])

  const toggleTool = (
    gatewayServerId: string,
    clientId: string,
    toolServerId: string
  ) => {
    console.log(
      `🔧 toggleTool: gatewayServerId=${gatewayServerId}, clientId=${clientId}, toolServerId=${toolServerId}`
    )

    const clients = serverClients[gatewayServerId] || []

    // Find the corresponding tool
    const client = clients.find((c) => c.id === clientId)
    const tool = client?.tools.find((t) =>
      t.serverId ? t.serverId === toolServerId : t.name === toolServerId
    )

    // If allowUserInput=true and authType in [2, 3, 4] (OAuth), need to check authorization status
    if (tool && tool.allowUserInput && [2, 3, 4].includes(tool.authType)) {
      // If not authorized, clicking should trigger the authorization flow regardless of current check state
      if (!tool.configured) {
        console.log(`   Tool requires authorization, triggering auth flow...`)
        const toolId = `${gatewayServerId}-${clientId}-${toolServerId}`
        handleOAuthAuth(gatewayServerId, tool.serverId, toolId, tool.authType)
        return
      }
    }

    const updatedClients = clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            tools: c.tools.map((t) => {
              // Match using serverId, fallback to name if serverId doesn't exist
              const match = t.serverId
                ? t.serverId === toolServerId
                : t.name === toolServerId
              if (match) {
                console.log(
                  `   Toggling tool: ${t.name} (serverId: ${t.serverId})`
                )
              }
              return match ? { ...t, enabled: !t.enabled } : t
            })
          }
        : c
    )
    saveData(gatewayServerId, updatedClients)
  }

  const toggleFunction = (
    gatewayServerId: string,
    clientId: string,
    toolServerId: string,
    functionId: string,
    isDataFunction = false
  ) => {
    console.log(
      `🔧 toggleFunction: gatewayServerId=${gatewayServerId}, clientId=${clientId}, toolServerId=${toolServerId}, functionId=${functionId}`
    )

    const clients = serverClients[gatewayServerId] || []

    const updatedClients = clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            tools: c.tools.map((t) => {
              // Match by serverId, fall back to name when missing
              const match = t.serverId
                ? t.serverId === toolServerId
                : t.name === toolServerId
              if (match) {
                const functionsKey = isDataFunction
                  ? 'dataFunctions'
                  : 'functions'
                const updatedTool = {
                  ...t,
                  [functionsKey]: t[functionsKey].map((f) =>
                    f.id === functionId ? { ...f, enabled: !f.enabled } : f
                  )
                }

                const hasEnabledFunctions = updatedTool.functions.some(
                  (f) => f.enabled
                )
                const hasEnabledDataFunctions = updatedTool.dataFunctions.some(
                  (f) => f.enabled
                )
                const toolShouldBeEnabled =
                  hasEnabledFunctions || hasEnabledDataFunctions

                return {
                  ...updatedTool,
                  enabled: toolShouldBeEnabled
                }
              }
              return t
            })
          }
        : c
    )
    saveData(gatewayServerId, updatedClients)
  }

  const updateDangerLevel = (
    gatewayServerId: string,
    clientId: string,
    toolServerId: string,
    functionId: string,
    newDangerLevel: number,
    isDataFunction = false
  ) => {
    console.log(
      `🔧 updateDangerLevel: gatewayServerId=${gatewayServerId}, clientId=${clientId}, toolServerId=${toolServerId}, functionId=${functionId}, newLevel=${newDangerLevel}`
    )

    const clients = serverClients[gatewayServerId] || []

    const updatedClients = clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            tools: c.tools.map((t) => {
              // Match by serverId, fall back to name when missing
              const match = t.serverId
                ? t.serverId === toolServerId
                : t.name === toolServerId
              if (match) {
                const functionsKey = isDataFunction
                  ? 'dataFunctions'
                  : 'functions'
                return {
                  ...t,
                  [functionsKey]: t[functionsKey].map((f) =>
                    f.id === functionId
                      ? { ...f, dangerLevel: newDangerLevel }
                      : f
                  )
                }
              }
              return t
            })
          }
        : c
    )

    // Log the updated data structure
    console.log(
      '📊 Updated Clients Data:',
      JSON.stringify(updatedClients, null, 2)
    )

    // Convert to capabilities format and log
    const capabilities = convertClientsToCapabilities(updatedClients)
    console.log(
      '📊 Converted Capabilities Data:',
      JSON.stringify(capabilities, null, 2)
    )

    saveData(gatewayServerId, updatedClients)
  }

  const handleSettingsClick = () => {
    setShowSettingsMenu(!showSettingsMenu)
  }

  const handleMenuItemClick = async (action: string) => {
    setShowSettingsMenu(false)

    switch (action) {
      case 'add-server':
        router.push('/mcp-setup')
        break
      case 'server':
        router.push('/server-management')
        break
      case 'client':
        router.push('/add-mcp-client-manually?mode=add')
        break
      case 'security':
        router.push('/security-settings')
        break
      case 'backup':
        router.push('/backup-restore')
        break
      case 'playground':
        console.log('Navigate to playground')
        break
      case 'reset':
        router.push('/reset-master-password')
        break
      case 'clear-cache':
        await clearAllCache()
        break
      default:
        break
    }
  }

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400"></div>
        )
      case 'disconnected':
      case 'checking':
        return (
          <div className="w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400"></div>
        )
      default:
        return (
          <>
            <div className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"></div>
            <div className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"></div>
          </>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checking':
        return (
          <Badge className="bg-blue-400 text-white text-[10px] px-2 py-0 animate-pulse">
            Checking...
          </Badge>
        )
      case 'connected':
        return (
          <Badge className="bg-green-500 text-white text-[10px] px-2 py-0">
            Connected
          </Badge>
        )
      case 'disconnected':
        return (
          <Badge className="bg-red-500 text-white text-[10px] px-2 py-0">
            Disconnected
          </Badge>
        )
      default:
        return null
    }
  }

  const handleDangerLevelChange = (
    gatewayServerId: string,
    clientId: string,
    toolServerId: string,
    functionId: string,
    newLevel: number,
    isDataFunction: boolean,
    event: React.MouseEvent
  ) => {
    event.preventDefault()
    event.stopPropagation()

    updateDangerLevel(
      gatewayServerId,
      clientId,
      toolServerId,
      functionId,
      newLevel,
      isDataFunction
    )
  }

  const getDangerLevelLabel = (level?: number) => {
    switch (level) {
      case DangerLevel.Silent:
        return 'Always allow'
      case DangerLevel.Notification:
        return 'Approval without Password'
      case DangerLevel.Approval:
        return 'Approval with Password'
      default:
        return 'Always allow'
    }
  }

  const renderFunctionList = (
    gatewayServerId: string,
    functions: MCPFunction[],
    clientId: string,
    toolServerId: string,
    title: string,
    isDataFunction = false
  ) => {
    return (
      <div className="mb-4">
        <div className="text-[12px] font-medium text-gray-600 dark:text-gray-300 mb-2">
          {title}
        </div>

        <div className="space-y-1 max-h-[108px] overflow-y-auto px-[10px] bg-[#F2F4F5] dark:bg-gray-800 rounded-[8px] border border-[rgba(0, 0, 0.04)] dark:border-gray-700">
          {functions.map((func) => (
            <div key={func.id} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={func.enabled}
                onChange={() =>
                  toggleFunction(
                    gatewayServerId,
                    clientId,
                    toolServerId,
                    func.id,
                    isDataFunction
                  )
                }
                className="w-3 h-3 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 flex-shrink-0"
              />
              <span
                className="text-[11px] text-gray-700 dark:text-gray-200 truncate flex-1 min-w-0"
                title={func.description}
              >
                {func.name}
              </span>
              {/* Danger level toggle buttons for non-data functions */}
              {!isDataFunction && (
                <div className="flex items-center gap-[2px] flex-shrink-0 p-[1px] rounded bg-gray-100 dark:bg-gray-800">
                  {/* Button 1: Always allow (Silent) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) =>
                          handleDangerLevelChange(
                            gatewayServerId,
                            clientId,
                            toolServerId,
                            func.id,
                            DangerLevel.Silent,
                            isDataFunction,
                            e
                          )
                        }
                        className={`flex-shrink-0 transition-all p-[3px] rounded text-gray-900 dark:text-gray-100 ${
                          (func.dangerLevel ?? DangerLevel.Silent) ===
                          DangerLevel.Silent
                            ? 'bg-white/70 dark:bg-gray-700/70'
                            : 'bg-transparent'
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          className={`${
                            (func.dangerLevel ?? DangerLevel.Silent) ===
                            DangerLevel.Silent
                              ? 'opacity-100'
                              : 'opacity-50'
                          }`}
                        >
                          <path
                            d="M7.99967 14.6673C9.84061 14.6673 11.5073 13.9211 12.7137 12.7147C13.9201 11.5083 14.6663 9.84158 14.6663 8.00065C14.6663 6.15972 13.9201 4.49305 12.7137 3.2866C11.5073 2.08018 9.84061 1.33398 7.99967 1.33398C6.15874 1.33398 4.49207 2.08018 3.28563 3.2866C2.0792 4.49305 1.33301 6.15972 1.33301 8.00065C1.33301 9.84158 2.0792 11.5083 3.28563 12.7147C4.49207 13.9211 6.15874 14.6673 7.99967 14.6673Z"
                            stroke="currentColor"
                            strokeOpacity="0.5"
                            strokeWidth="1.33333"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5.33301 8L7.33301 10L11.333 6"
                            stroke="currentColor"
                            strokeOpacity="0.5"
                            strokeWidth="1.33333"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Always allow</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Button 2: Approval with Password */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) =>
                          handleDangerLevelChange(
                            gatewayServerId,
                            clientId,
                            toolServerId,
                            func.id,
                            DangerLevel.Approval,
                            isDataFunction,
                            e
                          )
                        }
                        className={`flex-shrink-0 transition-all p-[3px] rounded text-gray-900 dark:text-gray-100 ${
                          func.dangerLevel === DangerLevel.Approval
                            ? 'bg-white/70 dark:bg-gray-700/70'
                            : 'bg-transparent'
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          className={`${
                            func.dangerLevel === DangerLevel.Approval
                              ? 'opacity-100'
                              : 'opacity-50'
                          }`}
                        >
                          <g clipPath="url(#clip0_5405_15793)">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M16 7.66732C16 10.076 14.0327 12.0007 11.6833 12.0007C10.2473 12.0007 8.94933 11.1913 8.12467 10.0007H6.20333L5.506 9.32532L4.638 10.0047L3.73 9.28798L2.792 10.0087L0 7.70998L2.23067 5.33398H8.12467C8.888 4.21198 10.194 3.33398 11.684 3.33398C14.0153 3.33398 16 5.24465 16 7.66732ZM8.87267 8.66732C9.526 9.78132 10.3907 10.6673 11.684 10.6673C13.292 10.6673 14.6667 9.34332 14.6667 7.66732C14.6667 6.00198 13.304 4.66732 11.6807 4.66732C10.3107 4.66732 9.486 5.62265 8.87267 6.66732H2.808L1.946 7.58465L2.82067 8.30532L3.74067 7.59798L4.64133 8.30865L5.59933 7.55998L6.74267 8.66732H8.87267ZM12.6667 6.58398C13.2187 6.58398 13.6667 7.03198 13.6667 7.58398C13.6667 8.13598 13.2187 8.58398 12.6667 8.58398C12.1147 8.58398 11.6667 8.13598 11.6667 7.58398C11.6667 7.03198 12.1147 6.58398 12.6667 6.58398Z"
                              fill="currentColor"
                              fillOpacity="0.5"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_5405_15793">
                              <rect width="16" height="16" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Approval with Password</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Button 3: Approval without Password (Notification) */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) =>
                          handleDangerLevelChange(
                            gatewayServerId,
                            clientId,
                            toolServerId,
                            func.id,
                            DangerLevel.Notification,
                            isDataFunction,
                            e
                          )
                        }
                        className={`flex-shrink-0 transition-all p-[3px] rounded text-gray-900 dark:text-gray-100 ${
                          func.dangerLevel === DangerLevel.Notification
                            ? 'bg-white/70 dark:bg-gray-700/70'
                            : 'bg-transparent'
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          className={`${
                            func.dangerLevel === DangerLevel.Notification
                              ? 'opacity-100'
                              : 'opacity-50'
                          }`}
                        >
                          <g clipPath="url(#clip0_5405_15810)">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M3.20667 2.66602L12.0353 13.142L11.014 13.9993L7.61933 9.99935H6.20333L5.506 9.32402L4.638 10.0033L3.73 9.28668L2.792 10.0073L0 7.70868L2.23067 5.33268H3.704L2.18533 3.52335L3.20667 2.66602ZM8.87267 6.66602H7.87L6.75133 5.33268H8.12467C8.888 4.21068 10.194 3.33268 11.684 3.33268C14.0153 3.33268 16 5.24335 16 7.66602C16 9.85802 14.3707 11.6493 12.3067 11.9533L11.188 10.62C11.346 10.65 11.5113 10.666 11.684 10.666C13.292 10.666 14.6667 9.34202 14.6667 7.66602C14.6667 6.00068 13.304 4.66602 11.6807 4.66602C10.3107 4.66602 9.486 5.62135 8.87267 6.66602ZM12.6667 6.58268C13.2187 6.58268 13.6667 7.03068 13.6667 7.58268C13.6667 8.13468 13.2187 8.58268 12.6667 8.58268C12.1147 8.58268 11.6667 8.13468 11.6667 7.58268C11.6667 7.03068 12.1147 6.58268 12.6667 6.58268ZM5.58267 7.57202L4.82267 6.66602H2.808L1.946 7.58335L2.82067 8.30402L3.74067 7.59668L4.64133 8.30735L5.58267 7.57202Z"
                              fill="currentColor"
                              fillOpacity="0.5"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_5405_15810">
                              <rect width="16" height="16" fill="white" />
                            </clipPath>
                          </defs>
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Approval without Password</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const allServers = getAllServers()

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <Header showSettingsButton={true} />

        <div className="mx-auto px-[8px]">
          {allServers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                No Gateway servers connected
              </div>
              <button
                onClick={() => handleMenuItemClick('server')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Connect to Server
              </button>
            </div>
          )}

          {isLoading && allServers.length > 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">
                Loading dashboard data...
              </div>
            </div>
          )}

          {/* Loop through each server */}
          {!isLoading &&
            allServers.map((gatewayServerId) => {
              const connection = connections.get(gatewayServerId)

              // Get server info from localStorage if not in connections
              let serverName = connection?.serverName
              if (!serverName) {
                try {
                  const mcpServers = JSON.parse(
                    localStorage.getItem('mcpServers') || '[]'
                  )
                  const server = mcpServers.find(
                    (s: any) => s.id === gatewayServerId
                  )
                  serverName = server?.serverName || gatewayServerId
                } catch {
                  serverName = gatewayServerId
                }
              }

              const activeClientsCount = connection?.activeClientsCount ?? 0
              const isConnected = connection?.isConnected
              // If no connection exists, treat as connection failed
              const connectionFailed = connection
                ? connection.connectionFailed
                : true
              const isReconnecting = reconnectingServers.has(gatewayServerId)
              const clients = serverClients[gatewayServerId] || []

              // Use activeClientsCount from socket notification for actual client connections
              const totalClients = activeClientsCount
              const clientText = totalClients === 1 ? 'Client' : 'Clients'

              return (
                <div
                  key={gatewayServerId}
                  className="mb-6 bg-white dark:bg-gray-900/50 rounded-[8px] px-[16px] shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  {/* Server name heading */}
                  <div className="py-[10px] border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <img
                        src="/images/serverIcon.png"
                        alt="server-icon"
                        className="w-[26px] h-[26px] flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-[400] text-[#26251E] dark:text-gray-100">
                            {serverName}
                          </span>

                          {/* Connection Status */}
                          {/* Connected: green dot */}
                          {isConnected === true &&
                            !connectionFailed &&
                            !isReconnecting && (
                              <span className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-[#34C759]"></span>
                            )}

                          {/* Connecting: gray tag */}
                          {isReconnecting && (
                            <span className="px-[8px] py-[2px] text-[11px] text-[#8E8E93] dark:text-gray-400 bg-[#F5F5F5] dark:bg-gray-800 rounded-[6px] border-0 flex-shrink-0">
                              connecting
                            </span>
                          )}

                          {/* Connect failed: red tag + retry button */}
                          {connectionFailed && !isReconnecting && (
                            <div className="flex items-center gap-2">
                              <span className="px-[8px] py-[2px] text-[11px] text-[#FF3B30] dark:text-red-400 bg-transparent rounded-[6px] border-0 flex-shrink-0">
                                Connect Failed
                              </span>
                              <button
                                onClick={() => handleReconnect(gatewayServerId)}
                                className="p-[4px] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[4px] transition-colors"
                                title="Retry connection"
                              >
                                <RefreshCw className="w-3 h-3 text-[#8E8E93] dark:text-gray-400" />
                              </button>
                            </div>
                          )}

                          {/* Disconnected: red dot */}
                          {!connection && !isReconnecting && (
                            <span className="w-[6px] h-[6px] rounded-full flex-shrink-0 bg-[#FF3B30]"></span>
                          )}
                        </div>

                        {/* Connection Info */}
                        <div className="text-[11px] text-[#8E8E93] dark:text-gray-400 mt-[4px]">
                          {totalClients} {clientText} Connected
                        </div>
                      </div>

                      {/* Add to Client Button - Only show when connected */}
                      {isConnected && !connectionFailed && (
                        <button
                          onClick={async (e) => {
                            if (
                              typeof window !== 'undefined' &&
                              window.electron?.showConnectionMenu
                            ) {
                              const rect =
                                e.currentTarget.getBoundingClientRect()

                              // Check actual configuration in client config files
                              const actualConfigured =
                                await checkActualConfiguration(gatewayServerId)

                              console.log(
                                '📋 Opening menu for server:',
                                gatewayServerId
                              )
                              console.log(
                                '📋 Actually configured apps:',
                                actualConfigured
                              )

                              window.electron.showConnectionMenu(
                                rect.left,
                                rect.bottom + 4,
                                gatewayServerId,
                                actualConfigured
                              )
                            }
                          }}
                          className="px-[12px] py-[4px] text-xs bg-[white] dark:bg-gray-900 text-[#26251E] dark:text-gray-100 rounded-[8px] border border-gray-200 dark:border-gray-700 transition-colors flex items-center gap-1 flex-shrink-0"
                        >
                          Add to Client
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {clients.length === 0 && (
                    <div className="ml-8 mb-4 text-sm text-gray-500 dark:text-gray-400">
                      No MCP clients configured on this server
                    </div>
                  )}

                  {/* Show all clients for the server */}
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      className="pb-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 last:mb-0 last:pb-0"
                    >
                      <div className="space-y-[2px]">
                        <div>
                          <div className="pb-4">
                            {client.tools.map((tool) => {
                              const toolId = `${gatewayServerId}-${client.id}-${
                                tool.serverId || tool.name
                              }`

                              return (
                                <div
                                  key={tool.name}
                                  className="border-b border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-center justify-between py-[10px]">
                                    <div className="flex items-center gap-2 flex-1">
                                      {/* Show loading spinner when this tool is being authorized */}
                                      {authenticatingToolId === toolId ? (
                                        <LoadingSpinner />
                                      ) : (
                                        <input
                                          type="checkbox"
                                          checked={
                                            tool.allowUserInput &&
                                            [2, 3, 4].includes(tool.authType)
                                              ? tool.enabled && tool.configured
                                              : tool.enabled
                                          }
                                          onChange={() =>
                                            toggleTool(
                                              gatewayServerId,
                                              client.id,
                                              tool.serverId || tool.name
                                            )
                                          }
                                          className="w-4 h-4 text-blue-600 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600"
                                        />
                                      )}

                                      <span className="text-sm text-gray-700 dark:text-gray-200">
                                        {tool.name}
                                      </span>

                                      {/* Auth status indicators for OAuth tools */}
                                      {tool.allowUserInput &&
                                        [2, 3, 4].includes(tool.authType) && (
                                          <>
                                            {/* Connecting status */}
                                            {authStatus[toolId] ===
                                              'connecting' && (
                                              <span className="px-2 py-0.5 text-xs rounded-md bg-gray-400 text-white">
                                                Connecting...
                                              </span>
                                            )}

                                            {/* Failed status */}
                                            {authStatus[toolId] ===
                                              'failed' && (
                                              <span className="px-2 py-0.5 text-xs rounded-md bg-red-500 text-white">
                                                Connect failed
                                              </span>
                                            )}

                                            {/* Green dot - when configured and no error */}
                                            {tool.configured &&
                                              !authStatus[toolId] && (
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <div className="w-2 h-2 bg-green-500 rounded-full cursor-default"></div>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Connected</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              )}
                                          </>
                                        )}
                                    </div>

                                    {/* Disconnect icon - only shown when allowUserInput=true and authType in [2,3,4] and authorized */}
                                    {tool.allowUserInput &&
                                      [2, 3, 4].includes(tool.authType) &&
                                      tool.configured && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={() =>
                                                handleOAuthLogout(
                                                  gatewayServerId,
                                                  tool.serverId,
                                                  tool.authType
                                                )
                                              }
                                              onMouseEnter={() =>
                                                setHoveredDisconnectBtn(toolId)
                                              }
                                              onMouseLeave={() =>
                                                setHoveredDisconnectBtn(null)
                                              }
                                              className="transition-colors"
                                            >
                                              <DisconnectIcon
                                                isHovered={
                                                  hoveredDisconnectBtn ===
                                                  toolId
                                                }
                                              />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>
                                              Disconnect and remove
                                              authorization
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                  </div>

                                  {/* Show details only when tool is enabled */}
                                  {tool.enabled && (
                                    <div className="ml-6">
                                      {tool.functions.length > 0 && (
                                        <div>
                                          {renderFunctionList(
                                            gatewayServerId,
                                            tool.functions,
                                            client.id,
                                            tool.serverId || tool.name,
                                            `Functions - ${
                                              tool.functions.filter(
                                                (f) => f.enabled
                                              ).length
                                            }/${tool.functions.length} enable`,
                                            false
                                          )}
                                        </div>
                                      )}

                                      {tool.dataFunctions.length > 0 && (
                                        <div>
                                          {renderFunctionList(
                                            gatewayServerId,
                                            tool.dataFunctions,
                                            client.id,
                                            tool.serverId || tool.name,
                                            `Data - ${
                                              tool.dataFunctions.filter(
                                                (f) => f.enabled
                                              ).length
                                            }/${
                                              tool.dataFunctions.length
                                            } enable`,
                                            true
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
        </div>

        {/* Disconnect authorization confirmation dialog */}
        {showDisconnectDialog && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-[10px] p-[16px] max-w-[260px] w-full shadow-xl">
              <h2 className="text-[13px] font-bold text-center text-[#26251e] dark:text-gray-100 mb-[10px]">
                Disconnect Authorization?
              </h2>
              <p className="text-[11px] text-center text-gray-900 dark:text-gray-100 leading-[14px] mb-[16px]">
                {(() => {
                  if (!disconnectTargetServerId)
                    return 'This service is not configured'

                  // Parse gatewayServerId and mcpServerId
                  const [gatewayServerId, mcpServerId] =
                    disconnectTargetServerId.split(':')

                  // Find the tool name for the disconnecting server
                  let tool = null
                  Object.values(serverClients).forEach((clients) => {
                    const client = clients.find((c) =>
                      c.tools.some((t) => t.serverId === mcpServerId)
                    )
                    if (client) {
                      tool = client.tools.find(
                        (t) => t.serverId === mcpServerId
                      )
                    }
                  })

                  return tool
                    ? `${tool.name}`
                    : 'This service is not configured'
                })()}
              </p>
              <div className="flex gap-[8px]">
                <button
                  onClick={() => setShowDisconnectDialog(false)}
                  disabled={isAuthenticating}
                  className="flex-1 h-[28px] rounded-[5px] bg-gray-100 dark:bg-gray-800 text-[#26251e] dark:text-gray-100 text-[13px] font-[400] transition-colors hover:bg-[rgba(0,0,0,0.15)] dark:hover:bg-gray-700 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDisconnect}
                  disabled={isAuthenticating}
                  className="flex-1 h-[28px] rounded-[5px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[13px] font-medium transition-colors shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuthenticating ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Authorization loading overlay - only show during disconnect */}
        {isAuthenticating && showDisconnectDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-xl">
              <div className="flex items-center space-x-3">
                <LoadingSpinner className="w-6 h-6" />
                <p className="text-gray-700 dark:text-gray-200">
                  Disconnecting...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
