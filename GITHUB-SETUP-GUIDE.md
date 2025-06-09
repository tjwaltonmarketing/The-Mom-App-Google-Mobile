# GitHub Setup for Automated Android Building

## Step 1: Create New Repository

1. Go to https://github.com and click "New" repository
2. Name it: `the-mom-app`
3. Make it **Public** (required for free GitHub Actions)
4. Don't initialize with README (your project already has files)
5. Click "Create repository"

## Step 2: Connect Replit to GitHub

1. In Replit, click the version control icon (looks like branching lines) in the left sidebar
2. Click "Create a Git Repo"
3. Click "Connect to GitHub"
4. Select your new `the-mom-app` repository
5. Click "Connect"

## Step 3: Push Your Code

1. In Replit's Git panel, you'll see all your files listed
2. Add a commit message: "Initial release - THE MOM APP ready for Google Play"
3. Click "Commit & push"

## Step 4: Trigger the Build

1. Go to your GitHub repository: https://github.com/yourusername/the-mom-app
2. Click "Actions" tab at the top
3. You'll see "Build Android App" workflow
4. Click "Run workflow" if it hasn't started automatically

## Step 5: Download Your App Files

After the build completes (takes about 10-15 minutes):

1. In GitHub Actions, click on the completed build
2. Scroll down to "Artifacts" section
3. Download **app-bundle** (this is your .aab file for Google Play)
4. Download **app-apk** (backup .apk file)

## Step 6: Upload to Google Play

1. Go to Google Play Console
2. Upload the .aab file from the "app-bundle" download
3. Use all the store listing content from your project files
4. Submit for review

The automated build handles all the complex Android compilation. You just upload the finished files to Google Play Store.

## If Build Fails

- Check the "Actions" tab for error messages
- Most issues are dependency-related and resolve on retry
- Click "Re-run failed jobs" to try again