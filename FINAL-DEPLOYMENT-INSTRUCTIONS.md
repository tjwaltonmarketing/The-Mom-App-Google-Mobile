# CRITICAL: Certificate Mismatch Resolution

## Problem
Google Play expects certificate fingerprint: `C5:F1:BB:63:4B:D5:6D:F8:BC:AD:3B:EF:1E:51:D1:01:C2:85:1C:03`
Current build produces: `71:FE:96:50:B7:87:A3:26:05:7D:BD:E5:9D:41:D9:2F:0F:88:79:D5`

## Root Cause
The original app bundle was signed with a different keystore than what GitHub Actions is currently using.

## SOLUTION: Restore Original Keystore

### Step 1: Find Original Keystore
1. Go to Google Play Console → Your App → Release → Setup → App signing
2. Download the "Upload certificate" (.pem format)
3. Or find your first successful GitHub Actions build that created the original release
4. Download the "upload-keystore-backup" artifact from that build

### Step 2: Set GitHub Secret
1. If you have the original .jks keystore file:
   ```bash
   base64 -w 0 original-upload-keystore.jks
   ```
2. Go to GitHub repo → Settings → Secrets and variables → Actions
3. Add/Update secret: `UPLOAD_KEYSTORE_BASE64` with the base64 content

### Step 3: Alternative - Extract from Google Play
If the original keystore is lost:
1. Google Play Console → App signing → Upload certificate
2. Download the certificate (.pem or .der)
3. Convert to keystore format (requires original keystore password)

## IMMEDIATE ACTION REQUIRED
**DO NOT change the app signing key in Google Play Console** - this would break updates for all existing users.

Instead, we need to recreate the exact keystore that was used for the original release.

## Next Steps After Fix
1. Push changes to trigger new build with correct certificate
2. Verify certificate fingerprint matches: `C5:F1:BB:63:4B:D5:6D:F8:BC:AD:3B:EF:1E:51:D1:01:C2:85:1C:03`
3. Upload to Google Play Console
4. Release update to users seamlessly

## Status
- App version 1.4 ready with fixes
- Only blocked by certificate mismatch
- User experience preserved by avoiding key change