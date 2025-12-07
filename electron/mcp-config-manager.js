const fs = require('fs')
const path = require('path')
const os = require('os')

class MCPConfigManager {
  constructor() {
    this.homeDir = os.homedir()
    this.platform = process.platform
    
    // Configure per-platform config file paths
    this.configPaths = this.getConfigPaths()
  }

  getConfigPaths() {
    const paths = {}
    
    switch (this.platform) {
      case 'darwin': // macOS
        paths.claude = path.join(this.homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
        paths.cursor = path.join(this.homeDir, '.cursor', 'mcp.json')
        // Windsurf and VSCode may follow similar paths (to be confirmed)
        paths.windsurf = path.join(this.homeDir, '.windsurf', 'mcp', 'mcp-config.json')
        paths.vscode = path.join(this.homeDir, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'mcp', 'config.json')
        break
        
      case 'win32': // Windows
        const appData = process.env.APPDATA || path.join(this.homeDir, 'AppData', 'Roaming')
        paths.claude = path.join(appData, 'Claude', 'claude_desktop_config.json')
        paths.cursor = path.join(this.homeDir, '.cursor', 'mcp.json')
        paths.windsurf = path.join(this.homeDir, '.windsurf', 'mcp', 'mcp-config.json')
        paths.vscode = path.join(appData, 'Code', 'User', 'globalStorage', 'mcp', 'config.json')
        break
        
      case 'linux': // Linux
        const configDir = process.env.XDG_CONFIG_HOME || path.join(this.homeDir, '.config')
        paths.claude = path.join(configDir, 'Claude', 'claude_desktop_config.json')
        paths.cursor = path.join(this.homeDir, '.cursor', 'mcp.json')
        paths.windsurf = path.join(this.homeDir, '.windsurf', 'mcp', 'mcp-config.json')
        paths.vscode = path.join(configDir, 'Code', 'User', 'globalStorage', 'mcp', 'config.json')
        break
        
      default:
        // Fallback: use default locations
        paths.claude = path.join(this.homeDir, '.claude', 'claude_desktop_config.json')
        paths.cursor = path.join(this.homeDir, '.cursor', 'mcp.json')
        paths.windsurf = path.join(this.homeDir, '.windsurf', 'mcp', 'mcp-config.json')
        paths.vscode = path.join(this.homeDir, '.vscode', 'mcp', 'config.json')
        break
    }
    
    return paths
  }

  // Read a config file
  readConfig(appName) {
    const configPath = this.configPaths[appName]
    if (!configPath) {
      throw new Error(`Unsupported app: ${appName}`)
    }

    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8')
        return JSON.parse(content)
      }
      return null
    } catch (error) {
      console.error(`Error reading ${appName} config:`, error)
      return null
    }
  }

  // Write a config file
  writeConfig(appName, config) {
    const configPath = this.configPaths[appName]
    if (!configPath) {
      throw new Error(`Unsupported app: ${appName}`)
    }

    try {
      // Ensure parent directory exists
      const dir = path.dirname(configPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      // Write formatted JSON
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
      return true
    } catch (error) {
      console.error(`Error writing ${appName} config:`, error)
      return false
    }
  }

  // Remove a server from a config
  removeServerFromConfig(appName, serverName) {
    const config = this.readConfig(appName)
    if (!config) {
      // Config file missing; nothing to remove
      return true
    }

    let modified = false

    if (appName === 'claude') {
      // Claude config format: { "mcpServers": { "serverName": {...} } }
      if (config.mcpServers && config.mcpServers[serverName]) {
        delete config.mcpServers[serverName]
        modified = true
      }
    } else if (appName === 'cursor') {
      // Cursor likely mirrors Claude's format; adjust if needed
      // Assuming the same: { "mcpServers": { "serverName": {...} } }
      if (config.mcpServers && config.mcpServers[serverName]) {
        delete config.mcpServers[serverName]
        modified = true
      }
    }

    if (modified) {
      return this.writeConfig(appName, config)
    }
    
    return true
  }

  // Remove a server from every supported app config
  removeServerFromAllConfigs(serverName) {
    const results = {
      claude: false,
      cursor: false
    }

    for (const appName of Object.keys(this.configPaths)) {
      try {
        results[appName] = this.removeServerFromConfig(appName, serverName)
      } catch (error) {
        console.error(`Error removing server from ${appName}:`, error)
        results[appName] = false
      }
    }

    return results
  }

  // Add a server to a config
  addServerToConfig(appName, serverName, serverConfig) {
    let config = this.readConfig(appName)

    // Initialize structure if the file does not exist
    if (!config) {
      config = {
        mcpServers: {}
      }
    }

    // Ensure the mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {}
    }

    // Normalize serverConfig to ensure the URL includes /mcp
    const processedConfig = this.ensureMcpPath(serverConfig)

    // Store the server config
    config.mcpServers[serverName] = processedConfig

    return this.writeConfig(appName, config)
  }

  // Ensure URLs include the /mcp path
  ensureMcpPath(serverConfig) {
    const config = { ...serverConfig }

    // Support multiple config shapes
    if (config.url) {
      // URL field present
      if (!config.url.endsWith('/mcp')) {
        config.url = config.url.replace(/\/$/, '') + '/mcp'
        console.log(`📝 Auto-appended /mcp to config URL: ${config.url}`)
      }
    } else if (config.command === 'npx' && config.args) {
      // npx command: locate the --transport-url argument
      const urlIndex = config.args.findIndex(arg => arg === '--transport-url')
      if (urlIndex !== -1 && config.args[urlIndex + 1]) {
        const originalUrl = config.args[urlIndex + 1]
        if (!originalUrl.endsWith('/mcp')) {
          config.args[urlIndex + 1] = originalUrl.replace(/\/$/, '') + '/mcp'
          console.log(`📝 Auto-appended /mcp to npx URL: ${config.args[urlIndex + 1]}`)
        }
      }
    }

    return config
  }

  // Update a server entry in a config
  updateServerInConfig(appName, oldServerName, newServerName, serverConfig) {
    const config = this.readConfig(appName)
    if (!config || !config.mcpServers) {
      return false
    }

    // Remove old entry if the name changed
    if (oldServerName !== newServerName && config.mcpServers[oldServerName]) {
      delete config.mcpServers[oldServerName]
    }

    // Normalize serverConfig with /mcp
    const processedConfig = this.ensureMcpPath(serverConfig)

    // Add or update the new entry
    config.mcpServers[newServerName] = processedConfig

    return this.writeConfig(appName, config)
  }

  // Check whether a config file exists
  configExists(appName) {
    const configPath = this.configPaths[appName]
    return configPath && fs.existsSync(configPath)
  }

  // Get all configured servers
  getAllServers(appName) {
    const config = this.readConfig(appName)
    if (!config || !config.mcpServers) {
      return {}
    }
    return config.mcpServers
  }

  // Debug helper: return config path info for this platform
  getConfigInfo() {
    const info = {
      platform: this.platform,
      homeDir: this.homeDir,
      paths: {}
    }

    for (const [appName, configPath] of Object.entries(this.configPaths)) {
      info.paths[appName] = {
        path: configPath,
        exists: fs.existsSync(configPath),
        directory: path.dirname(configPath),
        directoryExists: fs.existsSync(path.dirname(configPath))
      }
    }

    return info
  }

  // List supported apps
  getSupportedApps() {
    return Object.keys(this.configPaths)
  }
}

module.exports = MCPConfigManager
