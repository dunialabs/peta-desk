# Socket Usage Guide

Quick guide for working with MCP sockets in this project.

## Connect
- Use the IPC bridge (`mcp:connect`) with server URL, token, and a stable `serverId`.
- Connections are created with `forceNew: true` and include the token in the query.
- After `connect`, fetch capabilities and store them with the connection entry.

## Disconnect
- Call the context helper or IPC `mcp:disconnect`.
- Clear reconnect timers and remove stored capabilities for that server.
- When the app quits, the main process cleans up all sockets.

## Execute Tools
- Use `mcp:executeTool` with `serverId`, `clientId`, and tool params.
- Errors are surfaced back to the renderer; log failures with context but avoid leaking secrets.

## Capability Refresh
- Triggered on connect and when the server signals a change.
- Avoid adding `connections` as a dependency to effects that fetch capabilities to prevent loops.
- Normalization happens in `frontend/lib/capabilities-adapter.ts`.

## Status Handling
- States: `connecting`, `connected`, `failed`, `disconnected`.
- Backoff retries on transient errors; stop after the max retry count and mark `connectionFailed`.
- UI surfaces retry actions without blocking other servers.

## Files to Know
- Electron: `electron/socket-client.js`, `electron/main.js`, `electron/preload.js`
- Frontend: `frontend/contexts/socket-context.tsx`, `frontend/lib/socket-utils.ts`, `frontend/app/(dashboard)/dashboard/page.tsx`

## Testing
- Multiple simultaneous connections with different tokens on the same URL.
- Network interruptions and recovery.
- Tool execution success/failure paths.
- App restart with automatic reconnection of saved servers.
