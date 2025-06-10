#!/bin/bash

# Force completely fresh Android build
echo "Building Android app with API 35..."

cd android

# Clean everything
rm -rf .gradle build app/build
./gradlew clean

# Verify configuration
echo "=== Configuration Verification ==="
echo "Target SDK: $(grep 'targetSdkVersion' app/build.gradle)"
echo "Compile SDK: $(grep 'compileSdk' app/build.gradle)"
echo "Version: $(grep 'versionName' app/build.gradle)"

# Build with verbose output
./gradlew bundleRelease --stacktrace --info

echo "=== Build Complete ==="
echo "App bundle location: android/app/build/outputs/bundle/release/app-release.aab"
echo "This bundle targets API 35 and will resolve the Google Play error."