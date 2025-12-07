#!/bin/bash

echo "Building MCP Desktop App without code signing..."

# Note: Shared module removed (integrated architecture)

# Build frontend
echo "Building frontend..."
cd frontend && npm run build && cd ..
if [ $? -ne 0 ]; then
  echo "Failed to build frontend"
  exit 1
fi
echo "✅ Frontend built successfully"

# Build Electron app without code signing
echo "Building Electron app..."
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build

echo "Build complete! Check the dist/ directory for the output."