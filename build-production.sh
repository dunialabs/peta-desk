#!/bin/bash
set -e  # stop on any failure
set -o pipefail

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging helpers
log_step() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "========================================="
echo "  Universal build + notarization workflow"
echo "========================================="
echo ""

# Step 1: build the frontend
log_step "Step 1/6: Build Next.js frontend..."
npm run build:frontend
if [ $? -eq 0 ]; then
    log_success "Frontend build finished: frontend/out/"
else
    log_error "Frontend build failed"
    exit 1
fi
echo ""

# Step 2: build dual-architecture .app
log_step "Step 2/6: Build universal .app (arm64 + x64)..."
log_warning "Using the dir target only produces .app files, saving 10-40 minutes."
log_warning "Parallel build: arm64 and x64 run together to save ~40-50% time."
# Set to false to skip code signing (testing only)
export CSC_IDENTITY_AUTO_DISCOVERY=true

# Parallel build for both architectures (config from electron-builder.yml)
log_step "  → Building arm64 and x64 in parallel..."
npx electron-builder --mac
if [ $? -ne 0 ]; then
    log_error "Build failed"
    exit 1
fi
log_success "Parallel build for arm64 and x64 completed"

# Rename x64 output directory (electron-builder defaults to mac/ instead of mac-x64/)
if [ -d "dist/mac" ]; then
    log_step "  → Renaming x64 output directory..."
    mv "dist/mac" "dist/mac-x64"
    log_success "x64 output directory renamed to mac-x64/"
fi

log_success "Universal build complete"
echo ""

# Step 3: verify .app files exist
log_step "Step 3/6: Verify .app files..."
if [ -d "dist/mac-arm64/Peta Desk.app" ]; then
    ARM64_SIZE=$(du -sh "dist/mac-arm64/Peta Desk.app" | cut -f1)
    log_success "arm64 .app found (size: $ARM64_SIZE)"
else
    log_error "arm64 .app missing: dist/mac-arm64/Peta Desk.app"
    exit 1
fi

if [ -d "dist/mac-x64/Peta Desk.app" ]; then
    X64_SIZE=$(du -sh "dist/mac-x64/Peta Desk.app" | cut -f1)
    log_success "x64 .app found (size: $X64_SIZE)"
else
    log_error "x64 .app missing: dist/mac-x64/Peta Desk.app"
    exit 1
fi
echo ""

# Step 4: notarize arm64
log_step "Step 4/6: Notarize arm64 build..."
log_warning "Notarization can take 5-15 minutes, please wait..."
./build-notarize.sh arm64
if [ $? -eq 0 ]; then
    log_success "arm64 notarization completed"
else
    log_error "arm64 notarization failed"
    exit 1
fi
echo ""

# Step 5: notarize x64
log_step "Step 5/6: Notarize x64 build..."
log_warning "Notarization can take 5-15 minutes, please wait..."
./build-notarize.sh x64
if [ $? -eq 0 ]; then
    log_success "x64 notarization completed"
else
    log_error "x64 notarization failed"
    exit 1
fi
echo ""

# Step 6: final report
log_step "Step 6/6: Final report..."
echo ""
echo "========================================="
echo "  Build and notarization complete!"
echo "========================================="
echo ""
echo "📦 Output files:"
echo ""

if [ -f "dist/Peta Desk-1.0.0-arm64.dmg" ]; then
    ARM64_DMG_SIZE=$(du -sh "dist/Peta Desk-1.0.0-arm64.dmg" | cut -f1)
    echo -e "  ${GREEN}✓${NC} dist/Peta Desk-1.0.0-arm64.dmg (${ARM64_DMG_SIZE}) - notarized"
fi

if [ -f "dist/Peta Desk-1.0.0-x64.dmg" ]; then
    X64_DMG_SIZE=$(du -sh "dist/Peta Desk-1.0.0-x64.dmg" | cut -f1)
    echo -e "  ${GREEN}✓${NC} dist/Peta Desk-1.0.0-x64.dmg (${X64_DMG_SIZE}) - notarized"
fi

echo ""
echo "🎉 All done!"
echo ""
echo "Distribution tips:"
echo "  - arm64 DMG: Apple Silicon Mac (M1/M2/M3)"
echo "  - x64 DMG: Intel Mac"
echo ""
