#!/bin/bash

echo "🚀 Building optimized production app..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf frontend/out
rm -rf frontend/.next

# Build frontend with optimizations
echo "📦 Building frontend (optimized)..."
cd frontend
NODE_ENV=production npm run build
cd ..

# Check if frontend build succeeded
if [ ! -d "frontend/out" ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi

echo "✅ Frontend built successfully"

# Build Electron app with normal compression
echo "📦 Building Electron app (normal compression)..."
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run build:mac

if [ $? -eq 0 ]; then
  echo "✅ Build completed successfully!"
  echo "📂 Output: $(pwd)/dist"
  ls -lh dist/
else
  echo "❌ Build failed!"
  exit 1
fi
