# Socket Implementation Summary

A quick reference for how socket connections are structured in the project.

## Main Pieces
- **`electron/socket-client.js`**: wraps Socket.IO client creation in the main process.
- **`electron/main.js`**: bootstraps the app, sets up IPC bridges, and manages lifecycle cleanup.
- **`frontend/contexts/socket-context.tsx`**: React context that exposes connection state, capability data, and helper actions to the UI.
- **`frontend/lib/socket-utils.ts`**: shared helpers for connection status and error handling.

## Lifecycle
1. Create a socket with `forceNew: true` and auth token in the query.
2. Pre-register the socket in the connection map before awaiting `connect`.
3. On `connect`, fetch capabilities and mark `isConnected`.
4. On `disconnect`/`error`, start a backoff retry unless explicitly disconnected.
5. On app quit, tear down sockets and clear timers.

## State Shape
- `connections[serverId]` includes:
  - `socket`: the Socket.IO instance
  - `isConnected`: connection flag
  - `connectionFailed`: set after retries exhaust
  - `activeClientsCount`: optional count from the server
  - `token`: stored for reconnection flows
  - `capabilities`: normalized capability data

## IPC and Renderer Interaction
- IPC channels prefixed with `mcp:` carry capability fetches, tool execution requests, and status queries.
- Renderer components read from `socket-context` to render dashboards and client lists.
- Sensitive operations (tokens, passwords) flow through IPC and are stored securely on the Electron side.

## Testing Notes
- Validate multiple simultaneous connections with distinct tokens.
- Ensure reconnect backoff does not block manual retries.
- Confirm capability refreshes do not trigger runaway fetches.
- Verify cleanup on window close and app quit.
