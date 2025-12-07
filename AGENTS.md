# Repository Guidelines

## Project Structure & Module Organization
- Root scripts and Electron code live in `electron/` (`main.js`, preload, MCP integrations, tray assets). Keep Node-side logic here and avoid importing frontend-only packages.
- Next.js frontend sits in `frontend/` with `app/` routes, `components/` for shared UI, and `public/` for static assets; `frontend/out/` is the static export used by Electron packages.
- Build artifacts land in `dist/` (electron-builder output) and `docs/` holds supplementary guidance. Custom entitlements and build templates are under `build/`.

## Build, Test, and Development Commands
- Install all deps: `node install-deps.js` (installs root + frontend).
- Dev Electron + frontend together: `npm run dev` (waits for Next dev server, then boots Electron).
- Frontend only: `cd frontend && npm run dev`.
- Production-like build: `./build-production.sh` (front-end build + electron-builder with path fixes). Platform-specific: `npm run build:mac|win|linux`. Generic: `npm run build`.
- Frontend quality checks: `cd frontend && npm run lint` and `npm run type-check`.

## Coding Style & Naming Conventions
- JavaScript in `electron/`: CommonJS modules, 2-space indentation, single quotes, semicolon-optional (follow existing files). Keep logging lightweight; prefer small helper functions over large blocks.
- Frontend: TypeScript + Next.js App Router, TailwindCSS. Prefer function components, React hooks, and `app/` server/client conventions. Components in `frontend/components/` should stay reusable and typed.
- Name files using kebab-case for scripts (`build-production.sh`), PascalCase for React components, and camelCase for variables/functions. Keep IPC channel names prefixed (`mcp:`) as in existing handlers.

## Testing Guidelines
- No automated tests yet; rely on lint/type-check and manual validation. At minimum, run `npm run dev` and confirm the Service Status tab reports healthy MCP + Electron statuses.
- For UI changes, prefer screenshot or screen-recording of affected pages. If you add tests later, colocate under the relevant folder and mirror file names (e.g., `component.test.tsx`).

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes observed in history (e.g., `feat:`, `fix:`, `refactor:`). Keep the subject in imperative mood and under ~72 chars.
- PRs should include: a short summary of intent, linked issue or ticket, manual test notes (commands run, platforms verified), and screenshots for visual changes. Mention any packaging impact (changes to `electron-builder.yml` or `build-*` scripts).
