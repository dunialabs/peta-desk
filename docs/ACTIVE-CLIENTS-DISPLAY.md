# Active Clients Display Guide

This document summarizes how the dashboard shows active MCP clients per server and how the data flows through the app.

## Goals
- Display per-server client counts and connection state consistently.
- Keep socket state, capabilities, and UI in sync without redundant fetches.
- Avoid race conditions when sockets reconnect or are removed.

## Data Flow
- `frontend/contexts/socket-context.tsx` tracks connections, capabilities, and active client counts from the backend.
- `frontend/app/(dashboard)/dashboard/page.tsx` reads from the context to render cards and client lists.
- `frontend/lib/capabilities-adapter.ts` normalizes capability payloads for the UI.

## Key Behaviors
- Connections are keyed by `serverId` with metadata (`isConnected`, `activeClientsCount`, capabilities, and optional `token` for reconnection flows).
- Capabilities are fetched once on connect and refreshed when the server reports changes.
- Client lists are grouped by server; status badges reflect `connecting`, `connected`, `failed`, or `disconnected`.

## Edge Cases
- Duplicate server URLs with different tokens force new socket instances (`forceNew: true`) to avoid multiplex conflicts.
- Cleanup effects only run on unmount to prevent rapid disconnect/reconnect loops.
- Capability updates use stable references to avoid unnecessary re-renders.

## Testing Checklist
- Add two servers with the same URL but different tokens; both should connect and show independent client counts.
- Disconnect and reconnect a server; UI should update counts without stale data.
- Trigger capability changes on the server; dashboard should refresh without looping fetches.
- Restart the app; saved connections should restore and show accurate client counts.

## Related Files
- `frontend/contexts/socket-context.tsx`
- `frontend/lib/capabilities-adapter.ts`
- `frontend/app/(dashboard)/dashboard/page.tsx`
