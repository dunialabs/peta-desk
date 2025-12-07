# Multiple Socket Connection Troubleshooting

Notes from fixing issues when connecting multiple MCP servers that share the same URL but use different tokens.

## Root Causes
- **Socket.IO multiplexing**: by default Socket.IO reuses a single underlying connection for the same URL, which breaks authentication when tokens differ.
- **Aggressive cleanup effects**: a `useEffect` cleanup tied to `connections` caused sockets to disconnect immediately after every state change.
- **Registration race**: `connect` events fired before a socket entry was added to the connections map, so state updates were dropped.

## Fixes Implemented
- Set `forceNew: true` and include a unique `query` per connection to disable multiplexing.
- Scope cleanup to component unmount only (empty dependency array) to avoid disconnect loops.
- Pre-register sockets in the connections map before awaiting `connect` so events always find their entry.
- Added a `connectionsRef` to avoid stale closures when reading socket state inside effects.

## Key Locations
- `frontend/contexts/socket-context.tsx` (socket creation, cleanup, and connection map handling)
- `frontend/app/(dashboard)/dashboard/page.tsx` (renders connection state and reacts to capability updates)

## Validation Scenarios
- Connect to two servers with the same URL but different tokens; both stay connected.
- Re-render dashboard components; sockets should remain connected.
- Capability refreshes should not trigger disconnect/reconnect loops.
- Closing the component should disconnect sockets exactly once.
