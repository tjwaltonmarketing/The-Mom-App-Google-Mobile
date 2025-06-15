#!/bin/bash

# Push version 30 with mobile connectivity fix
echo "Pushing mobile app connectivity fix..."

# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "v30: Fix mobile app connectivity - point to active development server

- Update mobile configuration to use current development server
- Enable immediate mobile app testing without deployment
- Maintain fallback server list for resilience
- Ready for production deployment when needed"

# Push to main branch (triggers GitHub Actions)
git push origin main

echo "✅ Version 30 pushed successfully"
echo "📱 GitHub Actions will build new mobile app automatically"
echo "🔗 Mobile app will connect to: https://33f93ffa-c4c1-49d4-afd5-82cd21d7faa7-00-25cydufxpidmj.riker.replit.dev"