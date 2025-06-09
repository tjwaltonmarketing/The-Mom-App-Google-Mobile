#!/bin/bash
echo "Fixing Android SDK path conflicts..."

git add .github/workflows/build-android.yml android/app/build.gradle

git commit -m "Fix Android SDK path conflicts and Java version alignment

- Use standard android-actions/setup-android@v3
- Set consistent environment variables for ANDROID_HOME and ANDROID_SDK_ROOT
- Update both workflow and app to use Java 17
- Resolve conflicting SDK path references"

git push origin main

echo "SDK path fixes pushed successfully!"