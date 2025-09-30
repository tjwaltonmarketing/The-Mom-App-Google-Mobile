# How to Build Your Android APK (No Coding Required!)

Your app is now set up to build Android APKs automatically using GitHub Actions. Here's how to get your updated APK:

## One-Time Setup (Do this first)

### Step 1: Push your code to GitHub
1. Go to your Replit project
2. Click the version control icon (looks like branches)
3. Create a GitHub repository if you haven't already
4. Push all your code to GitHub

### Step 2: Create an Android signing key (Optional but recommended for Play Store)
If you want to publish to Google Play Store, you'll need a signing key. If you just want to test on your phone, you can skip this.

For Play Store:
1. You'll need to create an upload keystore (this is a file that signs your app)
2. Store these secrets in GitHub:
   - Go to your GitHub repository
   - Click Settings → Secrets and variables → Actions → New repository secret
   - Add these secrets:
     - `ANDROID_KEYSTORE_BASE64` (your keystore file converted to base64)
     - `ANDROID_KEYSTORE_PASSWORD` (password for the keystore)
     - `ANDROID_KEY_ALIAS` (alias name)
     - `ANDROID_KEY_PASSWORD` (key password)

## How to Build a New APK

### Option 1: Manual Build (Easiest)
1. Go to your GitHub repository
2. Click on "Actions" tab at the top
3. Click "Build Android APK" on the left
4. Click "Run workflow" button (on the right)
5. Click the green "Run workflow" button
6. Wait 5-10 minutes for the build to complete
7. When done, click on the completed workflow run
8. Scroll down to "Artifacts" section
9. Download the `android-apk` file
10. Extract the ZIP to get your APK file

### Option 2: Automatic Build with Version Tags
1. In Replit, open the Shell
2. Type: `git tag v1.0.0` (change the version number as needed)
3. Type: `git push --tags`
4. This will automatically trigger a build
5. Check GitHub Actions to download your APK (see steps 7-10 above)

## Installing the APK on Your Phone

1. Download the APK file from GitHub Actions
2. Transfer it to your Android phone
3. Open the APK file on your phone
4. You may need to allow "Install from unknown sources" in your phone settings
5. Follow the installation prompts

## Important Notes

- **No coding required!** Just click buttons in GitHub
- **Free to use** - GitHub Actions gives you free build minutes
- **Automatic updates** - Every time you push code changes to GitHub, you can trigger a new build
- **Safe and secure** - Your signing keys are stored securely in GitHub Secrets

## Troubleshooting

**Build failed?**
- Check the GitHub Actions logs for details
- Make sure all your code is pushed to GitHub
- Verify your secrets are set correctly (if using signing)

**Can't install APK on phone?**
- Enable "Install from unknown sources" in Android settings
- Make sure you have enough storage space
- Try uninstalling the old version first

## Need Help?

If the build fails or you need assistance, you can check the GitHub Actions logs which will show exactly what went wrong.
