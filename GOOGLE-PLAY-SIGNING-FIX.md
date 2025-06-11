# Google Play Signing Certificate Fix

## Issue
Google Play Console shows signature mismatch when uploading new app bundle.

## Root Cause
Google Play Console expects the same upload certificate that was used for the original release.

## Solution Steps

### 1. Check GitHub Secrets
Verify that `UPLOAD_KEYSTORE_BASE64` secret is set in your GitHub repository:
- Go to GitHub repo → Settings → Secrets and variables → Actions
- Confirm `UPLOAD_KEYSTORE_BASE64` exists

### 2. If Secret Missing - Extract from Previous Build
Download the keystore from your first successful build:
- Go to GitHub Actions → Find successful build → Download "upload-keystore-backup"
- Convert to base64: `base64 -w 0 upload-keystore.jks`
- Add as GitHub secret: `UPLOAD_KEYSTORE_BASE64`

### 3. Alternative: Use Google Play App Signing
If using Google Play App Signing (recommended):
- Google Play Console → Your App → Release → Setup → App signing
- Download the "Upload certificate" (.der or .pem format)
- This is the certificate Google expects for all uploads

### 4. Verify Certificate Match
The upload certificate fingerprint must match what's registered with Google Play:
- SHA-1: (from Google Play Console)
- SHA-256: (from Google Play Console)

## Current Build Configuration
- Version: 1.4 (versionCode 5)
- Target SDK: 35
- Signing: Upload certificate for Google Play App Signing
- Build triggered by: GitHub Actions push to main/master

## Next Steps
1. Push changes to trigger new build
2. Download signed app bundle
3. Upload to Google Play Console Production track
4. Verify signature acceptance

The GitHub Actions workflow is properly configured to use the upload certificate for Google Play App Signing.