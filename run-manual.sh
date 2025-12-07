#!/bin/bash

# Create log directory
mkdir -p logs

echo "🚀 Starting MCP Desktop App (Integrated Architecture)..."
echo "📝 Note: Using new integrated MCP service - no external Node.js dependencies!"

# Kill any existing processes
pkill -f "next.*dev"
pkill -f "electron"

# Start Frontend development server
echo "Starting frontend development server..."
cd frontend && npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "⏳ Waiting for frontend to be ready..."
sleep 8

# Start Electron with integrated MCP service
echo "🖥️  Starting Electron with integrated MCP service..."
npx electron . > logs/electron.log 2>&1 &
ELECTRON_PID=$!

echo "✅ Development environment started!"
echo "Frontend PID: $FRONTEND_PID"
echo "Electron PID: $ELECTRON_PID"
echo ""
echo "🎯 Integrated Architecture Benefits:"
echo "   • No external Node.js dependencies"
echo "   • Faster startup and communication"
echo "   • Single Electron process"
echo ""
echo "Services available:"
echo "- Frontend Dev Server: http://localhost:3000"
echo "- Electron App: Integrated MCP service with tray and shortcuts"
echo "- Service Status: Check the 'Service Status' tab in the app"
echo ""
echo "Log files are in the logs/ directory"
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo "Stopping services..."
    kill $FRONTEND_PID $ELECTRON_PID 2>/dev/null
    pkill -f "next.*dev" 2>/dev/null
    pkill -f "electron" 2>/dev/null
    exit 0
}

# Set trap to cleanup on interrupt
trap cleanup INT TERM

# Wait for user interrupt
wait