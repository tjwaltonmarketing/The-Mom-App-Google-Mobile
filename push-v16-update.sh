#!/bin/bash

# Push Version 16 Update with Mobile Connectivity Fixes
echo "🚀 Pushing Version 16 - Enhanced Mobile Connectivity"

# Add all changes
git add .

# Commit with detailed message
git commit -m "Version 16: Enhanced Mobile Connectivity & Diagnostics

✨ New Features:
- Real-time connection status on login screen
- Manual connection testing with retry mechanism
- Multi-server fallback system
- Enhanced error messages with server details
- Connection diagnostics and monitoring

🔧 Technical Improvements:
- Health check endpoint with detailed server status
- Mobile-specific error handling and recovery
- Password visibility toggles maintained
- Password confirmation validation maintained

📱 Mobile App Enhancements:
- Better handling of 'Failed to fetch' errors
- Visual connection status indicators
- Automatic connectivity testing on app launch
- Manual retry functionality for users

🔢 Version Details:
- versionCode: 16 (increased from 15)
- versionName: 2.3
- Build ready for Google Play Console"

# Push to GitHub
git push origin main

echo "✅ Version 16 pushed to GitHub successfully!"
echo "📱 Ready to build mobile app with enhanced connectivity features"