interface AppInfo {
  installed: boolean
  path: string | null
  icon: string | null
}

interface BiometricAvailability {
  available: boolean
  platform: string
  touchID: boolean
  faceID: boolean
  windowsHello: boolean
  error: string | null
}

interface BiometricResult {
  success: boolean
  error: string | null
}

interface BiometricPasswordResult {
  success: boolean
  password: string | null
  error: string | null
}

interface BiometricAPI {
  // Check whether biometrics is available
  isAvailable: () => Promise<BiometricAvailability>

  // Perform biometric authentication
  authenticate: (reason?: string) => Promise<BiometricResult>

  // Get stored password
  getPassword: () => Promise<BiometricPasswordResult>

}

interface PasswordResult {
  success: boolean
  error?: string
}

interface PasswordGetResult {
  success: boolean
  password: string | null
  error?: string
}

interface PasswordAPI {
  // Store master password
  store: (password: string) => Promise<PasswordResult>

  // Verify master password
  verify: (password: string) => Promise<{ success: boolean }>

  // Update master password
  update: (oldPassword: string, newPassword: string) => Promise<PasswordResult>

  // Check whether a master password exists
  has: () => Promise<{ hasPassword: boolean }>

  // Delete master password
  remove: () => Promise<PasswordResult>
}

type SupportedApp = 'claude' | 'cursor' | 'windsurf' | 'vscode'

interface MCPConfigAPI {
  // Remove server from config
  removeServer: (serverName: string) => Promise<{
    success: boolean
    results?: Record<SupportedApp, boolean>
    error?: string
  }>

  // Add server to config
  addServer: (
    appName: SupportedApp,
    serverName: string,
    serverConfig: any
  ) => Promise<{
    success: boolean
    error?: string
  }>

  // Update server in config
  updateServer: (
    appName: SupportedApp,
    oldServerName: string,
    newServerName: string,
    serverConfig: any
  ) => Promise<{
    success: boolean
    error?: string
  }>

  // Get all servers in config
  getServers: (appName: SupportedApp) => Promise<{
    success: boolean
    servers?: Record<string, any>
    error?: string
  }>

  // Check whether config exists
  exists: (appName: SupportedApp) => Promise<{
    success: boolean
    exists?: boolean
    error?: string
  }>
}

interface ProxyAPI {
  // Update proxy enabled state (toggle)
  updateEnableStatus: (configId: string, enabled: boolean, reason?: string) => void

  // Update proxy permissions (select/deselect)
  updatePermissions: (configId: string, permissions: any) => void

  // Proxy control (stop, etc.)
  control: (action: 'stop' | 'start' | 'restart', configId: string) => void

  // Get all proxy states
  getAllStates: () => Promise<{
    success: boolean
    states?: Record<string, any>
    error?: string
  }>

  // Get client connection status and server info
  getDashboardData: () => Promise<{
    success: boolean
    data?: {
      clients: Array<{
        id: string
        name: string
        icon: string
        enabled: boolean
        status: string
        statusText: string
        environment: string
        tools: Array<any>
        serversConnected: string
      }>
    }
    proxyStates?: Record<string, any>
    error?: string
  }>
}

interface LockStatus {
  isLocked: boolean
  lockedAt: string | null
}

interface ElectronAPI {
  hideQuickPanel: () => void
  showSettings: () => void
  checkInstalledApps: () => Promise<{
    cursor: AppInfo
    claude: AppInfo
    vscode: AppInfo
    windsurf: AppInfo
  }>
  // Connection status management
  updateConnectionStatus: (connected: boolean) => void
  getConnectionStatus: () => Promise<boolean>

  // Lock status management
  getLockStatus: () => Promise<LockStatus>
  setLockStatus: (lockData: LockStatus) => Promise<{ success: boolean }>

  // Biometric authentication API
  biometric: BiometricAPI

  // Master password API
  password: PasswordAPI

  // MCP config management API
  mcpConfig: MCPConfigAPI

  // Proxy management API
  proxy: ProxyAPI

  // Test MCP service connection
  testMCPServer: (address: string, accessToken?: string) => Promise<{
    success: boolean
    message?: string
    error?: string
    statusCode?: number
  }>

  // Dev-only clear all app data API
  clearAllAppData: () => Promise<{
    success: boolean
    error?: string
  }>

  // Window control API
  showWindow: () => Promise<{
    success: boolean
    error?: string
  }>

  focusWindow: () => Promise<{
    success: boolean
    error?: string
  }>
}

interface SocketIOAPI {
  // Create Socket connection (managed in preload)
  createConnection: (
    serverId: string,
    url: string,
    options: any
  ) => { success: boolean; serverId?: string; error?: string }

  // Listen for events
  on: (serverId: string, eventName: string, callback: (...args: any[]) => void) => boolean

  // Remove event listener
  off: (serverId: string, eventName: string, callback: (...args: any[]) => void) => boolean

  // Send event
  emit: (serverId: string, eventName: string, ...args: any[]) => boolean

  // Disconnect
  disconnect: (serverId: string) => boolean

  // Get connection status
  isConnected: (serverId: string) => boolean

  // Get socket ID
  getSocketId: (serverId: string) => string | null
}

interface Window {
  electron: ElectronAPI
  mcpAPI: any
  electronAPI: any
  socketIO: SocketIOAPI
}