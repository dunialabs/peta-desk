const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCommand(command, cwd = process.cwd()) {
  console.log(`Running: ${command} in ${cwd}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    console.error(`Failed to run: ${command}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Installing MCP Desktop Application dependencies (Integrated Architecture)...');
  console.log('📝 Note: No longer installing gateway/host dependencies - using integrated MCP service!');
  
  // Skip root installation if already running from postinstall
  if (!process.env.npm_lifecycle_event) {
    console.log('\n=== Installing root dependencies ===');
    runCommand('npm install --registry=https://registry.npmmirror.com');
  }
  
  // Install frontend dependencies
  console.log('\n=== Installing frontend dependencies ===');
  runCommand('npm install --registry=https://registry.npmmirror.com', path.join(__dirname, 'frontend'));
  
  console.log('\n✅ All dependencies installed successfully!');
  console.log('\n🎯 Integrated Architecture Benefits:');
  console.log('   • No external Node.js dependencies');
  console.log('   • Faster startup and communication');
  console.log('   • Single Electron process');
  console.log('\nNext steps:');
  console.log('1. Run "npm run build:frontend" to build the frontend');
  console.log('2. Run "npm run dev" to start the development environment');
  console.log('3. Run "npm run build" to create production build');
}

main().catch(console.error);