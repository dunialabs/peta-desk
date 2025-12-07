/**
 * Capabilities data adapter
 * Convert Socket McpServerCapabilities to dashboard MCPClient format
 */

import type { McpServerCapabilities, ServerConfigWithEnabled } from '@/types/capabilities'

export interface MCPFunction {
  id: string
  name: string
  description: string
  enabled: boolean
  dangerLevel?: number
}

export interface MCPTool {
  name: string
  enabled: boolean
  functions: MCPFunction[]
  dataFunctions: MCPFunction[] // Resources and prompts live here
  serverId?: string // Store the original MCP server ID (e.g. 0832ea0f85a847489dcc396d8211f025)
  allowUserInput?: boolean  // Allow user-provided config
  authType?: number        // Auth type: 1=API Key, 2=OAuth
  configured?: boolean      // Whether configured
  configTemplate?: string   // Config template JSON string (includes authConfig, credentials, etc.)
}

export interface MCPClient {
  id: string
  name: string
  icon: string
  enabled: boolean
  status: 'checking' | 'connected' | 'disconnected'
  statusText: string
  serverName: string
  tools: MCPTool[]
  serversConnected: string
  configId?: string
}

/**
 * Convert McpServerCapabilities to MCPClient array
 *
 * New structure:
 * - Create a top-level "Gateway" client
 * - Each MCP server becomes an "environment" under the Gateway client (represented via tools)
 * - Each server's tools become children
 */
export function convertCapabilitiesToClients(
  capabilities: McpServerCapabilities,
  gatewayServerName?: string
): MCPClient[] {
  // Statistics
  const totalServers = Object.keys(capabilities).length
  const connectedServers = Object.values(capabilities).filter((s) => s.enabled).length

  // Create a unified Gateway client
  const gatewayClient: MCPClient = {
    id: 'gateway-mcp',
    name: gatewayServerName || 'Gateway MCP',
    icon: '🌐', // Gateway icon
    enabled: connectedServers > 0,
    status: connectedServers > 0 ? 'connected' : 'disconnected',
    statusText: `MCP ${connectedServers > 0 ? 'Enabled' : 'Disabled'} / ${totalServers} mcp server available`,
    serverName: gatewayServerName || 'Gateway Server',
    tools: [],
    serversConnected: `${connectedServers}/${totalServers} servers are connected`,
    configId: 'gateway-mcp'
  }

  // Convert each MCP server to an "environment" tool
  Object.entries(capabilities).forEach(([mcpServerId, serverConfig]) => {
    const serverTools: MCPFunction[] = []
    const serverDataFunctions: MCPFunction[] = []

    // Transform tools
    Object.entries(serverConfig.tools || {}).forEach(([toolName, toolConfig]) => {
      serverTools.push({
        id: `${mcpServerId}-${toolName}`,
        name: toolName,
        description: toolConfig.description || '',
        enabled: toolConfig.enabled,
        dangerLevel: toolConfig.dangerLevel
      })
    })

    // Transform resources
    Object.entries(serverConfig.resources || {}).forEach(([resourceName, resourceConfig]) => {
      serverDataFunctions.push({
        id: `${mcpServerId}-resource-${resourceName}`,
        name: resourceName,
        description: resourceConfig.description || '',
        enabled: resourceConfig.enabled,
        dangerLevel: resourceConfig.dangerLevel
      })
    })

    // Transform prompts
    Object.entries(serverConfig.prompts || {}).forEach(([promptName, promptConfig]) => {
      serverDataFunctions.push({
        id: `${mcpServerId}-prompt-${promptName}`,
        name: promptName,
        description: promptConfig.description || '',
        enabled: promptConfig.enabled,
        dangerLevel: promptConfig.dangerLevel
      })
    })

    // Add this MCP server as an "environment tool" to the gateway client
    // Important: keep the original serverId so we can restore correctly
    gatewayClient.tools.push({
      name: serverConfig.serverName,
      enabled: serverConfig.enabled,
      functions: serverTools,
      dataFunctions: serverDataFunctions,
      serverId: mcpServerId, // Store original ID
      allowUserInput: serverConfig.allowUserInput,
      authType: serverConfig.authType,
      configured: serverConfig.configured,
      configTemplate: serverConfig.configTemplate
    })
  })

  return [gatewayClient]
}

/**
 * Convert MCPClient array back to McpServerCapabilities
 *
 * New structure:
 * - In the Gateway client's tools array, each tool represents an MCP server
 * - Each tool's serverId is the original MCP server ID
 * - functions are the server's tools
 * - dataFunctions contain resources and prompts
 */
export function convertClientsToCapabilities(clients: MCPClient[]): McpServerCapabilities {
  const capabilities: McpServerCapabilities = {}

  clients.forEach((client) => {
    // Each Gateway tool represents an MCP server
    client.tools.forEach((mcpServerTool) => {
      // Use the saved serverId as the key
      const serverId = mcpServerTool.serverId || mcpServerTool.name

      const tools: Record<
        string,
        { enabled: boolean; description: string; dangerLevel?: number }
      > = {}
      const resources: Record<string, { enabled: boolean; description: string; dangerLevel?: number }> = {}
      const prompts: Record<string, { enabled: boolean; description: string; dangerLevel?: number }> = {}

      // Convert functions (these are MCP server tools)
      mcpServerTool.functions.forEach((func) => {
        // Extract tool name from id (strip serverId prefix)
        const toolName = func.id.startsWith(`${serverId}-`)
          ? func.id.substring(serverId.length + 1)
          : func.name

        tools[toolName] = {
          enabled: func.enabled,
          description: func.description,
          dangerLevel: func.dangerLevel
        }
      })

      // Convert dataFunctions (resources and prompts)
      mcpServerTool.dataFunctions.forEach((func) => {
        if (func.id.includes('-resource-')) {
          // This is a resource
          const resourceName = func.id.split('-resource-')[1] || func.name
          resources[resourceName] = {
            enabled: func.enabled,
            description: func.description,
            dangerLevel: func.dangerLevel
          }
        } else if (func.id.includes('-prompt-')) {
          // This is a prompt
          const promptName = func.id.split('-prompt-')[1] || func.name
          prompts[promptName] = {
            enabled: func.enabled,
            description: func.description,
            dangerLevel: func.dangerLevel
          }
        }
      })

      capabilities[serverId] = {
        enabled: mcpServerTool.enabled,
        serverName: mcpServerTool.name,
        allowUserInput: mcpServerTool.allowUserInput || false,
        authType: mcpServerTool.authType || 0,
        configured: mcpServerTool.configured,
        configTemplate: mcpServerTool.configTemplate,
        tools,
        resources,
        prompts
      }
    })
  })

  return capabilities
}
