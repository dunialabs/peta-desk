const { spawn } = require('child_process');
const path = require('path');

// Set the process title for easier discovery
process.title = 'peta-dev';

let processes = [];

function startProcess(name, command, args, cwd, env = {}) {
  console.log(`Starting ${name}...`);
  const proc = spawn(command, args, {
    cwd: cwd || __dirname,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
    detached: false // Keep parent/child relationship
  });
  
  proc.on('error', (error) => {
    console.error(`${name} error:`, error);
  });
  
  proc.on('exit', (code) => {
    console.log(`${name} exited with code ${code}`);
  });
  
  processes.push({ name, proc });
  return proc;
}

function cleanup() {
  console.log('\nShutting down processes...');
  processes.forEach(({ name, proc }) => {
    console.log(`Stopping ${name} (PID: ${proc.pid})`);
    
    try {
      // Attempt graceful shutdown first
      proc.kill('SIGTERM');
      
      // Force kill if it does not exit in time
      setTimeout(() => {
        if (!proc.killed) {
          console.log(`Force killing ${name} (PID: ${proc.pid})`);
          proc.kill('SIGKILL');
        }
      }, 2000);
      
      // Clean child processes if any remain
      if (proc.pid) {
        try {
          // Find children with pgrep and terminate precisely
          const { exec } = require('child_process');
          
          if (name === 'Electron') {
            // Find children of this PID
            exec(`pgrep -P ${proc.pid}`, (error, stdout) => {
              if (!error && stdout.trim()) {
                const childPids = stdout.trim().split('\n');
                console.log(`Found Electron child processes: ${childPids.join(', ')}`);
                childPids.forEach(pid => {
                  try {
                    process.kill(parseInt(pid), 'SIGTERM');
                  } catch (e) {
                    // Process may already be gone
                  }
                });
              }
            });
          }
          
          if (name === 'Frontend') {
            // Find children of this PID
            exec(`pgrep -P ${proc.pid}`, (error, stdout) => {
              if (!error && stdout.trim()) {
                const childPids = stdout.trim().split('\n');
                console.log(`Found Frontend child processes: ${childPids.join(', ')}`);
                childPids.forEach(pid => {
                  try {
                    process.kill(parseInt(pid), 'SIGTERM');
                  } catch (e) {
                    // Process may already be gone
                  }
                });
              }
            });
          }
        } catch (e) {
          console.log(`Could not clean up child processes for ${name}: ${e.message}`);
        }
      }
    } catch (error) {
      console.error(`Error killing ${name}:`, error.message);
    }
  });
  
  // Allow time for processes to exit
  setTimeout(() => {
    process.exit(0);
  }, 3000);
}

// Enhanced signal handling
let isShuttingDown = false;

function handleShutdown(signal) {
  if (isShuttingDown) {
    console.log('\nForce exit...');
    process.exit(1);
    return;
  }
  
  isShuttingDown = true;
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  cleanup();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGHUP', () => handleShutdown('SIGHUP'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  cleanup();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup();
});

async function main() {
  console.log('🚀 Starting MCP Desktop Application (Integrated Architecture)');
  console.log('📝 Note: Using new integrated MCP service - no external Node.js dependencies required!');
  
  // Get an available port for the frontend
  let frontendPort = 34327;
  try {
    const getPort = require('get-port');
    // Try to get port 3000, but use an available one if it's taken
    frontendPort = await getPort({ port: [34327, 34328, 34329] });
    console.log(`\n🔍 Using port ${frontendPort} for frontend development server`);
  } catch (error) {
    console.log('\n⚠️  get-port not available, using default port 3000');
  }
  
  // Start frontend dev server on the chosen port
  const frontendEnv = {
    PORT: frontendPort.toString(),
    NEXT_PORT: frontendPort.toString()
  };
  const frontendProc = startProcess('Frontend', 'npm', ['run', 'dev'], path.join(__dirname, 'frontend'), frontendEnv);
  
  // Wait for the frontend to boot
  console.log('\n⏳ Waiting for frontend development server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  // Start Electron with the frontend port
  console.log('\n🖥️  Starting Electron with integrated MCP service...');
  console.log(`📁 Working directory: ${__dirname}`);
  
  const electronEnv = {
    NEXT_PORT: frontendPort.toString()
  };
  
  // Use the project-local electron binary to avoid npx resolution issues
  const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
  console.log(`🔧 Electron path: ${electronPath}`);
  
  // Validate the electron binary exists
  if (!require('fs').existsSync(electronPath)) {
    console.error(`❌ Electron binary not found at ${electronPath}`);
    console.error('Please run "npm install" to install dependencies');
    process.exit(1);
  }
  
  const electronProc = startProcess('Electron', electronPath, ['.'], __dirname, electronEnv);
  
  // When Electron (UI) exits, clean up all processes
  electronProc.on('exit', (code) => {
    if (!isShuttingDown) {
      console.log(`\nElectron process exited with code ${code}, cleaning up all processes...`);
      cleanup();
    }
  });
  
  // Optional: Also monitor frontend process for unexpected exits
  frontendProc.on('exit', (code) => {
    if (!isShuttingDown && code !== 0) {
      console.log(`\nFrontend process exited unexpectedly with code ${code}, cleaning up all processes...`);
      cleanup();
    }
  });
  
  console.log('\n✅ Development environment started!');
  console.log(`🔧 Frontend: http://localhost:${frontendPort} (Next.js dev server)`);
  console.log('🖥️  Electron: Integrated MCP service with tray and shortcuts');
  console.log('📊 Service Status: Check the "Service Status" tab in the app');
  console.log('🛑 Press Ctrl+C to stop all services');
}

main().catch(console.error);
