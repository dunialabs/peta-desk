# Server Management Example

Reference flow for adding, editing, and removing MCP servers in the dashboard.

## Add Server
1. Collect server URL, token, optional proxy key/name.
2. Validate input and normalize the server URL (strip trailing slash).
3. Create a socket with `forceNew: true`, register it under `serverId`, and fetch capabilities.
4. Persist the server entry (including encrypted token) for reconnect on restart.

## Edit Server
- Update display name or token; refresh capabilities after saving.
- If the token changes, disconnect the old socket before reconnecting with the new token.
- Keep `serverId` stable so UI references remain valid.

## Remove Server
- Disconnect and dispose of the socket.
- Remove stored token/config and clear related capabilities/client lists.
- Update dashboard cache so the server disappears immediately.

## UX Expectations
- Clear statuses: connecting, connected, failed, disconnected.
- Sensitive operations (delete, unlock) should prompt for the master password when required.
- Input fields should support keyboard shortcuts (Enter to save, Esc to cancel).

## Key Files
- `frontend/app/(dashboard)/server-management/page.tsx`
- `frontend/app/(dashboard)/dashboard/page.tsx`
- `frontend/contexts/socket-context.tsx`
- `frontend/app/(dashboard)/unlock-password/page.tsx`

## Testing Checklist
- Add multiple servers (same URL, different tokens) and confirm independent connections.
- Edit a server token and verify reconnect with the new credentials.
- Delete a server and ensure sockets, capabilities, and local storage entries are removed.
- Restart the app and confirm saved servers reconnect as expected.
