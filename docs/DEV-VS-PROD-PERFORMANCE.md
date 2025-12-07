# Dev vs Prod Performance Notes

Key differences to watch for between development builds and packaged production builds.

## Dev Build Characteristics
- Hot reload, source maps, and verbose logging increase CPU/memory.
- Network requests may be repeated more often during development due to debug effects.
- Unminified bundles make render paths slower but easier to debug.

## Production Build Characteristics
- Minified/optimized bundles change timing; some race conditions only appear here.
- Logging should be minimal; debug-only effects must be disabled.
- Asset paths differ; packaged apps must load from `frontend/out` instead of the dev server.

## Recommendations
- Test reconnect logic and capability fetching in both modes.
- Use the `Service Status` tab to confirm MCP + Electron health after packaging.
- Profile dashboard renders in production mode to ensure no hidden loops.
- When packaging, prefer `./build-production.sh` because it includes path fixes validated for the app.

## Checks Before Release
- Replace `console.log` with environment-aware logging.
- Confirm Socket.IO reconnection/backoff works in packaged builds without dev server.
- Validate Google Drive auth and backup/restore flows in production artifacts.
- Verify entitlements and app permissions on macOS/Windows/Linux targets.
