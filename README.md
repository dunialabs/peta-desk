# Peta Desk – MCP Desktop Client & Approval Console

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![License](https://img.shields.io/badge/license-ELv2-blue.svg)
![Runtime](https://img.shields.io/badge/runtime-Electron%20%2B%20Next.js-informational.svg)
![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

Peta Desk is a **cross‑platform** desktop application (typically implemented with Electron) that provides a user‑facing control surface on top of **Peta Core**. It connects to the gateway’s Socket.IO and MCP endpoints.

It can run as the desktop companion to **Peta Core**, acting as a secure client and approval surface for AI agents.

The application ships with an embedded Node/Electron runtime and a statically exported Next.js frontend, so packaged builds are fully self‑contained.

📘 **Full Documentation** → [https://docs.peta.io](https://docs.peta.io)  
🚀 **Download / Official Website** → [https://peta.io](https://peta.io)

---

## Table of Contents

- [About the Project](#about-the-project)
  - [What is Peta Desk?](#what-is-peta-desk)
  - [Key Use Cases](#key-use-cases)
  - [Interaction Model](#interaction-model)
- [Project Structure](#project-structure)
  - [Directory Layout](#directory-layout)
  - [Main Components](#main-components)
- [Architecture Highlights](#architecture-highlights)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [First-time Setup](#first-time-setup)
  - [Running in Development](#running-in-development)
  - [Building & Packaging](#building--packaging)
- [API Overview](#api-overview)
  - [Electron API](#1-electron-api-windowelectron)
  - [Electron API Legacy](#2-electron-api-legacy-windowelectronapi)
  - [Socket.IO API](#3-socketio-api-windowsocketio)
  - [Communication Model](#communication-model)
  - [Runtime Behavior](#runtime-behavior)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## About the Project

### What is Peta Desk?

Peta Desk is a **cross‑platform** desktop client (Windows, macOS, and Linux) that exposes a user‑friendly control surface for **Peta Core**. It connects to the gateway’s Socket.IO and MCP endpoints and can operate as a desktop companion to Peta Core, acting as a secure client and approval surface for AI agents.

### Key Use Cases

- **Capability configuration**
  - Display the tools, resources, and prompts currently available to the user.
  - Allow users to further restrict their own capabilities on a per‑client basis.
  - Apply updates in real time when administrators change permissions.

- **Server configuration**
  - Allow users to configure servers that require their own credentials (for example, personal API keys).
  - Unconfigure or revoke previously stored user configuration.
  - Automatically trigger server startup once configuration is complete.

- **Approval workflow**
  - Receive approval requests when an agent triggers a tool that requires human review.
  - Show the parameters the agent intends to send.
  - Let the user approve, reject, or modify the request.

### Interaction Model

Peta Desk communicates over two primary channels:

- **Socket.IO**  
  Used for capability updates, approval requests, and general notifications.

- **MCP**  
  Used for the actual tool calls executed by the agent.

The same Socket.IO API can be consumed from other applications if you want to build a custom user or admin UI.

---

## Project Structure

### Directory Layout

```bash
peta-desk/
├── electron/                  # Electron main process
│   ├── main.js                # Main process entry
│   ├── preload.js             # Preload script with IPC bridge
│   ├── socket-client.js       # Socket.IO connection manager
│   ├── biometric-auth.js      # Touch ID / Windows Hello integration
│   ├── password-manager.js    # Master password encryption
│   └── mcp-config-manager.js  # External app config file manager
├── frontend/                  # Next.js frontend
│   ├── app/                   # Next.js App Router pages
│   │   ├── (onboarding)/      # Setup flow screens
│   │   ├── (dashboard)/       # Main dashboard interface
│   │   ├── quick-panel/       # Fast access panel
│   │   └── security-authorization/ # Auth flow
│   ├── components/            # Reusable UI components
│   ├── contexts/              # React contexts (socket, auth)
│   └── out/                   # Static export for Electron packaging
├── dist/                      # electron-builder output (DMG/EXE/AppImage)
├── docs/                      # Technical documentation
├── install-deps.js            # Helper script to install dependencies
└── package.json               # Root scripts for dev, build, and packaging
```

### Main Components

* **Electron main process (`electron/main.js`)**

  * Manages application lifecycle, windows, tray icon, and native menus.
  * Handles Socket.IO connections to remote Peta Core servers.
  * Manages biometric authentication (Touch ID on macOS, Windows Hello on Windows).
  * Encrypts and stores master password and access tokens.
  * Reads/writes MCP configuration files for external apps (Claude, Cursor, VSCode, Windsurf).
  * Implements custom URL scheme handler (`petadesk://`).
  * Single instance lock enforcement.

* **Socket.IO client (`electron/socket-client.js`)**

  * Manages WebSocket connections to Peta Core gateway.
  * Handles multi-server connections with per-server state tracking.
  * Auto-reconnect with exponential backoff.
  * Notification system for approval requests and capability updates.

* **MCP configuration manager (`electron/mcp-config-manager.js`)**

  * Reads and modifies MCP config files for external applications.
  * Platform-aware path resolution (macOS, Windows, Linux).
  * Adds/removes/updates server configurations in JSON config files.
  * Enables integration with Claude Desktop, Cursor, VSCode, and Windsurf.

* **Security modules**

  * **`biometric-auth.js`**: Platform-specific biometric authentication.
  * **`password-manager.js`**: Master password encryption with PBKDF2.

* **Preload script (`electron/preload.js`)**

  * Context-isolated bridge between renderer and main process.
  * Exposes secure APIs: `electronAPI`, `electron`, `socketIO`.
  * Handles Socket.IO connections directly in preload to preserve full features.
  * Patches fetch/XHR for static file protocol compatibility.

* **Frontend (`frontend/`)**

  * Next.js 15 App Router with React 19.
  * TailwindCSS + shadcn/ui components.
  * Onboarding flow: Welcome → Master Password → Auto-Lock → MCP Setup.
  * Dashboard: Server management, capability configuration, approval handling.
  * Zustand state management with localStorage persistence.

* **Distribution artifacts (`dist/`)**

  * macOS: `dist/MCP Desktop-*.dmg`
  * Windows: `dist/MCP Desktop Setup *.exe`
  * Linux: `dist/MCP Desktop-*.AppImage`

---

## Architecture Highlights

* **Cross‑platform desktop client** targeting Windows, macOS, and Linux from a single codebase.
* **Socket.IO-based communication** with remote Peta Core servers for real-time updates.
* **Security-first design** with biometric authentication, master password encryption, and token encryption (AES-GCM).
* **Multi-server support** – manage multiple Peta Core instances simultaneously with per-server state tracking.
* **External app integration** – automatically configures MCP settings for Claude Desktop, Cursor, VSCode, and Windsurf.
* **Local backup system** – create, restore, and manage configuration backups with metadata.
* **Fully bundled app** with embedded Node.js/Electron runtime – no system dependencies required for end users.
* **Modern tech stack**: Next.js 15, React 19, TypeScript, TailwindCSS, shadcn/ui, Zustand.
* **Context-isolated IPC** between renderer and main process for security.
* **Auto-lock timer** with configurable intervals (5 min, 15 min, 30 min, 1 hour, never).

---

## Getting Started

### Prerequisites

To build and run Peta Desk from source, you will need:

* Node.js **v18.17+** for development and packaging.
* npm (or a compatible package manager).
* A recent **Electron** toolchain.
* (Optional) A running **Peta Core** instance if you want to connect to a secure gateway.

End users of the packaged app do **not** need Node.js installed.

### First-time Setup

From the repository root:

1. **Install dependencies**

   ```bash
   # Recommended: auto installer (installs root + frontend)
   node install-deps.js

   # Manual install
   npm install
   cd frontend && npm install
   cd ..
   ```

2. **Prepare the frontend build (if you want a production/static export)**
   The build scripts below typically handle this for you, but you can also run it manually:

   ```bash
   cd frontend
   npm run build      # Next.js production build
   # Optional: export to static files if your config uses it
   # npm run export
   cd ..
   ```

### Running in Development

A typical development loop looks like this:

1. **Run the integrated dev script (Next.js + Electron)**

   ```bash
   npm run dev
   ```

   The script picks an available port (prefers 34327–34329), starts the Next.js dev server there, then launches Electron pointed at that port. Check the terminal output for the exact URL.

### Building & Packaging

Peta Desk uses shell scripts and npm scripts to produce signed and unsigned cross‑platform desktop builds for Windows, macOS, and Linux.

#### Dev / Unsigned builds

Use these flows when you just need an unsigned binary for local testing:

```bash
# Preferred: includes asset path fixes and static export
./build-production.sh

# Base version without extra path handling
./build-nosign.sh

# Manual environment toggle for unsigned builds
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build
```

If the packaged app shows a blank window, prefer `./build-production.sh`, which includes bundled asset‑path fixes.

#### Signed production builds

To generate code‑signed installers, you need a valid platform‑specific developer certificate. Without a certificate, stick to the unsigned flow above.

```bash
# Platform-specific signed builds
npm run build:mac   # macOS
npm run build:win   # Windows
npm run build:linux # Linux
```

The resulting artifacts are written to `dist/`:

* macOS: `.dmg` disk images
* Windows: `.exe` installers
* Linux: `.AppImage` bundles

Packaged apps are fully self‑contained: all dependencies, the Node/Electron runtime, and the static frontend export are bundled together.

---

## API Overview

Peta Desk exposes three main APIs from the preload script to the renderer process:

### 1. Electron API (`window.electron`)

The main API surface for desktop functionality and security features.

#### Security & Authentication

* **`biometric.isAvailable()`** – Check if biometric authentication is available (Touch ID/Windows Hello).
* **`biometric.authenticate(reason)`** – Trigger biometric authentication.
* **`biometric.getPassword()`** – Retrieve stored password via biometric auth.
* **`password.store(password)`** – Store master password with encryption.
* **`password.verify(password)`** – Verify master password.
* **`password.update(oldPassword, newPassword)`** – Update master password.
* **`password.has()`** – Check if master password exists.
* **`password.remove()`** – Delete master password.
* **`crypto.encryptToken(token, masterPassword)`** – Encrypt access token with AES-GCM.
* **`crypto.decryptToken(encryptedToken, masterPassword)`** – Decrypt access token.

#### MCP Configuration Management

* **`mcpConfig.addServer(appName, serverName, serverConfig)`** – Add MCP server to external app config.
* **`mcpConfig.removeServer(appName, serverName)`** – Remove MCP server from external app config.
* **`mcpConfig.updateServer(appName, oldServerName, newServerName, serverConfig)`** – Update server configuration.
* **`mcpConfig.getServers(appName)`** – Get all servers from app config file.
* **`mcpConfig.exists(appName)`** – Check if config file exists.
* **`testMCPServer(address, accessToken)`** – Test MCP server connection before adding.

Supported apps: **Claude Desktop**, **Cursor**, **VSCode**, **Windsurf**.

#### Lock State & Connection Management

* **`getLockStatus()`** – Get current lock state.
* **`setLockStatus(lockData)`** – Update lock state.
* **`updateConnectionStatus(connected)`** – Update connection status for tray icon.
* **`getConnectionStatus()`** – Get current connection status.
* **`updateServersStatus(hasServers)`** – Update tray icon based on server presence.

#### Context Menus & Window Control

* **`showConnectionMenu(x, y, serverId, configuredApps)`** – Show native context menu for server actions.
* **`showSettingsMenu(x, y, autoLockTimer)`** – Show settings menu.
* **`onConnectionMenuAction(callback)`** – Listen for menu action events.
* **`onSettingsMenuAction(callback)`** – Listen for settings menu events.
* **`showWindow()`** / **`focusWindow()`** – Window management.
* **`hideQuickPanel()`** / **`showSettings()`** – Panel controls.

#### URL Scheme Handling

* **`urlScheme.onCustomURL(callback)`** – Listen for `petadesk://` protocol URLs.
* **`urlScheme.removeCustomURLListener(callback)`** – Remove URL listener.

#### Utilities

* **`checkInstalledApps()`** – Detect installed apps (Claude, Cursor, VSCode, Windsurf).
* **`shell.openExternal(url)`** – Open URL in default browser.
* **`authorizeDangerousOperation(authData)`** – Authorize sensitive operations.
* **`clearAllAppData()`** – Dev-only: clear all app data.

### 2. Electron API Legacy (`window.electronAPI`)

Local backup management (backward-compatible).

#### Backup Management

* **`getBackups()`** – List local backups.
* **`getBackupData(filename)`** – Read backup file contents.
* **`createBackup(data)`** – Create timestamped backup with metadata.
* **`deleteBackup(filename)`** – Delete local backup.
* **`downloadBackup(filename)`** – Download backup to file system.

### 3. Socket.IO API (`window.socketIO`)

Direct Socket.IO connection management handled in preload to preserve full Socket.IO features.

* **`createConnection(serverId, url, options)`** – Create Socket.IO connection to Peta Core server.
* **`on(serverId, eventName, callback)`** – Subscribe to Socket event.
* **`off(serverId, eventName, callback)`** – Unsubscribe from Socket event.
* **`emit(serverId, eventName, ...args)`** – Send Socket event.
* **`disconnect(serverId)`** – Disconnect from server.
* **`isConnected(serverId)`** – Check connection status.
* **`getSocketId(serverId)`** – Get Socket.IO session ID.
* **`getAllSocketsStatus()`** – Debug helper: get all socket states.

### Communication Model

* **Socket.IO** is used for real-time communication with Peta Core servers (capability updates, approval requests, notifications).
* **IPC** is used for renderer ↔ main process communication (security, config management, window control).
* **No MCP service hosting** – the app is a pure client that connects to remote Peta Core instances.

### Runtime Behavior

* On first run, use `node install-deps.js` to install both Electron and frontend dependencies.
* In development, `npm run dev` starts the frontend on an available port (defaults to 34327–34329) and points Electron at that URL. If you run the frontend manually, the default is `http://localhost:3000`.
* Production builds use the static export in `frontend/out`; no external web server is required.
* Packaged apps are fully self‑contained for end users.

---

## Troubleshooting

### App will not start

* Verify you are using **Node.js 18.17+**.
* Make sure no other Electron instance is blocking or locking the profile.
* Run the app from a terminal and check the console output for stack traces.
* On Windows, ensure that SmartScreen / antivirus is not quarantining the binary.

### Frontend fails to load

* Confirm the Next.js dev server is running (see the printed port in the terminal).
* Electron waits for the dev server to become available before loading the page; if the server never starts, you’ll see a blank window.
* Check firewall rules and local proxies that might block the dev server port.

### Connection or server issues

* Check that your Peta Core server is running and accessible.
* Verify the server URL and access token are correct.
* Open the **Dashboard** to view connection status and error messages.
* Check network connectivity and firewall rules.
* Restart the app; transient connection issues often resolve after a clean restart.
* Review console logs in DevTools for Socket.IO connection errors.

### Packaging issues

* Prefer `./build-production.sh` for local builds; it includes path fixes for static assets.
* Confirm that all required assets (static export, icons, preload scripts) are included in the build.
* On macOS, you may need to grant the app explicit permissions or bypass Gatekeeper on first run.
* If a signed build fails, verify your certificate configuration and platform‑specific signing settings.

---

## Contributing

We welcome all forms of contribution!

Before submitting a Pull Request, please:

1. Read the [Contributing Guide](./CONTRIBUTING.md).
2. Follow code standards and commit message conventions.

**Main ways to contribute**:

* Report bugs and suggest features.
* Submit code improvements and new features.
* Improve documentation.
* Help other users solve problems.

For details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

This project is licensed under the [Elastic License 2.0 (ELv2)](./LICENSE).

**What We Encourage**
Subject to the terms of the Elastic License 2.0, you are encouraged to:

* Freely review, test, and verify the safety and reliability of this product.
* Modify and adapt the code for your own use cases.
* Apply and integrate this project in a wide variety of scenarios.
* Contribute improvements, bug fixes, and other enhancements that help evolve the codebase.

**Key Restrictions**:

* You may not provide the software to third parties as a hosted or managed service.
* You may not remove or circumvent license key functionality.
* You may not remove or obscure licensing notices.

For detailed terms, see the [LICENSE](./LICENSE) file.

Copyright © 2025 [Dunia Labs, Inc.](https://dunialabs.io)
