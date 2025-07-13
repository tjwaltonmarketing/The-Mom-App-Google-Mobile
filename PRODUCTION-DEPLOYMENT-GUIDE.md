# Production Deployment Guide - The Mom App

## Current Status
✅ Application fully functional in development
✅ Authentication system working (parent + teen accounts)
✅ SMS notifications operational via Twilio
✅ Database schema complete with PostgreSQL
✅ Mobile app framework ready (needs production server URL)

## Deployment Steps

### 1. Environment Variables Required
Ensure these secrets are configured in production:
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
SENDGRID_API_KEY=SG....
SESSION_SECRET=<secure-random-string>
```

### 2. Production Configuration
The app is configured for production deployment:
- Express server serves both API and static files
- PostgreSQL database with Drizzle ORM
- Session management with secure cookies
- CORS enabled for mobile app access
- Environment-based configuration

### 3. Mobile App Update Process
After production deployment:

**A. Get Production URL**
- Deploy generates stable URL like: `https://your-app-name.replit.app`

**B. Update Mobile Configuration**
Update these files with production URL:
- `capacitor.config.ts`
- `android/app/src/main/assets/capacitor.config.json`
- `client/src/lib/queryClient.ts` (if hardcoded server)

**C. Mobile App Build**
```bash
# Update version for new build
echo "versionCode 31" >> android/variables.gradle

# Commit and push to trigger GitHub Actions
git add .
git commit -m "v31: Production deployment - connect to stable server"
git push origin main
```

### 4. Production Deployment Checklist
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Production URL obtained
- [ ] Mobile app configuration updated
- [ ] New mobile build created and uploaded to Google Play

## Expected Production Features
- **Web App**: Fully functional at production URL
- **Mobile App**: Connects to stable server, login works consistently
- **Notifications**: SMS via Twilio, email via SendGrid
- **Teen Accounts**: Invite system, gamification, read-only permissions
- **Parent Accounts**: Full family coordination, task assignment

## Mobile Login Fix
This deployment will resolve the Google Play Console login issues because:
1. **Stable Server**: Production URL doesn't change like development servers
2. **Proper CORS**: Production has correct cross-origin headers
3. **Session Persistence**: Cookies work correctly with HTTPS production domain
4. **Authentication**: All login endpoints tested and functional

## Next Steps
1. Click "Deploy" in Replit to get production URL
2. Update mobile configuration with production URL
3. Build version 31 of mobile app
4. Test login functionality on production mobile app
5. Upload to Google Play Console