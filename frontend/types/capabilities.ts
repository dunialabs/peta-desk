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

export enum ServerAuthType {
  ApiKey = 1,      // API Key authentication
  GoogleAuth = 2,   // Google OAuth authentication
  NotionAuth = 3,   // Notion OAuth authentication
  FigmaAuth = 4,   // Figma OAuth authentication
  GoogleCalendarAuth = 5,   // Google Calendar OAuth authentication
  GithubAuth = 6,   // Github OAuth authentication
  ZendeskAuth = 7,   // Zendesk OAuth authentication
  CanvasAuth = 8,   // Canvas OAuth authentication
  CanvaAuth = 9,   // Canva OAuth authentication
}

export enum ServerCategory {
  Template = 1,       // template server
  CustomRemote = 2,   // custom remote server
  RestApi = 3,        // RESTful API server
}

/**
 * Server configuration
 */
export interface ServerConfigWithEnabled {
  enabled: boolean
  serverName: string
  allowUserInput: boolean  // Allow user-provided configuration
  authType: ServerAuthType
  category?: ServerCategory
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
