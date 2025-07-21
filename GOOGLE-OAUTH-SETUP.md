# Google OAuth Setup for Calendar Integration

## Current Status
The Mom App has Google OAuth credentials configured but requires verification for production calendar access.

## Why Google OAuth Verification is Required

Google requires apps that access sensitive user data (like calendars) to undergo a verification process to ensure:
- Security and privacy compliance
- Proper handling of user data
- Adherence to Google's developer policies

## Current Setup

✅ **Configured Credentials:**
- Client ID: `814173562340-v67996dc44fhcgp44fd382vfl43tnvau.apps.googleusercontent.com`
- Redirect URI: `https://workspace.tjwaltonmarketi.repl.co/auth/google/callback`
- Scopes: Calendar read access, user email

❌ **Missing:** Google OAuth app verification

## Error Messages Explained

### "403: disallowed_useragent"
This error occurs because:
1. The app is unverified
2. Google blocks unverified apps from accessing sensitive scopes
3. Calendar data is considered sensitive by Google

## Current Workaround

The app now gracefully handles the OAuth error by:
1. Detecting the verification requirement
2. Switching to demo mode with simulated calendar data
3. Providing clear user feedback about the limitation

## Steps for Production Verification

To enable real Google Calendar sync in production:

### 1. App Verification Process
- Submit app for Google OAuth verification
- Provide privacy policy and terms of service
- Complete security questionnaire
- Undergo Google's security review (2-6 weeks)

### 2. Required Documentation
- Privacy Policy URL
- Terms of Service URL
- App homepage with clear functionality description
- Scope justification explaining why calendar access is needed

### 3. Domain Verification
- Verify ownership of the domain hosting the app
- Ensure HTTPS is properly configured
- Set up proper OAuth consent screen

## Alternative Solutions

### Option 1: Use Service Account (Server-to-Server)
- For organization-wide calendar access
- Requires Google Workspace admin setup
- No user consent required once configured

### Option 2: Limited Testing
- Add specific user emails to test users list
- Allows testing with up to 100 users before verification
- Good for beta testing with family/friends

### Option 3: Publish Status
- Set OAuth consent screen to "In Production"
- Allows unverified access but shows warning to users
- Limited to 100 users total

## Current Demo Mode Features

The app currently simulates:
- ✅ Calendar connection status
- ✅ Multiple calendar selection
- ✅ Sync direction options
- ✅ Auto-sync toggle
- ✅ Calendar list display

Ready for real integration once verification is complete.

## Next Steps for Real Integration

1. **Complete Google verification process**
2. **Update OAuth scopes** for read/write access
3. **Implement real calendar sync** with proper token management
4. **Add calendar event import/export** functionality
5. **Set up webhook notifications** for real-time sync

## Test the Current Setup

The calendar sync now provides clear feedback about the verification requirement and switches to demo mode automatically. Users can test all sync functionality except actual Google Calendar data access.