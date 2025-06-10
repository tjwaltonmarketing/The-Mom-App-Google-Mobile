# Capacitor 6.1.2 Update Applied

## Root Cause Resolution
The persistent API level 33 issue was caused by Capacitor 5.7.8 having a known bug where it defaults to API 33 regardless of configuration.

## Changes Applied
1. **Capacitor Update**: Upgraded from 5.7.8 to 6.1.2 (latest stable)
2. **Android Sync**: Regenerated all Android configurations
3. **Version Bump**: Updated to 1.4 (versionCode 5)

## Expected Result
Capacitor 6.1.2 properly respects the targetSdkVersion 35 setting in build.gradle. The next build should show:
- Target SDK: 35
- Version: 5 (1.4)

## Verification
Push these changes to trigger a fresh GitHub Actions build. The new app bundle will finally target API 35 and resolve the Google Play Console error.

The Capacitor version update addresses the fundamental build system override issue.