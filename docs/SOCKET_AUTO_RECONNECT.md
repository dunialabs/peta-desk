# Socket Auto-Reconnect Strategy

Guidelines for keeping MCP socket connections healthy and resilient.

## Goals
- Automatically reconnect when a server drops while avoiding rapid retry loops.
- Preserve capability and client state where possible.
- Provide clear UI feedback for `connecting`, `connected`, and `failed` states.

## Core Rules
- Use `forceNew: true` per connection to isolate sockets by `serverId`/token.
- Back off reconnect attempts (e.g., incremental delay) after repeated failures.
- Mark `connectionFailed` after exceeding the retry limit and surface it in the UI.
- Clear reconnection timers when manually disconnecting or when the app quits.

## Implementation Notes
- `frontend/contexts/socket-context.tsx` owns reconnection timers and status flags.
- Store tokens and server metadata alongside sockets to resume connections after restart.
- Refresh capabilities after a successful reconnect to resync the dashboard.
- Use stable refs to avoid stale closures inside reconnect callbacks.

## UI Expectations
- Dashboard cards should show:
  - Gray “connecting” tag while retrying
  - Green indicator when connected
  - Red “Connect Failed” with a retry button after limits are hit
- Client lists should hide stale data when disconnected.

## Testing Checklist
- Disconnect network and restore it; sockets should reconnect with backoff.
- Force auth/token errors; retries should stop and mark failure.
- Restart the app; saved servers should attempt reconnection automatically.
- Manual disconnect should cancel pending timers.
