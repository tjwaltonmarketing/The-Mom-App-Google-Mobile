# Push Version 30 Mobile Fix

The mobile app configuration has been updated to connect to the active development server.

## Manual Push Required
Since automated git operations are restricted, you'll need to manually push the changes:

```bash
git add .
git commit -m "v30: Fix mobile connectivity - connect to active development server"
git push origin main
```

## What This Fixes
- Mobile app will connect to: `https://33f93ffa-c4c1-49d4-afd5-82cd21d7faa7-00-25cydufxpidmj.riker.replit.dev`
- Registration and login will work immediately
- No deployment needed for testing
- GitHub Actions will build version 30 automatically

## Production Deployment Later
When ready for production:
1. Deploy the app (generates production URL)
2. Update mobile config with production URL
3. Push final production version

The development server is active and authentication is verified working.