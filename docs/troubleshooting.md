# Troubleshooting Guide

Collected issues encountered during development and their resolutions.

## npm install failures
**Symptoms**
```
npm error code 1
npm error path .../node_modules/electron
npm error RequestError: read ETIMEDOUT
```
**Causes**: Electron download timing out; slow default registry.

**Fix**
1) Use a faster registry in `.npmrc`:
```
electron_mirror=https://npmmirror.com/mirrors/electron/
registry=https://registry.npmmirror.com
```
2) Install dependencies per package if needed:
```
cd frontend && npm install --registry=https://registry.npmmirror.com
cd .. && npm install --registry=https://registry.npmmirror.com
```
3) Remove any `postinstall` scripts that trigger recursive installs.

## Next.js static export
**Symptom**
```
The "next export" command has been removed in favor of "output: export"
```
**Fix**
- Set `output: 'export'` and `images.unoptimized = true` in `frontend/next.config.mjs`.
- Remove legacy `next export` scripts; rely on `npm run build` to emit `frontend/out`.

## macOS code signing
**Symptom**
```
codesign ... unable to build chain ... errSecInternalComponent
```
**Fix**
- For unsigned dev builds, set in `electron-builder.yml`:
  ```yaml
  mac:
    identity: null
    hardenedRuntime: false
    gatekeeperAssess: false
  ```
- Or export `CSC_IDENTITY_AUTO_DISCOVERY=false` and run `npm run build`.
- Use `./build-nosign.sh` for a preconfigured path.

## Port conflicts
**Symptom**: `EADDRINUSE` on gateway/host ports (default 8000/8001).

**Fix**
- Dynamic port selection is implemented via `get-port`; services fall back to the next free port and log the chosen value.
- You can still override via `PORT=8080` (gateway) and align host `GATEWAY_URL`.
- Test dynamic assignment with `node test-dynamic-ports.js`.

## Service startup ordering
- Start gateway first, wait a couple seconds, then host, then the frontend/Electron shell.
- Prefer the provided scripts (`npm run dev`, `node start-dev.js`) to avoid timing issues.
