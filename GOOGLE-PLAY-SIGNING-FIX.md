# Fix Google Play Signing Issue

## Problem
Your app bundle is signed with the wrong certificate. Google Play expects:
```
SHA1: FD:0B:B9:B7:71:95:2A:A4:7D:5B:AF:D5:C8:10:1E:71:B3:D7:C1:FB
```

But your upload has:
```
SHA1: 7C:BF:AD:7B:8F:B9:7F:71:B3:8D:8E:B8:73:74:EF:AB:B7:85:90:12
```

## Root Cause
The GitHub Actions workflow generates a new signing key with each build, causing different certificate fingerprints. Google Play requires a consistent upload certificate.

## Solution: Set Up Persistent Keystore

### Step 1: Create and Save Your Keystore
1. Run the next GitHub Actions build (it will generate a new keystore)
2. Download the `upload-keystore-backup` artifact
3. Extract the `upload-keystore.jks` file

### Step 2: Add Keystore to GitHub Secrets
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `UPLOAD_KEYSTORE_BASE64`
5. Value: Run this command on your downloaded keystore:
   ```bash
   base64 -w 0 upload-keystore.jks
   ```
   Copy the entire base64 output as the secret value

### Step 3: Reset Google Play Console App Signing

#### Option A: Create New App Listing (Recommended)
1. Go to Google Play Console
2. Create a new app listing for "The Mom App"
3. Use the new app bundle with the consistent certificate
4. Upload your updated marketing materials

#### Option B: Contact Google Play Support
1. Go to Google Play Console Help
2. Request to reset app signing for your existing app
3. Explain the certificate mismatch issue
4. Provide both certificate fingerprints

### Step 4: Verify Fixed Build
1. Push any change to trigger GitHub Actions
2. Download the new app bundle
3. Verify the certificate fingerprint matches your expected one
4. Upload to Google Play Console

## Certificate Management Best Practices

### Keystore Security
- The upload keystore is stored securely in GitHub Secrets
- Google Play manages the final app signing key
- Never lose the upload keystore - it's required for all updates

### Consistent Builds
- All future builds will use the same upload certificate
- Certificate fingerprint will remain constant
- Google Play App Signing provides additional security

## Troubleshooting

### If Certificate Still Doesn't Match
1. Check that `UPLOAD_KEYSTORE_BASE64` secret is set correctly
2. Verify the base64 encoding was done without line wraps (`-w 0`)
3. Re-download and re-encode the keystore file

### If Build Fails After Adding Secret
1. Verify the secret name is exactly `UPLOAD_KEYSTORE_BASE64`
2. Check that the base64 string is complete
3. Review GitHub Actions logs for keystore errors

## Files Modified
- `.github/workflows/build-android.yml` - Updated signing process
- Added persistent keystore management
- Added backup artifacts for keystore recovery

## Next Steps After Fix
1. Set up the GitHub Secret with your keystore
2. Create new Google Play app listing or reset existing one
3. Upload the consistently signed app bundle
4. Continue with store listing using your marketing materials

The signing issue will be permanently resolved once the keystore is stored in GitHub Secrets.