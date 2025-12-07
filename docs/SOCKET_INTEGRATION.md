# Socket Integration Guide

An overview of how Socket.IO is integrated across the Electron main process and the Next.js frontend.

## Architecture
- Electron main process owns socket connections and secure storage.
- Preload script exposes IPC bridges for the renderer to request socket actions.
- React context (`frontend/contexts/socket-context.tsx`) provides a typed API for pages/components.

## Connection Flow
1. Renderer requests `mcp:connect` via IPC with server URL, token, and metadata.
2. Main process creates a Socket.IO client with `forceNew: true`, registers lifecycle handlers, and returns status.
3. On `connect`, capabilities are fetched and stored; renderer updates UI via context.
4. On `disconnect` or errors, reconnection logic kicks in with backoff until success or retry limit hit.

## IPC Channels (examples)
- `mcp:connect` / `mcp:disconnect`
- `mcp:getCapabilities`
- `mcp:executeTool`
- `mcp:getServiceStatus`

## Security Notes
- Tokens are stored on the Electron side; renderer only receives derived state.
- Master password flows guard sensitive operations (unlock/reset).
- Avoid logging secrets; prefer sanitized debug logs in development only.

## UI Integration
- Dashboard cards show connection status, capability lists, and active client counts.
- Protocol handler page can auto-select a target server based on `proxyKey`.
- Backup/restore and Google Drive actions reuse the same IPC bridge.

## Recommended Practices
- Keep IPC channel names prefixed (`mcp:`) and documented.
- Use stable identifiers (`serverId`) to tie sockets, capabilities, and UI entries together.
- Guard cleanup effects to run only on unmount to avoid unwanted disconnects.
- Debounce high-frequency events before pushing them into React state.

## Verification
- Connect/disconnect multiple servers; verify UI state stays in sync.
- Simulate network loss; confirm backoff reconnect and UI feedback.
- Execute tools and capability fetches; ensure IPC responses resolve correctly.
- Quit the app; sockets and timers should cleanly shut down.
