# Contributing Guide

Thank you for considering contributing to Peta Desk!

## How to Contribute

### Reporting Issues

If you find a bug or have a feature request, please:

1. Check [Issues](../../issues) to ensure the issue hasn't already been reported
2. Create a new Issue with the following information:
   - Clear title and description
   - Steps to reproduce (if applicable)
   - Expected behavior vs actual behavior
   - Environment information (Electron version, Node.js version, operating system)
   - Relevant logs or screenshots
   - Console output from DevTools (if frontend-related)

### Submitting Code

1. **Fork the Repository**

   ```bash
   git clone https://github.com/your-username/peta-desk.git
   cd peta-desk
   ```

2. **Create a Branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

3. **Set Up Development Environment**

   ```bash
   # Install dependencies for both root and frontend
   node install-deps.js

   # Or manually:
   npm install
   cd frontend && npm install && cd ..
   ```

4. **Build Frontend**

   ```bash
   cd frontend
   npm run build
   cd ..
   ```

5. **Run in Development Mode**

   ```bash
   # Start Next.js dev server and Electron together
   npm run dev
   ```
   
   The script picks an available port (prefers 34327–34329), starts the Next.js dev server there, then launches Electron pointed at that port. Check the terminal output for the URL.

6. **Make Changes**
   - Follow existing code style and patterns
   - Update relevant documentation (README.md)
   - Test changes in both development and production builds
   - Ensure changes work across platforms (Windows, macOS, Linux) when applicable

7. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add new feature" # or "fix: fix issue"
   ```

   **Commit Message Convention**:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation update
   - `refactor:` - Code refactoring
   - `test:` - Test related
   - `chore:` - Build/tool configuration
   - `ui:` - UI/UX improvements
   - `security:` - Security-related changes

8. **Push to Fork**

   ```bash
   git push origin feature/your-feature-name
   ```

9. **Create Pull Request**
   - Create a Pull Request on GitHub
   - Clearly describe what changes were made and why
   - Link related Issues (if any)
   - Include screenshots for UI changes
   - Wait for Code Review

### Code Standards

#### TypeScript/JavaScript
- Use TypeScript where possible
- Follow existing type definitions
- Avoid using `any` type
- Use async/await for asynchronous operations

#### React/Next.js
- Use functional components with hooks
- Follow React best practices
- Use Zustand for state management (already in place)
- Keep components focused and reusable

#### Electron
- Follow security best practices (context isolation, preload scripts)
- Never expose Node.js APIs directly to renderer
- Use IPC for main ↔ renderer communication
- Clean up listeners and resources properly

#### Security
- Never log sensitive data (passwords, tokens)
- Use encryption for storing credentials
- Validate user input
- Follow principle of least privilege

### File Organization

- **`electron/`** - Main process code
  - Keep main.js focused on app lifecycle
  - Create separate modules for distinct features
  - Use proper error handling

- **`frontend/app/`** - Next.js pages
  - Use App Router conventions
  - Keep pages thin, move logic to components/contexts

- **`frontend/components/`** - Reusable UI components
  - One component per file
  - Include prop types/interfaces

- **`frontend/contexts/`** - React contexts
  - Use for shared state and logic
  - Keep contexts focused on specific domains

### Testing

Before submitting a PR:

1. **Test in development mode**

   ```bash
   npm run dev
   ```

2. **Run frontend checks**

   ```bash
   cd frontend
   npm run lint
   npm run type-check
   ```

3. **Test production build**

   ```bash
   ./build-production.sh
   # Then test the packaged app in dist/
   ```

4. **Test on target platforms** (if possible)
   - macOS
   - Windows
   - Linux

5. **Check for console errors**
   - Open DevTools in Electron
   - Verify no errors or warnings

### Platform-Specific Considerations

When adding features, consider:

- **macOS**: Touch ID integration, DMG packaging
- **Windows**: Windows Hello integration, EXE installer
- **Linux**: AppImage compatibility, various distributions

### Common Development Tasks

#### Adding a new IPC channel
1. Add handler in `electron/main.js`
2. Expose in `electron/preload.js`
3. Call from renderer via `window.electron.yourMethod()`

#### Adding a new UI component
1. Create in `frontend/components/`
2. Use TypeScript interfaces for props
3. Follow shadcn/ui patterns for consistency

#### Modifying security features
1. Test biometric authentication on actual hardware
2. Verify encryption/decryption works correctly
3. Check auto-lock behavior

## Security Issues

If you discover a security vulnerability, please **do not** create a public Issue. Instead:

- Email the project maintainer at: support@dunialabs.io
- Describe the vulnerability details, impact scope, and reproduction steps
- Allow reasonable time for a fix before public disclosure

We will respond and address the issue as soon as possible.

## Code of Conduct

By participating in this project, you agree to:

- Respect all contributors
- Accept constructive criticism
- Focus on what is best for the project
- Show empathy towards community members
- Follow professional and ethical standards

## Development Tips

### Debugging Electron

```bash
# Enable DevTools in production
# Add to main.js temporarily:
mainWindow.webContents.openDevTools()

# View main process logs
# They appear in the terminal where you ran the app
```

### Clearing App Data

```bash
# Development only - clear all stored data
# Available via window.electron.clearAllAppData() in renderer
```

### Building Unsigned (for testing)

```bash
# Faster builds without code signing
./build-nosign.sh

# Or with path fixes
./build-production.sh
```

## Questions?

- Check existing [documentation](./README.md)
- Review [closed Issues](../../issues?q=is%3Aissue+is%3Aclosed)
- Ask in a new Issue with the "question" label

## License

By contributing code, you agree that your contributions will be licensed under the [Elastic License 2.0](./LICENSE).

---

Thank you for contributing to Peta Desk! Your efforts help make secure AI agent management accessible to everyone.
