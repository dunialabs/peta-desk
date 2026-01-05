'use strict';

const path = require('path');
const { execFileSync } = require('child_process');

const KEYS_TO_REMOVE = [
  'NSBluetoothAlwaysUsageDescription',
  'NSBluetoothPeripheralUsageDescription',
  'NSCameraUsageDescription',
  'NSMicrophoneUsageDescription',
];

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const infoPlist = path.join(context.appOutDir, appName, 'Contents', 'Info.plist');

  for (const key of KEYS_TO_REMOVE) {
    try {
      execFileSync('/usr/libexec/PlistBuddy', ['-c', `Delete :${key}`, infoPlist], {
        stdio: 'ignore',
      });
    } catch (error) {
      // Ignore missing keys to keep build stable across Electron versions.
    }
  }
};
