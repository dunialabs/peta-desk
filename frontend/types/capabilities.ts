/**
 * MCP capability configuration types
 * Aligned with peta-core McpServerCapabilities
 */

/**
 * Tool configuration
 */
export interface ToolConfig {
  enabled: boolean
  description: string
  dangerLevel?: number  // Danger level: 0=safe, 1=warning, 2=danger
}

/**
 * Resource configuration
 */
export interface ResourceConfig {
  enabled: boolean
  description: string
  dangerLevel?: number  // Danger level: 0=safe, 1=warning, 2=danger
}

/**
 * Prompt configuration
 */
export interface PromptConfig {
  enabled: boolean
  description: string
  dangerLevel?: number  // Danger level: 0=safe, 1=warning, 2=danger
}

/**
 * Server configuration
 */
export interface ServerConfigWithEnabled {
  enabled: boolean
  serverName: string
  allowUserInput: boolean  // Allow user-provided configuration
  authType: number        // Auth type: 1=API Key, 2=OAuth
  configured?: boolean     // Whether configured (meaningful only when allowUserInput=true)
  configTemplate?: string  // Config template JSON string (authConfig, credentials, etc.)
  tools: Record<string, ToolConfig>
  resources: Record<string, ResourceConfig>
  prompts: Record<string, PromptConfig>
}

/**
 * MCP server capability configuration (full structure)
 * serverId -> ServerConfig
 */
export type McpServerCapabilities = Record<string, ServerConfigWithEnabled>

/**
 * Capability response (fetched from server)
 */
export interface CapabilitiesResponse {
  capabilities: McpServerCapabilities
}

/**
 * Set capabilities request
 */
export interface SetCapabilitiesRequest {
  requestId: string
  data: McpServerCapabilities
}
