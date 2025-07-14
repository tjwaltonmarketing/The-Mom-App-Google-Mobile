import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.momapp.family',
  appName: 'The Mom App',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: 'https://the-mom-app.replit.app'
  },
  android: {
    buildOptions: {
      keystorePath: 'upload-keystore.jks',
      keystorePassword: 'android',
      keystoreAlias: 'upload',
      keystoreAliasPassword: 'android',
      releaseType: 'AAB'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
