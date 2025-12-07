#!/bin/bash

# https://developer.apple.com/documentation/security/customizing-the-notarization-workflow

ARCH=$1

if [ -z "$ARCH" ]; then
    echo "Error: architecture is required"
    echo "Usage: ./build-notarize.sh [arm64|x64]"
    exit 1
fi

if [ "$ARCH" != "arm64" ] && [ "$ARCH" != "x64" ]; then
    echo "Error: architecture must be 'arm64' or 'x64'"
    exit 1
fi

echo "========================================="
echo "  Notarizing ${ARCH} build"
echo "========================================="
echo ""

# Config
# KEYCHAIN_PROFILE="notarytool-password"
# Create an app-specific password and store credentials:
# xcrun notarytool store-credentials "notarytool-password" \\
#   --apple-id "<AppleID>" \\
#   --team-id "<DeveloperTeamID>" \\
#   --password "<app-specific-password>"

KEYCHAIN_PROFILE="notarytool-password"
APP_NAME="Peta Desk"
VERSION=$(node -p "require('./package.json').version")
EXPORT_PATH="dist"
DMG_NAME="${APP_NAME}-${VERSION}-${ARCH}.dmg"
DMG_PATH="${EXPORT_PATH}/${DMG_NAME}"
APP_PATH="${EXPORT_PATH}/mac-${ARCH}/${APP_NAME}.app"
TEMP_DIR="${EXPORT_PATH}/temp_dmg_${ARCH}"
RESPONSE_PATH="${EXPORT_PATH}/notarization_response_${ARCH}.plist"
LOG_PATH="${EXPORT_PATH}/notarization_log_${ARCH}.json"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

notify() {
    osascript -e "display notification \"$1\" with title \"PETA Notarization\""
}

error_exit() {
    log "❌ Error: $1"
    notify "Notarization failed: $1"
    exit 1
}

log "Checking required files..."
log "Architecture: $ARCH"
log "App path: $APP_PATH"
log "Output DMG: $DMG_NAME"

if [ ! -d "$APP_PATH" ]; then
    error_exit "App bundle missing: $APP_PATH"
fi

if [ ! -d "$EXPORT_PATH" ]; then
    error_exit "Export directory missing: $EXPORT_PATH"
fi

# Cleanup temp dir
if [ -d "$TEMP_DIR" ]; then
    log "Cleaning temp directory..."
    rm -rf "$TEMP_DIR"
fi

log "Creating temp directory structure..."
mkdir -p "$TEMP_DIR"

log "Copying app bundle..."
cp -R "$APP_PATH" "$TEMP_DIR/"

log "Creating Applications symlink..."
ln -s /Applications "$TEMP_DIR/Applications"

if [ -f "$DMG_PATH" ]; then
    log "Removing existing DMG..."
    rm "$DMG_PATH"
fi

log "Creating DMG..."
hdiutil create -volname "$APP_NAME" -srcfolder "$TEMP_DIR" -ov -format UDZO "$DMG_PATH"

if [ $? -ne 0 ]; then
    error_exit "DMG creation failed"
fi

log "✅ DMG created: $DMG_PATH"

log "Cleaning temp directory..."
rm -rf "$TEMP_DIR"

log "Submitting for notarization..."
xcrun notarytool submit "$DMG_PATH" --keychain-profile "$KEYCHAIN_PROFILE" --wait --timeout 1h --output-format plist > "$RESPONSE_PATH"

if [ $? -ne 0 ]; then
    error_exit "Notarization submission failed"
fi

log "Parsing notarization response..."
if [ ! -f "$RESPONSE_PATH" ]; then
    error_exit "Notarization response missing"
fi

message=$(/usr/libexec/PlistBuddy -c "Print :message" "$RESPONSE_PATH" 2>/dev/null)
status=$(/usr/libexec/PlistBuddy -c "Print :status" "$RESPONSE_PATH" 2>/dev/null)
SUBMISSION_ID=$(/usr/libexec/PlistBuddy -c "Print :id" "$RESPONSE_PATH" 2>/dev/null)

log "Status: $status - $message"

if [[ "$status" != "Accepted" ]]; then
    log "❌ Notarization failed, fetching detailed log..."
    if [ -n "$SUBMISSION_ID" ]; then
        xcrun notarytool log "$SUBMISSION_ID" --keychain-profile "$KEYCHAIN_PROFILE" "$LOG_PATH"
        log "Detailed log saved to: $LOG_PATH"
    fi
    notify "Notarization failed: $status - $message"
    error_exit "Notarization rejected: $message"
fi

log "Stapling ticket..."
xcrun stapler staple "$DMG_PATH"

if [ $? -ne 0 ]; then
    error_exit "Stapling failed"
fi

log "Validating ticket..."
xcrun stapler validate "$DMG_PATH"

if [ $? -eq 0 ]; then
    log "✅ Ticket validation succeeded"
else
    log "⚠️  Ticket validation failed, but DMG was created"
fi

if [ -f "$RESPONSE_PATH" ]; then
    rm "$RESPONSE_PATH"
fi

log "✅ Notarization complete: $DMG_PATH"
notify "Notarization complete!"

log "Opening output directory..."
open "$EXPORT_PATH"

log "🎉 Done!"
log "DMG path: $DMG_PATH"
