#!/bin/bash

# Push Version 25 - Mobile Connection Fix Final
echo "🚀 Pushing Version 25 - Mobile Authentication & Connection Fix"

# Add all changes
git add .

# Commit with comprehensive message
git commit -m "Version 25: Mobile Authentication & Connection Fix Final

📱 Version Details:
- versionCode: 25 (fixed GitHub workflow override)
- versionName: 2.5
- Authentication system verified working

🔧 Mobile Connection Fixes:
- Updated API endpoint to active development server
- Fixed GitHub workflow version override (was forcing v15)
- Multi-server fallback system with diagnostics
- Real-time connection status indicators

✅ Authentication System:
- Login/registration endpoints tested and working
- Session management with cookies and JWT tokens
- Password hashing and verification confirmed
- Health check endpoint responding

🎯 Mobile App Features:
- Connection diagnostics on login screen
- Manual connection testing with retry
- Enhanced error reporting with server details
- Password visibility toggles and confirmation

Ready for mobile app build with working authentication."

# Push to GitHub
git push origin main

echo "✅ Version 25 with mobile connection fix pushed to GitHub!"
echo "📱 Mobile app will now connect to active server"
echo "🔐 Authentication system ready and verified"