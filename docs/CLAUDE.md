# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) Desktop Application built with Electron. The project has evolved from a distributed multi-service architecture to an **integrated architecture** where MCP services run directly within the Electron main process, eliminating external Node.js dependencies in production.

Key architectural features:
- **Integrated MCP Service** - MCP functionality built directly into Electron main process (`electron/mcp-service.js`)
- **IPC Communication** - Replaces HTTP requests for better performance
- **Next.js Frontend** - React-based UI with TailwindCSS, exported to static files for Electron
- **Zero Runtime Dependencies** - Packaged app requires no system Node.js

## Key Development Commands

### First-Time Setup
```bash
# Install all dependencies (uses Chinese npm mirror for faster installs)
node install-deps.js

# Build frontend static files (required before running Electron)
cd frontend && npm run build && cd ..
```

### Development Mode
```bash
# Primary development command - starts integrated Electron app
npm run dev
# or
node start-dev.js

# Alternative: Manual script with detailed logging
./run-manual.sh
```

### Building & Packaging
```bash
# Production build (recommended - includes path fixes)
./build-production.sh

# Development build without code signing
./build-nosign.sh
# or
export CSC_IDENTITY_AUTO_DISCOVERY=false && npm run build

# Platform-specific builds
npm run build:mac
npm run build:win
npm run build:linux
```

### Testing & Validation
```bash
# Frontend type checking and linting
cd frontend && npm run type-check
cd frontend && npm run lint

# Test dynamic port allocation
./test-port-fix.sh
```

## Architecture & Key Components

### Integrated Service Architecture
The application uses an integrated architecture where MCP services run within the Electron main process:

1. **Electron Main Process** (`electron/main.js`):
   - Manages application lifecycle and window creation
   - Integrates MCP service directly (no external processes)
   - Handles command-line arguments and single instance lock
   - Manages tray icon and biometric authentication

2. **MCP Service** (`electron/mcp-service.js`):
   - Built-in tools: echo, getSystemInfo, getCurrentTime
   - IPC handlers for: getHosts, registerHost, invokeTool, heartbeat
   - Self-registers as internal host on startup
   - No external HTTP servers required

3. **Frontend Communication**:
   - Uses IPC (Inter-Process Communication) via preload script
   - `window.electronAPI` exposes MCP operations to renderer
   - Replaces axios HTTP calls with IPC for better performance

### Frontend Architecture
- **Framework**: Next.js 15 with App Router, React 19
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: TailwindCSS with custom animations
- **Form Handling**: React Hook Form with Zod validation
- **Static Export**: Built to `frontend/out/` for Electron integration

### Route Structure
```
frontend/app/
├── (dashboard)/          # Main app pages (client-management, backup, settings)
├── (onboarding)/        # Onboarding flow (welcome, mcp-setup, permissions)
├── quick-panel/         # Quick access panel interface
└── components/
    ├── ui/             # shadcn/ui components
    └── common/         # Shared components
```

## Important Implementation Details

### Path Resolution
The app intelligently handles paths between development and production:
- Development: Uses relative paths from project root
- Production: Uses `process.resourcesPath` for bundled resources
- Key function: `getResourcePath()` in electron/main.js

### Biometric Authentication
Platform-specific biometric support:
- macOS: TouchID via `node-ms-passport`
- Windows: Windows Hello via `win-hello`
- Implementation: `electron/biometric-auth.js`

### Build Configuration
- **Next.js**: Static export with `output: 'export'` in `next.config.mjs`
- **Electron Builder**: Configured in `electron-builder.yml`
- **TypeScript**: Strict mode enabled with path aliases (@/)
- **Extra Resources**: No longer includes gateway/host folders (integrated architecture)

### State Management
- **Lock Context**: Security state management (`frontend/contexts/lock-context.tsx`)
- **Service Status**: Real-time MCP service monitoring
- **Client Management**: Backup/restore functionality with encryption

## Adding New Features

### To add a new MCP tool:
1. Add tool definition to `availableTools` array in `electron/mcp-service.js`
2. Implement handler in `executeTool()` method
3. Tool is automatically available via IPC

### To add a new frontend page:
1. Create component in appropriate route group under `frontend/app/`
2. Update navigation in `frontend/components/dashboard-sidebar.tsx` if needed
3. Rebuild frontend: `cd frontend && npm run build`

### To modify IPC communication:
1. Add handler in `electron/mcp-service.js` using `ipcMain.handle()`
2. Expose method in `electron/preload.js` via `contextBridge`
3. Use in frontend via `window.electronAPI`

## Known Issues & Solutions

### Port Conflicts
- Solution: Dynamic port allocation via `get-port` library
- Test with: `./test-port-fix.sh`

### Build Issues on macOS
- Missing code signing: Use `./build-nosign.sh` or set `CSC_IDENTITY_AUTO_DISCOVERY=false`
- Window not showing after build: Use `./build-production.sh` (includes path fixes)

### NPM Install Timeouts
- Use Chinese mirror: `--registry=https://registry.npmmirror.com`
- Or use automated script: `node install-deps.js`