# Multi-Server Socket Guide

How to manage multiple concurrent MCP server connections safely.

## Principles
- Treat each server as an isolated connection: unique `serverId`, `token`, and Socket.IO instance (`forceNew: true`).
- Avoid multiplexing sockets that share a URL; include token in the query to keep sessions distinct.
- Keep reconnection state per server so one failing host does not affect others.

## Data Management
- Store connection metadata in a map keyed by `serverId`:
  - `isConnected`, `connectionFailed`, `activeClientsCount`
  - `token` for reconnect
  - `capabilities` for UI rendering
- Use refs alongside React state to avoid stale closures during rapid connect/disconnect.

## UI Behavior
- Dashboard lists servers with per-server status chips and capability lists.
- Failed connections display a retry option without blocking other servers.
- Capability updates propagate per server; avoid global reloads unless needed.

## Edge Cases
- Two servers with identical URLs but different tokens must use separate sockets.
- Cleanup effects should not run on every state change; only on component unmount.
- When removing a server, clear stored tokens/capabilities and disconnect the socket.

## Testing Matrix
- Connect three servers simultaneously; verify independent status and capabilities.
- Drop one server’s network; only that card should show reconnect attempts.
- Remove a server; ensure it disappears from local storage and the UI, and the socket closes.
- Restart the app; previously saved servers should reconnect individually.

## Relevant Files
- `frontend/contexts/socket-context.tsx`
- `frontend/app/(dashboard)/dashboard/page.tsx`
- `frontend/app/(dashboard)/server-management/page.tsx`
