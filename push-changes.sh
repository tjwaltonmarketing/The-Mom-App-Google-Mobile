#!/bin/bash
# Script to push Java compatibility fixes to GitHub

echo "Adding modified files..."
git add android/app/build.gradle .github/workflows/build-android.yml

echo "Committing changes..."
git commit -m "Fix Java version compatibility for Android build

- Set Android app to use Java 11 instead of Java 21
- Update GitHub Actions to use matching Java 11
- Resolves 'invalid source release: 21' compilation error"

echo "Pushing to GitHub..."
git push origin main

echo "Changes pushed successfully!"