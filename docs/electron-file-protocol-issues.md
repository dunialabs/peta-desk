# Electron File Protocol Issues (Packaged Builds)

Notes on fixing routing and asset loading when running the Next.js export under `file://` in Electron.

## Symptoms
- Packaged app shows a blank page; `.txt` data files fail to load.
- After initial fixes, pages loop/reload or flicker.
- Refreshing deep routes (e.g., `/dashboard`) returns 404 or a blank screen.

## Root Cause
Next.js App Router emits `.txt` payloads for React Server Components. Under `file://`, path resolution differs from `http://localhost`, so absolute paths like `file:///foo.txt` do not match the files inside `frontend/out`. Refreshing deep routes also confuses file-vs-route resolution.

## Fixes Implemented
1. **Main process request interception (`electron/main.js`)**
   - Intercept `file://` requests and redirect to the correct location under `frontend/out`.
   - Special-case top-level files and RSC `.txt` payloads.

2. **Route refresh handling (`electron/main.js`)**
   - Listen to `did-fail-load` and detect router paths without extensions.
   - Reload `index.html`, then set `window.history` to the intended route to avoid loops.
   - Guard with an `isHandlingNavigation` flag to prevent recursion.

3. **Preload rewrites (`electron/preload.js`)**
   - Early patch for `fetch`/`XMLHttpRequest`: rewrite absolute paths to relative (`/foo` → `./foo`) when running under `file://`.
   - Avoids broken requests before React mounts.

4. **Renderer helper (`frontend/components/common/file-protocol-fix.tsx`)**
   - Additional client-side rewrites for fetch/XHR/DOM assets when protocol is `file:`.

## Testing Checklist
- Build with `./build-nosign.sh` or `npm run build`.
- Open the packaged app:
  - Initial load renders normally.
  - Refresh on `/dashboard` or other routes works.
  - No infinite reloads or flicker.
  - RSC `.txt` responses load correctly.

## Key Files
- `electron/main.js` – file protocol routing and redirect logic
- `electron/preload.js` – early request rewrites
- `frontend/components/common/file-protocol-fix.tsx` – runtime renderer fix
- `frontend/app/layout.tsx` – mounts the renderer-side fix
