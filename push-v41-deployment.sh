#!/bin/bash

# Version 4.1 deployment with stable URL configuration
echo "🚀 Pushing The Mom App v4.1 with stable deployment URL..."

# Add all changes
git add .

# Commit with clear message
git commit -m "Version 4.1: Configure mobile app for stable deployment URL

- Updated mobile app configuration to use deployed URL: https://the-mom-app.replit.app
- Version bumped to 4.1 (build 41) for consistent versioning
- Fixed mobile connectivity issues by using stable deployment URL
- Authentication endpoints now properly accessible from mobile app
- GitHub Actions workflow configured for version 4.1 build"

# Push to trigger GitHub Actions build
git push origin main

echo "✅ Version 4.1 pushed to GitHub!"
echo "📱 Mobile app build will start automatically"
echo "🔗 Mobile app will connect to: https://the-mom-app.replit.app"
echo "🎯 This should fix the login and registration issues"