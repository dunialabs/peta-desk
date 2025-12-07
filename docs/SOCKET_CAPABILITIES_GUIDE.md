# Socket Capabilities Guide

How capabilities are fetched from MCP servers and presented in the dashboard.

## Flow
1. Connect to a server via Socket.IO with `forceNew: true`.
2. Request capabilities after connect; normalize payloads via `frontend/lib/capabilities-adapter.ts`.
3. Store capabilities per `serverId` inside `frontend/contexts/socket-context.tsx`.
4. Render capabilities in `frontend/app/(dashboard)/dashboard/page.tsx`, grouped by server and client.

## Data Model
- `serverId`: stable key for the server connection.
- `clients`: mapped by client id/name; each has tools and metadata.
- `capabilities`: normalized shape used by the UI; avoids raw Socket.IO payload differences.

## Best Practices
- Avoid refetch loops by keeping capability requests out of effects that depend on mutable connection objects.
- Refresh capabilities when the server signals a change or after reconnection.
- Handle missing `serverId` gracefully by falling back to name matching, but prefer ids everywhere.
- Log capability fetch errors as warnings and surface a retry option in the UI.

## Testing
- Connect to multiple servers and confirm each capability set renders correctly.
- Trigger capability updates server-side; UI should refresh without reconnecting.
- Verify that a failed fetch does not bring down existing connections.
- Ensure capability state is cleared when a server is removed.
