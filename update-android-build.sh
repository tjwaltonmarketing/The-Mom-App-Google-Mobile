#!/bin/bash
echo "Pushing Android SDK improvements to GitHub..."

# Add the updated workflow file
git add .github/workflows/build-android.yml

# Commit with descriptive message
git commit -m "Improve Android SDK setup and licensing

- Add specific API level 33 and build tools 33.0.0
- Include NDK version specification
- Add automatic SDK license acceptance
- Resolve Android SDK command-line tools issues"

# Push to trigger new build
git push origin main

echo "Android SDK improvements pushed successfully!"