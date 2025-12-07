# Performance Optimization Notes

Summary of the main performance issues found and the fixes applied.

## Major Issue: Dashboard Re-fetch Loop
- `frontend/app/(dashboard)/dashboard/page.tsx` refetched all capabilities whenever `connections` changed, creating an infinite refresh cycle.
- **Fix**: remove `connections` from the dependency list and access the map directly to avoid unnecessary fetches.

## Logging Overhead
- Hundreds of `console.log` calls in `socket-context.tsx` and `dashboard/page.tsx` flooded the console and hurt performance.
- **Fix**: introduce a lightweight logger that only emits debug logs in development; keep `warn`/`error` always on.
- **Follow-up**: replace remaining `console.log` with the logger.

## Debug Effects in Production
- A debug `useEffect` that printed connection info ran on every change, even in production.
- **Fix**: disable the effect for production builds.

## Recommended Optimizations
- Throttle or debounce high-frequency socket events before updating state.
- Use `React.memo`/`useMemo` for expensive render paths.
- Avoid chaining state updates that can cascade into capability reloads.

## Validation Steps
- Connect multiple servers with distinct tokens; confirm no reload loop.
- Monitor network tab to ensure capabilities are fetched only on connect/change/explicit refresh.
- Profile CPU/memory to confirm logging does not dominate runtime.

## Key Files
- `frontend/app/(dashboard)/dashboard/page.tsx`
- `frontend/contexts/socket-context.tsx`
- `frontend/lib/logger.ts`
