"use client"

import {
  CheckCircle,
  RefreshCw,
  Trash2,
  Computer,
  AppWindow,
  Server,
  Wrench,
  Database,
  Github,
  ChevronRight,
  User,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  Download,
  X,
  Settings,
  Zap,
  Crown,
  Beaker,
  BookOpen,
  Wifi,
  Copy,
  Check,
  HardDrive,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

import { BackupDialog } from "@/components/backup-dialog"
import { ConnectPetaServerDialog } from "@/components/connect-peta-server-dialog"
import { PlaygroundDialog } from "@/components/playground-dialog"
import { ResetTokenDialog } from "@/components/reset-token-dialog"
import { SecuritySettingsDialog } from "@/components/security-settings-dialog"
import { ServerUpdatesDialog } from "@/components/server-updates-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Server status types
type ServerStatus =
  | "connected"
  | "disconnected"
  | "connection-failed"
  | "auth-failed"
  | "owner"
  | "not-joined"
  | "address-error"

// Update types
type UpdateType = "added" | "removed" | "modified"

interface ToolUpdate {
  type: UpdateType
  toolName: string
  description: string
  details?: string
}

// Enhanced server data for logged-in users
const enhancedPetaServers = [
  {
    id: "dev-server",
    name: "Development Server",
    type: "peta",
    status: "owner" as ServerStatus,
    address: "https://dev.peta.io",
    userRole: "Admin",
    autoDiscovered: true,
    hasUpdates: true,
    updates: [
      {
        type: "added" as UpdateType,
        toolName: "Slack Integration",
        description: "New Slack integration tool added",
        details: "Connect to Slack workspaces and send messages",
      },
      {
        type: "modified" as UpdateType,
        toolName: "Web Search",
        description: "Enhanced search capabilities",
        details: "Added support for Bing and DuckDuckGo search engines",
      },
    ] as ToolUpdate[],
    tools: [
      {
        id: "notion-mcp",
        name: "Notion MCP",
        icon: BookOpen,
        enabled: true,
        subFunctions: [
          { name: "Read Personal Pages", enabled: true },
          { name: "Write Personal Pages", enabled: true },
          { name: "Read Shared Pages", enabled: true },
          { name: "Write Shared Pages", enabled: false },
          { name: "Database Query", enabled: true },
          { name: "Database Create Records", enabled: true },
          { name: "Database Update Records", enabled: false },
          { name: "Database Delete Records", enabled: false },
          { name: "Block-level Operations", enabled: true },
          { name: "Workspace Search", enabled: true },
          { name: "Property Management", enabled: false },
        ],
      },
      {
        id: "postgresql-mcp",
        name: "PostgreSQL MCP",
        icon: Database,
        enabled: true,
        subFunctions: [
          { name: "Connect to Main Database", enabled: true },
          { name: "Connect to Analytics Database", enabled: false },
          { name: "Connect to Logs Database", enabled: true },
          { name: "SELECT Queries", enabled: true },
          { name: "INSERT Operations", enabled: true },
          { name: "UPDATE Operations", enabled: false },
          { name: "DELETE Operations", enabled: false },
          { name: "CREATE TABLE", enabled: false },
          { name: "ALTER TABLE", enabled: false },
          { name: "DROP TABLE", enabled: false },
          { name: "Transaction Management", enabled: true },
          { name: "Index Management", enabled: false },
          { name: "Execute Stored Procedures", enabled: true },
        ],
      },
      {
        id: "github-mcp",
        name: "GitHub MCP",
        icon: Github,
        enabled: true,
        subFunctions: [
          { name: "Read Public Repositories", enabled: true },
          { name: "Read Private Repositories", enabled: true },
          { name: "Write to Owned Repositories", enabled: true },
          { name: "Write as Collaborator", enabled: false },
          { name: "Read Issues", enabled: true },
          { name: "Create Issues", enabled: true },
          { name: "Modify Issues", enabled: false },
          { name: "Read Pull Requests", enabled: true },
          { name: "Create Pull Requests", enabled: false },
          { name: "Review Pull Requests", enabled: false },
          { name: "Create Branches", enabled: false },
          { name: "File Operations (CRUD)", enabled: true },
          { name: "Manage Webhooks", enabled: false },
          { name: "Trigger GitHub Actions", enabled: false },
        ],
      },
    ],
  },
  {
    id: "staging-env",
    name: "Staging Environment",
    type: "peta",
    status: "connection-failed" as ServerStatus,
    address: "https://staging.peta.io",
    userRole: "Member",
    autoDiscovered: true,
    hasUpdates: false,
    updates: [] as ToolUpdate[],
    tools: [
      {
        id: "notion-mcp-staging",
        name: "Notion MCP",
        icon: BookOpen,
        enabled: true,
        subFunctions: [
          { name: "Read Personal Pages", enabled: true },
          { name: "Write Personal Pages", enabled: false },
          { name: "Read Shared Pages", enabled: true },
          { name: "Database Query", enabled: true },
          { name: "Block-level Operations", enabled: false },
        ],
      },
      {
        id: "postgresql-mcp-staging",
        name: "PostgreSQL MCP",
        icon: Database,
        enabled: false,
        subFunctions: [
          { name: "Connect to Main Database", enabled: false },
          { name: "SELECT Queries", enabled: false },
          { name: "Transaction Management", enabled: false },
        ],
      },
    ],
  },
  {
    id: "prod-cluster",
    name: "Production Cluster",
    type: "peta",
    status: "auth-failed" as ServerStatus,
    address: "https://prod.peta.io",
    userRole: "Admin",
    autoDiscovered: true,
    hasUpdates: true,
    updates: [
      {
        type: "removed" as UpdateType,
        toolName: "Legacy API",
        description: "Legacy API tool has been deprecated",
        details: "This tool is no longer supported and should be removed from clients",
      },
      {
        type: "added" as UpdateType,
        toolName: "Advanced Analytics",
        description: "New analytics and reporting tool",
        details: "Comprehensive analytics dashboard with real-time metrics",
      },
    ] as ToolUpdate[],
    tools: [
      {
        id: "notion-mcp-prod",
        name: "Notion MCP",
        icon: BookOpen,
        enabled: false,
        subFunctions: [
          { name: "Read Personal Pages", enabled: false },
          { name: "Read Shared Pages", enabled: false },
          { name: "Database Query", enabled: false },
        ],
      },
      {
        id: "postgresql-mcp-prod",
        name: "PostgreSQL MCP",
        icon: Database,
        enabled: true,
        subFunctions: [
          { name: "Connect to Main Database", enabled: true },
          { name: "SELECT Queries", enabled: true },
          { name: "INSERT Operations", enabled: false },
          { name: "Transaction Management", enabled: true },
        ],
      },
      {
        id: "github-mcp-prod",
        name: "GitHub MCP",
        icon: Github,
        enabled: true,
        subFunctions: [
          { name: "Read Public Repositories", enabled: true },
          { name: "Read Private Repositories", enabled: true },
          { name: "Read Issues", enabled: true },
          { name: "File Operations (CRUD)", enabled: false },
        ],
      },
    ],
  },
]

// Basic server data for guest users
const basicPetaServers = [
  {
    id: "dev-server",
    name: "Development Server",
    type: "peta",
    status: "connected" as ServerStatus,
    address: "https://dev.peta.io",
    hasUpdates: false,
    updates: [] as ToolUpdate[],
    tools: [
      {
        id: "notion-mcp-basic",
        name: "Notion MCP",
        icon: BookOpen,
        enabled: true,
        subFunctions: [
          { name: "Read Personal Pages", enabled: true },
          { name: "Database Query", enabled: true },
          { name: "Workspace Search", enabled: true },
        ],
      },
      {
        id: "github-mcp-basic",
        name: "GitHub MCP",
        icon: Github,
        enabled: true,
        subFunctions: [
          { name: "Read Public Repositories", enabled: true },
          { name: "Read Issues", enabled: true },
          { name: "Read Pull Requests", enabled: false },
        ],
      },
    ],
  },
  {
    id: "staging-env",
    name: "Staging Environment",
    type: "peta",
    status: "disconnected" as ServerStatus,
    address: "https://staging.peta.io",
    hasUpdates: true,
    updates: [
      {
        type: "added" as UpdateType,
        toolName: "New Feature",
        description: "A new tool has been added",
        details: "Enhanced functionality available",
      },
    ] as ToolUpdate[],
    tools: [
      {
        id: "postgresql-mcp-staging-basic",
        name: "PostgreSQL MCP",
        icon: Database,
        enabled: true,
        subFunctions: [
          { name: "SELECT Queries", enabled: true },
          { name: "Transaction Management", enabled: true },
        ],
      },
    ],
  },
]

const claudeOtherServers = [
  {
    id: "legacy-api",
    name: "Legacy API Server",
    type: "other",
    status: "connected" as ServerStatus,
    address: "https://legacy-api.example.com",
    hasUpdates: false,
    updates: [] as ToolUpdate[],
    tools: [
      {
        id: "legacy-tools",
        name: "Legacy Tools",
        icon: Wrench,
        enabled: true,
        subFunctions: [
          { name: "Legacy API v1", enabled: true },
          { name: "Legacy API v2", enabled: false },
        ],
      },
    ],
  },
]

const cursorOtherServers = [
  {
    id: "code-analysis",
    name: "Code Analysis Server",
    type: "other",
    status: "connected" as ServerStatus,
    address: "https://code-analysis.example.com",
    hasUpdates: false,
    updates: [] as ToolUpdate[],
    tools: [
      {
        id: "code-analyzer",
        name: "Code Analyzer",
        icon: Wrench,
        enabled: true,
        subFunctions: [
          { name: "Syntax Analysis", enabled: true },
          { name: "Performance Analysis", enabled: false },
          { name: "Security Scan", enabled: true },
        ],
      },
    ],
  },
]

export default function ClientManagementPage() {
  const [showDiscovery, setShowDiscovery] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [addedServers, setAddedServers] = useState<any[]>([])
  const [showUpdatesNotification, setShowUpdatesNotification] = useState(true)
  const [isSyncingAll, setIsSyncingAll] = useState(false)
  const [forceScenario, setForceScenario] = useState<"simple" | "standard" | "no-client" | "client-no-server" | null>("simple")
  const [testingScenario, setTestingScenario] = useState<"no-client" | "client-no-server" | "normal" | null>(null)
  const [resetTokenDialog, setResetTokenDialog] = useState<{
    open: boolean
    serverName: string
    serverAddress: string
    clientIndex: number
    serverId: string
  }>({
    open: false,
    serverName: "",
    serverAddress: "",
    clientIndex: -1,
    serverId: "",
  })
  const [updatesDialog, setUpdatesDialog] = useState<{
    open: boolean
    servers: any[]
  }>({
    open: false,
    servers: [],
  })
  const [selectedClientIndex, _setSelectedClientIndex] = useState(0)
  const [selectedClientTab, setSelectedClientTab] = useState("claude-desktop")
  const [testingConnectivity, setTestingConnectivity] = useState<{ [key: string]: boolean }>({})
  const [newlyDetectedClients, setNewlyDetectedClients] = useState<string[]>([])
  const [showNewClientNotification, setShowNewClientNotification] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if master password has been entered
    const masterAuth = localStorage.getItem("clientManagementMasterAuth")
    if (!masterAuth) {
      // Redirect to master password page
      router.push("/client-management/master-password")
      return
    }

    // Check if user is logged in or in guest mode
    const authStatus = localStorage.getItem("clientManagementAuth")
    setIsLoggedIn(authStatus === "true")
    setIsLoading(false)

    // Show discovery dialog for first-time users
    const hasVisited = localStorage.getItem("hasVisitedClientManagement")
    if (!hasVisited) {
      setShowDiscovery(true)
      localStorage.setItem("hasVisitedClientManagement", "true")
    }

    // Check for newly installed clients
    checkForNewClients()
  }, [router])

  // Use enhanced data if logged in, basic data if guest
  const petaServers = isLoggedIn ? enhancedPetaServers : basicPetaServers

  const [clients, setClients] = useState([
    {
      id: "claude-desktop",
      name: "Claude Desktop",
      type: "claude",
      icon: Computer,
      detection: "Auto-detected",
      enabled: true,
      servers: [...petaServers, ...claudeOtherServers],
      isOpen: false,
      expandedTools: new Set(),
      expandedServers: new Set(),
    },
    {
      id: "cursor",
      name: "Cursor",
      type: "cursor",
      icon: AppWindow,
      detection: "Auto-detected",
      enabled: true,
      servers: [...petaServers, ...cursorOtherServers],
      isOpen: false,
      expandedTools: new Set(),
      expandedServers: new Set(),
    },
    {
      id: "manual-client",
      name: "Manual Client",
      type: "custom",
      icon: Computer,
      detection: "Manual Added",
      enabled: false,
      servers: [petaServers[0]],
      isOpen: false,
      expandedTools: new Set(),
      expandedServers: new Set(),
    },
  ])

  // Update clients when servers are added
  useEffect(() => {
    if (addedServers.length > 0) {
      setClients((prev) =>
        prev.map((client) => ({
          ...client,
          servers: [...client.servers, ...addedServers],
        })),
      )
    }
  }, [addedServers])

  // Detect layout scenario
  const enabledClients = clients.filter((client) => client.enabled)
  const allServers = [...petaServers, ...addedServers]
  const petaServerCount = allServers.filter((server) => server.type === "peta").length
  const otherServerCount = allServers.filter((server) => server.type === "other").length

  // Scenario detection with manual override and testing scenarios
  const actualScenario = (() => {
    if (testingScenario === "no-client") return "no-client"
    if (testingScenario === "client-no-server") return "client-no-server"
    const isSimpleScenario = enabledClients.length === 1 && petaServerCount === 1 && otherServerCount === 0
    return isSimpleScenario ? "simple" : "standard"
  })()

  const scenario = forceScenario || actualScenario

  // Get servers with updates
  const getServersWithUpdates = () => {
    const allServers = [...petaServers, ...addedServers]
    return allServers.filter((server) => server.type === "peta" && server.hasUpdates)
  }

  const serversWithUpdates = getServersWithUpdates()

  const getStatusInfo = (status: ServerStatus) => {
    switch (status) {
      case "connected":
        return {
          label: "Connected",
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          icon: CheckCircle,
          iconColor: "text-emerald-600",
        }
      case "owner":
        return {
          label: "Owner",
          color: "text-purple-700 bg-purple-50 border-purple-200",
          icon: Crown,
          iconColor: "text-purple-600",
        }
      case "disconnected":
        return {
          label: "Connect",
          color: "text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100",
          icon: Clock,
          iconColor: "text-slate-500",
        }
      case "not-joined":
        return {
          label: "Not Joined",
          color: "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100",
          icon: Clock,
          iconColor: "text-blue-500",
        }
      case "connection-failed":
        return {
          label: "Connection Failed",
          color: "text-red-700 bg-red-50 border-red-200",
          icon: XCircle,
          iconColor: "text-red-600",
        }
      case "auth-failed":
        return {
          label: "Auth Failed",
          color: "text-red-700 bg-red-50 border-red-200 hover:bg-red-100",
          icon: AlertTriangle,
          iconColor: "text-red-600",
        }
      case "address-error":
        return {
          label: "Address Error",
          color: "text-red-700 bg-red-50 border-red-200 hover:bg-red-100",
          icon: XCircle,
          iconColor: "text-red-600",
        }
      default:
        return {
          label: "Unknown",
          color: "text-slate-600 bg-slate-50 border-slate-200",
          icon: Clock,
          iconColor: "text-slate-500",
        }
    }
  }

  const handleServerStatusClick = (clientIndex: number, serverId: string, status: ServerStatus) => {
    const client = clients[clientIndex]
    const server = client.servers.find((s) => s.id === serverId)

    if (!server) return

    if (status === "auth-failed" || status === "not-joined" || status === "address-error") {
      // Show reset token dialog for authentication failed servers
      setResetTokenDialog({
        open: true,
        serverName: server.name,
        serverAddress: server.address || "",
        clientIndex,
        serverId,
      })
    } else if (status === "disconnected") {
      // Toggle connection for disconnected servers
      toggleServerConnection(clientIndex, serverId)
    }
  }

  const handleViewUpdates = () => {
    setUpdatesDialog({
      open: true,
      servers: serversWithUpdates,
    })
  }

  const handleSyncAllClients = async () => {
    setIsSyncingAll(true)

    // Simulate sync process
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Clear updates for all servers
    setClients((prev) =>
      prev.map((client) => ({
        ...client,
        servers: client.servers.map((server) =>
          server.type === "peta" && server.hasUpdates ? { ...server, hasUpdates: false, updates: [] } : server,
        ),
      })),
    )

    setIsSyncingAll(false)
    setShowUpdatesNotification(false)
  }

  const handleResetToken = async (_newToken: string) => {
    // Simulate API call to reset token
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Update server status to connected after successful token reset
    setClients((prev) =>
      prev.map((client, index) =>
        index === resetTokenDialog.clientIndex
          ? {
              ...client,
              servers: client.servers.map((server) =>
                server.id === resetTokenDialog.serverId ? { ...server, status: "connected" as ServerStatus } : server,
              ),
            }
          : client,
      ),
    )
  }

  const _handleLoginRequired = () => {
    // Redirect to login page
    router.push("/client-management/login-prompt")
  }

  const handleSecuritySettings = (settings: any) => {
    console.log("Applying global security settings:", settings)
    // Here you would apply the settings globally
  }

  const _toggleClient = (clientIndex: number) => {
    setClients((prev) =>
      prev.map((client, index) => (index === clientIndex ? { ...client, isOpen: !client.isOpen } : client)),
    )
  }

  const toggleClientEnabled = (clientIndex: number) => {
    setClients((prev) =>
      prev.map((client, index) => (index === clientIndex ? { ...client, enabled: !client.enabled } : client)),
    )
  }

  const toggleServerConnection = (clientIndex: number, serverId: string) => {
    setClients((prev) =>
      prev.map((client, index) =>
        index === clientIndex
          ? {
              ...client,
              servers: client.servers.map((server) =>
                server.id === serverId
                  ? {
                      ...server,
                      status: server.status === "connected" ? "disconnected" : "connected",
                    }
                  : server,
              ),
            }
          : client,
      ),
    )
  }

  const toggleToolEnabled = (clientIndex: number, serverId: string, toolId: string) => {
    setClients((prev) =>
      prev.map((client, index) =>
        index === clientIndex
          ? {
              ...client,
              servers: client.servers.map((server) =>
                server.id === serverId
                  ? {
                      ...server,
                      tools: server.tools.map((tool) =>
                        tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool,
                      ),
                    }
                  : server,
              ),
            }
          : client,
      ),
    )
  }

  const toggleToolExpansion = (clientIndex: number, toolId: string) => {
    setClients((prev) =>
      prev.map((client, index) => {
        if (index === clientIndex) {
          const newExpandedTools = new Set(client.expandedTools)
          if (newExpandedTools.has(toolId)) {
            newExpandedTools.delete(toolId)
          } else {
            newExpandedTools.add(toolId)
          }
          return { ...client, expandedTools: newExpandedTools }
        }
        return client
      }),
    )
  }

  const toggleServerExpansion = (clientIndex: number, serverId: string) => {
    setClients((prev) =>
      prev.map((client, index) => {
        if (index === clientIndex) {
          const newExpandedServers = new Set(client.expandedServers)
          if (newExpandedServers.has(serverId)) {
            newExpandedServers.delete(serverId)
          } else {
            newExpandedServers.add(serverId)
          }
          return { ...client, expandedServers: newExpandedServers }
        }
        return client
      }),
    )
  }

  const _getConnectedServersCount = (servers: any[]) => {
    return servers.filter((server) => server.status === "connected" || server.status === "owner").length
  }

  const getToolCounts = (server: any) => {
    const totalTools = server.tools.length
    const enabledTools = server.tools.filter((tool: any) => tool.enabled).length
    return { total: totalTools, enabled: enabledTools }
  }

  const handleConnectServers = (servers: any[]) => {
    setAddedServers((prev) => [...prev, ...servers])
  }

  const checkForNewClients = () => {
    // Simulate detection of new clients
    const lastClientCheck = localStorage.getItem("lastClientCheck")
    const currentTime = Date.now()
    
    if (!lastClientCheck || currentTime - parseInt(lastClientCheck) > 10000) { // Check every 10 seconds for demo
      // Simulate random chance of detecting new client
      if (Math.random() > 0.85) { // 15% chance of detecting new client
        const possibleClients = ["Visual Studio Code", "Zed", "Sublime Text"]
        const newClient = possibleClients[Math.floor(Math.random() * possibleClients.length)]
        
        if (!newlyDetectedClients.includes(newClient)) {
          setNewlyDetectedClients(prev => [...prev, newClient])
          setShowNewClientNotification(true)
        }
      }
      localStorage.setItem("lastClientCheck", currentTime.toString())
    }
  }

  const handleCopyJSON = async () => {
    const currentClient = clients[selectedClientIndex] || clients.find(c => c.enabled)
    if (!currentClient) return

    const configJSON = {
      "mcpServers": {
        ...currentClient.servers.reduce((acc, server) => {
          acc[server.id] = {
            "command": "peta-mcp-server",
            "args": ["--server-url", server.address],
            "env": {
              "PETA_API_TOKEN": "your-token-here"
            }
          }
          return acc
        }, {} as any)
      }
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(configJSON, null, 2))
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const handleAddNewClient = (clientName: string) => {
    // Add the new client to the clients list
    const newClient = {
      id: clientName.toLowerCase().replace(/\s+/g, '-'),
      name: clientName,
      type: "custom",
      icon: Computer,
      detection: "Recently Added",
      enabled: true,
      servers: [petaServers[0]], // Add first Peta server by default
      isOpen: false,
      expandedTools: new Set(),
      expandedServers: new Set(),
    }
    
    setClients(prev => [...prev, newClient])
    setNewlyDetectedClients(prev => prev.filter(name => name !== clientName))
    if (newlyDetectedClients.length <= 1) {
      setShowNewClientNotification(false)
    }
  }

  const handleTestServerConnectivity = async (clientIndex: number, serverId: string) => {
    const testKey = `${clientIndex}-${serverId}`
    setTestingConnectivity(prev => ({ ...prev, [testKey]: true }))

    // Simulate connectivity test
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Update server status based on test result (simulate random results)
    const testPassed = Math.random() > 0.3 // 70% success rate
    const newStatus = testPassed ? "connected" : "connection-failed"

    setClients((prev) =>
      prev.map((client, index) =>
        index === clientIndex
          ? {
              ...client,
              servers: client.servers.map((server) =>
                server.id === serverId ? { ...server, status: newStatus as ServerStatus } : server,
              ),
            }
          : client,
      ),
    )

    setTestingConnectivity(prev => ({ ...prev, [testKey]: false }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  // Combine all servers for discovery dialog
  const allDiscoveredServers = [...petaServers, ...claudeOtherServers, ...cursorOtherServers]

  // Simple Scenario Render (1 Client + 1 Peta Server + No Other Servers)
  const renderSimpleScenario = () => {
    const client = enabledClients[selectedClientIndex] || enabledClients[0]
    const petaServers = client.servers.filter((s) => s.type === "peta")
    const otherServers = client.servers.filter((s) => s.type === "other")
    const allServers = [...petaServers, ...otherServers]

    return (
      <div className="space-y-6">
        {/* Quick Setup Card */}
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="space-y-4">
            {/* Client Selection */}
            <div className="bg-white dark:bg-gray-900/60 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <client.icon className="w-5 h-5 text-slate-700" />
                  <span className="font-medium text-slate-900">{client.name}</span>
                  <Badge
                    variant={client.detection === "Auto-detected" ? "default" : "secondary"}
                    className={cn(
                      "text-xs font-medium",
                      client.detection === "Auto-detected"
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-600 border-slate-200",
                    )}
                  >
                    {client.detection}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1.5" />
                    Apply to Client
                  </Button>
                  <Switch
                    checked={client.enabled}
                    onCheckedChange={() => toggleClientEnabled(selectedClientIndex)}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Tools Configuration - simplified layout */}
            <div className="bg-white dark:bg-gray-900/60 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Tool Configuration</h3>
                <Badge className="bg-green-100 text-green-800 border-green-200">Auto-Configured</Badge>
              </div>

              {allServers.map((server) => (
                <div key={server.id} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Server className="w-4 h-4 text-slate-600" />
                        {server.status === "owner" && (
                          <Crown className="w-3 h-3 text-purple-600 absolute -top-1 -right-1" />
                        )}
                      </div>
                      <span className="font-medium text-slate-900">{server.name}</span>
                      <Badge
                        variant={server.type === "peta" ? "default" : "secondary"}
                        className={cn(
                          "text-xs font-medium",
                          server.type === "peta"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-600 border-slate-200",
                        )}
                      >
                        {server.type === "peta" ? "Peta" : "Other"}
                      </Badge>
                      {/* Server Status Indicator */}
                      {(() => {
                        const statusInfo = getStatusInfo(server.status)
                        const StatusIcon = statusInfo.icon
                        return (
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-medium px-2 py-0.5", statusInfo.color)}
                          >
                            <StatusIcon className={cn("w-3 h-3 mr-1", statusInfo.iconColor)} />
                            {statusInfo.label}
                          </Badge>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs font-medium px-2 h-7 gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100"
                              onClick={() => handleTestServerConnectivity(selectedClientIndex, server.id)}
                              disabled={testingConnectivity[`${selectedClientIndex}-${server.id}`]}
                            >
                              {testingConnectivity[`${selectedClientIndex}-${server.id}`] ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <Wifi className="w-3 h-3 text-slate-600" />
                                  Test
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            Test connectivity to this MCP server
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Switch
                        checked={server.tools.some((tool: any) => tool.enabled)}
                        onCheckedChange={(checked) => {
                          // Toggle all tools for this server
                          server.tools.forEach((tool: any) => {
                            if (tool.enabled !== checked) {
                              toggleToolEnabled(selectedClientIndex, server.id, tool.id)
                            }
                          })
                        }}
                        disabled={server.status !== "connected" && server.status !== "owner"}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>

                  {/* Tool list - one per row */}
                  <div className="space-y-2">
                    {server.tools.map((tool: any) => (
                      <div key={tool.id} className="bg-white dark:bg-gray-900/50 rounded border border-slate-200">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-2">
                            <tool.icon className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-medium text-slate-900">{tool.name}</span>
                            {tool.subFunctions && tool.subFunctions.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-5 h-5 p-0 hover:bg-slate-200"
                                onClick={() => toggleToolExpansion(selectedClientIndex, tool.id)}
                              >
                                <ChevronRight
                                  className={cn(
                                    "w-3 h-3 transition-transform text-slate-400",
                                    client.expandedTools.has(tool.id) && "rotate-90",
                                  )}
                                />
                              </Button>
                            )}
                          </div>
                          <Switch
                            checked={tool.enabled}
                            onCheckedChange={() => toggleToolEnabled(selectedClientIndex, server.id, tool.id)}
                            size="sm"
                            disabled={server.status !== "connected" && server.status !== "owner"}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>
                        {client.expandedTools.has(tool.id) && tool.subFunctions && (
                          <div className="px-3 pb-3 space-y-1">
                            {tool.subFunctions.map((subFunc: any, subIndex: number) => (
                              <div key={subIndex} className="flex items-center justify-between p-2 rounded bg-slate-50">
                                <span className="text-xs text-slate-600">{subFunc.name}</span>
                                <Switch
                                  checked={subFunc.enabled}
                                  size="sm"
                                  disabled={server.status !== "connected" && server.status !== "owner"}
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Standard Scenario Render (formerly Advanced Setup)
  const renderStandardScenario = () => {
    return (
      <div className="space-y-4">
        {/* Client Tabs */}
        <Tabs value={selectedClientTab} onValueChange={setSelectedClientTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {clients.map((client, clientIndex) => (
              <TabsTrigger key={client.id} value={client.id} className="flex items-center gap-2 relative group">
                <client.icon className="w-4 h-4" />
                <span>{client.name}</span>
                <Badge
                  variant={client.detection === "Auto-detected" ? "default" : "secondary"}
                  className={cn(
                    "text-xs font-medium",
                    client.detection === "Auto-detected"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-600 border-slate-200",
                  )}
                >
                  {client.detection === "Auto-detected" && <CheckCircle className="w-3 h-3 mr-1" />}
                  {client.detection}
                </Badge>

                {/* Action buttons in dropdown - show on active tab */}
                {selectedClientTab === client.id && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-slate-700">Enable</span>
                      <Switch
                        checked={client.enabled}
                        onCheckedChange={() => toggleClientEnabled(clientIndex)}
                        className="data-[state=checked]:bg-slate-900"
                        size="sm"
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-6 h-6 p-0 hover:bg-slate-100">
                          <Settings className="w-3 h-3 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {}}>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Sync Client
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {}} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {clients.map((client, clientIndex) => (
            <TabsContent key={client.id} value={client.id}>
              <Card className="border border-slate-200 shadow-sm">
                {/* Remove the Client Header section entirely */}

                {/* Client Content */}
                <div className="p-4 bg-slate-50/50">
                  <div className="space-y-3">
                    {client.servers.map((server) => {
                      const toolCounts = getToolCounts(server)
                      const statusInfo = getStatusInfo(server.status)
                      const StatusIcon = statusInfo.icon

                      return (
                        <Card key={server.id} className="border border-slate-200 bg-white dark:bg-gray-900 shadow-sm">
                          <CardContent className="p-3">
                            {/* Server Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-5 h-5 p-0 hover:bg-slate-100"
                                  onClick={() => toggleServerExpansion(clientIndex, server.id)}
                                >
                                  <ChevronRight
                                    className={cn(
                                      "w-3 h-3 transition-transform text-slate-400",
                                      client.expandedServers.has(server.id) && "rotate-90",
                                    )}
                                  />
                                </Button>
                                <div className="relative">
                                  <Server className="w-3 h-3 text-slate-600" />
                                  {server.status === "owner" && (
                                    <Crown className="w-2 h-2 text-purple-600 absolute -top-1 -right-1" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-slate-900">{server.name}</span>
                                    <span className="text-xs text-slate-500">
                                      {toolCounts.enabled}/{toolCounts.total} tools
                                    </span>
                                    <Badge
                                      variant={server.type === "peta" ? "default" : "secondary"}
                                      className={cn(
                                        "text-xs font-medium",
                                        server.type === "peta"
                                          ? "bg-blue-100 text-blue-700 border-blue-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200",
                                      )}
                                    >
                                      {server.type === "peta" ? "Peta" : "Other"}
                                    </Badge>
                                    {isLoggedIn && server.type === "peta" && (server as any).autoDiscovered && (
                                      <Badge className="text-xs font-medium bg-emerald-100 text-emerald-700 border-emerald-200">
                                        Auto
                                      </Badge>
                                    )}
                                    {isLoggedIn && server.type === "peta" && (server as any).userRole && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs font-medium bg-slate-50 text-slate-600 border-slate-200"
                                      >
                                        {(server as any).userRole}
                                      </Badge>
                                    )}
                                    {server.status === "owner" && (
                                      <Badge className="text-xs font-medium bg-purple-100 text-purple-700 border-purple-200">
                                        <Crown className="w-3 h-3 mr-1" />
                                        Owner
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs font-medium px-2 h-7 gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100"
                                        onClick={() => handleTestServerConnectivity(clientIndex, server.id)}
                                        disabled={testingConnectivity[`${clientIndex}-${server.id}`]}
                                      >
                                        {testingConnectivity[`${clientIndex}-${server.id}`] ? (
                                          <>
                                            <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                            Testing...
                                          </>
                                        ) : (
                                          <>
                                            <Wifi className="w-3 h-3 text-slate-600" />
                                            Test
                                          </>
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                      Test connectivity to all MCP servers for this client
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                          "text-xs font-medium px-2 h-7 gap-1.5 border",
                                          statusInfo.color,
                                          server.status === "connection-failed" && "cursor-not-allowed opacity-60",
                                        )}
                                        onClick={() => handleServerStatusClick(clientIndex, server.id, server.status)}
                                        disabled={server.status === "connection-failed"}
                                      >
                                        <StatusIcon className={cn("w-3 h-3", statusInfo.iconColor)} />
                                        {statusInfo.label}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                      {server.status === "connected" && "Server is connected and ready"}
                                      {server.status === "owner" && "You own this server"}
                                      {server.status === "disconnected" && "Click to connect to server"}
                                      {server.status === "not-joined" && "Click to join this server"}
                                      {server.status === "connection-failed" && "Server address is unreachable"}
                                      {server.status === "auth-failed" && "Click to reset authentication token"}
                                      {server.status === "address-error" && "Click for connection help"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>

                            {/* Server Tools */}
                            <Collapsible open={client.expandedServers.has(server.id)}>
                              <CollapsibleContent>
                                <div className="ml-5 space-y-2 pt-2 border-t border-slate-100">
                                  {server.tools.map((tool: any) => (
                                    <div key={tool.id}>
                                      <div className="flex items-center justify-between p-2 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-2 flex-1">
                                          <tool.icon className="w-3 h-3 text-slate-600" />
                                          <span className="text-xs font-medium text-slate-900">{tool.name}</span>
                                          {tool.subFunctions && tool.subFunctions.length > 0 && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="w-4 h-4 p-0 hover:bg-slate-200"
                                              onClick={() => toggleToolExpansion(clientIndex, tool.id)}
                                            >
                                              <ChevronRight
                                                className={cn(
                                                  "w-2 h-2 transition-transform text-slate-400",
                                                  client.expandedTools.has(tool.id) && "rotate-90",
                                                )}
                                              />
                                            </Button>
                                          )}
                                        </div>
                                        <Switch
                                          checked={tool.enabled}
                                          onCheckedChange={() => toggleToolEnabled(clientIndex, server.id, tool.id)}
                                          size="sm"
                                          disabled={server.status !== "connected" && server.status !== "owner"}
                                          className="data-[state=checked]:bg-slate-900"
                                        />
                                      </div>
                                      {client.expandedTools.has(tool.id) && tool.subFunctions && (
                                        <div className="ml-5 mt-1 space-y-1">
                                          {tool.subFunctions.map((subFunc: any, subIndex: number) => (
                                            <div
                                              key={subIndex}
                                              className="flex items-center justify-between p-1.5 rounded bg-slate-100/50"
                                            >
                                              <span className="text-xs text-slate-600">{subFunc.name}</span>
                                              <Switch
                                                checked={subFunc.enabled}
                                                size="sm"
                                                disabled={server.status !== "connected" && server.status !== "owner"}
                                                className="data-[state=checked]:bg-slate-900"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  // No Client Detected Scenario
  const renderNoClientScenario = () => {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
              <Computer className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-orange-900 mb-2">No MCP Clients Detected</h2>
              <p className="text-sm text-orange-700 mb-4">
                We couldn&apos;t find any supported MCP clients on your system. Install one of the supported clients to get started.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <Card className="p-4 border border-orange-200 bg-white dark:bg-gray-900/60">
                <div className="text-center space-y-2">
                  <Computer className="w-6 h-6 mx-auto text-slate-700" />
                  <p className="font-medium">Claude Desktop</p>
                  <Button size="sm" variant="outline" className="w-full">
                    Download
                  </Button>
                </div>
              </Card>
              <Card className="p-4 border border-orange-200 bg-white dark:bg-gray-900/60">
                <div className="text-center space-y-2">
                  <AppWindow className="w-6 h-6 mx-auto text-slate-700" />
                  <p className="font-medium">Cursor</p>
                  <Button size="sm" variant="outline" className="w-full">
                    Download
                  </Button>
                </div>
              </Card>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={() => setTestingScenario(null)}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Refresh Detection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Client Detected but No Server Scenario
  const renderClientNoServerScenario = () => {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Computer className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-purple-900 mb-2">Client Detected, No Servers</h2>
              <p className="text-sm text-purple-700">
                We found MCP clients but no servers are configured. Add a server to start using MCP tools.
              </p>
            </div>
            
            {/* Detected Clients */}
            <div className="bg-white dark:bg-gray-900/60 rounded-lg p-4 border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-3">Detected Clients</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-900/50 rounded border">
                  <Computer className="w-4 h-4 text-slate-700" />
                  <span className="font-medium">Claude Desktop</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">Ready</Badge>
                </div>
                <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-900/50 rounded border">
                  <AppWindow className="w-4 h-4 text-slate-700" />
                  <span className="font-medium">Cursor</span>
                  <Badge className="bg-green-100 text-green-800 border-green-200">Ready</Badge>
                </div>
              </div>
            </div>
            
            {/* Add Server Options */}
            <div className="bg-white dark:bg-gray-900/60 rounded-lg p-4 border border-purple-200">
              <h3 className="font-medium text-purple-900 mb-3">Add Your First Server</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Add Peta Server
                </Button>
                <Button variant="outline" className="border-purple-200 hover:bg-purple-50 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Add Other Server
                </Button>
              </div>
            </div>
            
            <div className="pt-2 text-center">
              <Button 
                variant="ghost"
                onClick={() => setTestingScenario(null)}
                className="text-purple-600 hover:text-purple-700"
              >
                Refresh Detection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-slate-900">Peta Desk</h1>
              {!isLoggedIn && (
                <Badge variant="secondary" className="text-xs font-medium bg-slate-100 text-slate-600 border-slate-200">
                  <User className="w-3 h-3 mr-1" />
                  Guest Mode
                </Badge>
              )}
              {/* Scenario Indicator */}
              <Badge variant="outline" className="text-xs font-medium bg-slate-50 text-slate-600 border-slate-300">
                {scenario === "simple" && "Simple Setup"}
                {scenario === "standard" && "Standard Setup"}
                {scenario === "no-client" && "No Client Detected"}
                {scenario === "client-no-server" && "Client Ready"}
              </Badge>
            </div>
            <p className="text-sm text-slate-600">
              {scenario === "simple" && "Your basic MCP connection is ready to use"}
              {scenario === "standard" && "Manage multiple clients and server connections"}
              {scenario === "no-client" && "Install a supported MCP client to get started"}
              {scenario === "client-no-server" && "Add your first MCP server to begin"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Scenario Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs font-medium bg-transparent">
                <Beaker className="w-3 h-3 mr-1.5" />
                {testingScenario === "no-client" && "No Client"}
                {testingScenario === "client-no-server" && "Client No Server"}
                {testingScenario === "normal" && "Normal"}
                {!testingScenario && (forceScenario ? (forceScenario === "simple" ? "Simple Setup" : "Standard Setup") : "Auto Detect")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setTestingScenario("no-client"); setForceScenario(null) }}>
                <Computer className="w-4 h-4 mr-2" />
                Test: No Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTestingScenario("client-no-server"); setForceScenario(null) }}>
                <Server className="w-4 h-4 mr-2" />
                Test: Client No Server
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTestingScenario("normal"); setForceScenario(null) }}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Test: Normal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTestingScenario(null); setForceScenario("simple") }}>
                <Zap className="w-4 h-4 mr-2" />
                Simple Setup
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTestingScenario(null); setForceScenario("standard") }}>
                <Settings className="w-4 h-4 mr-2" />
                Standard Setup
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setTestingScenario(null); setForceScenario(null) }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Auto Detect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConnectPetaServerDialog onConnect={handleConnectServers} />
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs font-medium bg-transparent"
            onClick={handleCopyJSON}
          >
            {copiedToClipboard ? (
              <>
                <Check className="w-3 h-3 mr-1.5 text-green-600 dark:text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1.5" />
                Copy JSON
              </>
            )}
          </Button>
          <PlaygroundDialog>
            <Button variant="outline" size="sm" className="text-xs font-medium bg-transparent">
              <Play className="w-3 h-3 mr-1.5" />
              Playground
            </Button>
          </PlaygroundDialog>
          <SecuritySettingsDialog onApplySettings={handleSecuritySettings} />
          <BackupDialog>
            <Button variant="outline" size="sm" className="text-xs font-medium bg-transparent">
              <HardDrive className="w-3 h-3 mr-1.5" />
              Backup
            </Button>
          </BackupDialog>
        </div>
      </div>

      {/* Server Updates Notification */}
      {serversWithUpdates.length > 0 && showUpdatesNotification && (
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Server Updates Available</h3>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {serversWithUpdates.length} Peta server{serversWithUpdates.length > 1 ? "s" : ""} ha
                    {serversWithUpdates.length > 1 ? "ve" : "s"} updates that need to be synced to all clients
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {serversWithUpdates.slice(0, 3).map((server, _index) => (
                    <Badge
                      key={server.id}
                      variant="outline"
                      className="text-xs bg-white dark:bg-gray-900/50 text-blue-800 border-blue-300"
                    >
                      {server.name}
                    </Badge>
                  ))}
                  {serversWithUpdates.length > 3 && (
                    <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900/50 text-blue-800 border-blue-300">
                      +{serversWithUpdates.length - 3} more
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs bg-white dark:bg-gray-900/50 hover:bg-white dark:bg-gray-900/80 border-blue-300 text-blue-700 dark:text-blue-300"
                  onClick={handleViewUpdates}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSyncAllClients}
                  disabled={isSyncingAll}
                >
                  {isSyncingAll ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 mr-1.5" />
                      Sync All Clients
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0 hover:bg-white dark:bg-gray-900/50"
                  onClick={() => setShowUpdatesNotification(false)}
                >
                  <X className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Client Detection Notification */}
      {newlyDetectedClients.length > 0 && showNewClientNotification && (
        <Card className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Computer className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-green-900">New MCP Client{newlyDetectedClients.length > 1 ? 's' : ''} Detected</h3>
                  <p className="text-xs text-green-700">
                    We found {newlyDetectedClients.length} new MCP client{newlyDetectedClients.length > 1 ? 's' : ''} on your system
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {newlyDetectedClients.slice(0, 2).map((client, _index) => (
                    <Badge
                      key={client}
                      variant="outline"
                      className="text-xs bg-white dark:bg-gray-900/50 text-green-800 border-green-300"
                    >
                      {client}
                    </Badge>
                  ))}
                  {newlyDetectedClients.length > 2 && (
                    <Badge variant="outline" className="text-xs bg-white dark:bg-gray-900/50 text-green-800 border-green-300">
                      +{newlyDetectedClients.length - 2} more
                    </Badge>
                  )}
                </div>
                {newlyDetectedClients.map((client) => (
                  <Button
                    key={client}
                    size="sm"
                    className="text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleAddNewClient(client)}
                  >
                    Add {client}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0 hover:bg-white dark:bg-gray-900/50"
                  onClick={() => setShowNewClientNotification(false)}
                >
                  <X className="w-3 h-3 text-green-600 dark:text-green-400" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render based on scenario */}
      {scenario === "simple" && renderSimpleScenario()}
      {scenario === "standard" && renderStandardScenario()}
      {scenario === "no-client" && renderNoClientScenario()}
      {scenario === "client-no-server" && renderClientNoServerScenario()}

      {/* Reset Token Dialog */}
      <ResetTokenDialog
        open={resetTokenDialog.open}
        onOpenChange={(open) => setResetTokenDialog((prev) => ({ ...prev, open }))}
        serverName={resetTokenDialog.serverName}
        serverAddress={resetTokenDialog.serverAddress}
        onResetToken={handleResetToken}
      />

      {/* Server Updates Dialog */}
      <ServerUpdatesDialog
        open={updatesDialog.open}
        onOpenChange={(open) => setUpdatesDialog((prev) => ({ ...prev, open }))}
        servers={updatesDialog.servers}
      />

      {/* Discovery Dialog */}
      <AlertDialog open={showDiscovery} onOpenChange={setShowDiscovery}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-lg font-semibold">Discovery Complete!</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-slate-600">
              We&apos;ve scanned your local environment. Here&apos;s what we found.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h3 className="text-sm font-medium mb-3 text-center text-slate-700">Discovered MCP Clients</h3>
              <div className="space-y-2">
                <Card className="p-3 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Computer className="w-4 h-4 text-slate-700" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Claude Desktop</p>
                      <p className="text-xs text-slate-500">Ready to connect</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <AppWindow className="w-4 h-4 text-slate-700" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Cursor</p>
                      <p className="text-xs text-slate-500">Ready to connect</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Combined Available Servers Section */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-center text-slate-700">Available MCP Servers</h3>
              <div className="space-y-2">
                {allDiscoveredServers.map((server, index) => (
                  <Card key={`${server.type}-${server.id}-${index}`} className="p-3 border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Server
                          className={cn("w-4 h-4", server.type === "peta" ? "text-blue-600" : "text-slate-600")}
                        />
                        {server.status === "owner" && (
                          <Crown className="w-3 h-3 text-purple-600 absolute -top-1 -right-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{server.name}</p>
                        <p className="text-xs text-slate-500">{server.address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={server.type === "peta" ? "default" : "secondary"}
                          className={cn(
                            "text-xs font-medium",
                            server.type === "peta"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200",
                          )}
                        >
                          {server.type === "peta" ? "Peta" : "Other"}
                        </Badge>
                        {isLoggedIn && server.type === "peta" && (server as any).autoDiscovered && (
                          <Badge className="text-xs font-medium bg-emerald-100 text-emerald-700 border-emerald-200">
                            Auto
                          </Badge>
                        )}
                        {server.status === "owner" && (
                          <Badge className="text-xs font-medium bg-purple-100 text-purple-700 border-purple-200">
                            <Crown className="w-3 h-3 mr-1" />
                            Owner
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction
              className="w-full text-sm font-medium bg-slate-900 hover:bg-slate-800"
              onClick={() => setShowDiscovery(false)}
            >
              Start Configuring
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
