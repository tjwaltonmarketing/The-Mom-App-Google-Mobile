# The Mom App

## Overview
The Mom App is a comprehensive family coordination platform designed to reduce mental load for busy parents. It is a full-stack web application with mobile support, featuring AI-powered assistance, smart calendar management with granular privacy controls, advanced task organization, and secure family data management. The project's vision is to streamline family logistics, enhance communication, and foster collaboration among family members, ultimately improving daily life for busy households.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- Frontend: React with TypeScript, Vite build system
- UI Framework: Shadcn/UI components with Tailwind CSS for a modern and responsive design.
- Multi-user dashboard with real-time updates.
- Role-based permissions (mom, dad, child, etc.).
- Family member management with color coding and avatars.
- Centralized communication and information sharing.
- Smart Calendar: Features shared, busy, and private event types with selective sharing.
- Teen Interface: Dedicated dashboard with tab navigation (Home, Tasks, Calendar), accessibility features (dark mode, blue light filter), and read-only access for certain features.

### Technical Implementations
- Backend: Express.js with TypeScript.
- Database: PostgreSQL with Drizzle ORM.
- Authentication: Express-session with bcrypt for password hashing and secure cookies. JWT token generation for API access.
- Mobile: Capacitor for Android/iOS builds, ensuring cross-platform compatibility.
- AI Integration: OpenAI API for voice transcription, natural language processing for task creation, and context-aware smart assistance.
- Voice Processing Pipeline: Browser speech recognition captures audio, real-time transcription to text, AI processing for action extraction, smart suggestions for tasks/events/reminders, and one-click creation.
- Data Flow: Session-based authentication, family membership validation for data access, multi-tenancy architecture ensuring data isolation per family.
- Secure Data Management: Family password vault with encrypted storage, import/export functionality, and role-based access controls.
- CI/CD: Automated Android APK/AAB build workflow via GitHub Actions.

### Feature Specifications
- **Smart Calendar with Privacy Controls**: Supports shared events (full details), busy events (time blocked), and private events (hidden). Includes selective sharing and Google Calendar sync integration.
- **AI-Powered Task Management**: Voice-to-task conversion, smart task assignment based on family roles, priority tracking, and due date management. Includes parent-to-teen task assignment with points and gamification.
- **Voice Assistant Features**: Real-time speech recognition, AI transcription with smart action suggestions, searchable voice notes.
- **Secure Data Management**: Encrypted family password vault, import/export, role-based access.
- **Family Coordination Hub**: Multi-user dashboard, role-based permissions, family member management, centralized communication.
- **Teen System**: Comprehensive invite workflow (SMS/email), teen dashboard with gamification (points, streaks, achievements), smart notification engine with progressive reminders and quiet hours, parent oversight without nagging, permission-based access controls, and shared meal planning display.
- **Feedback & Feature Request System**: In-app system for general feedback, feature requests, and bug reports.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless recommended).
- **AI Services**: OpenAI API for transcription and assistance.
- **Mobile Builds**: Capacitor for Android/iOS.
- **Push Notifications**: Custom native FCM plugin (FCMPlugin.java + MomAppMessagingService.java) in android/app/src/main/java/com/momapp/family/. Uses firebase-messaging:23.3.1 directly (not the Capacitor push-notifications plugin, which was removed due to native crashes). NOTE: If running `npx cap sync`, re-remove `capacitor-push-notifications` from capacitor.build.gradle and capacitor.settings.gradle.
- **CRITICAL - Native Android Overrides**: The GitHub Actions build (`build-android.yml`) deletes and regenerates the `android/` folder on every build via `npx cap add android`. All custom native Java files, AndroidManifest.xml, and google-services.json are stored in `native-overrides/` and copied back in the "Restore custom native files" build step. **Any changes to native Android files MUST be updated in BOTH `android/` (for local dev) AND `native-overrides/` (for CI builds).**
- **iOS In-App Purchases**: RevenueCat SDK (native Swift plugin `RevenueCatPlugin.swift`) for Apple IAP subscriptions. Uses RevenueCat iOS SDK v5+ via CocoaPods. Product IDs: `com.momapp.individual.monthly`, `com.momapp.individual.yearly`, `com.momapp.family.monthly`, `com.momapp.family.yearly`. Public API key stored in `VITE_REVENUECAT_APPLE_API_KEY`. Server endpoints: `/api/subscription/apple-purchase` and `/api/subscription/apple-restore`. The `user_subscriptions` table has `apple_product_id` field for tracking iOS purchases. NOTE: "Share on social media for 7 extra days" trial bonus must be hidden on iOS (Apple controls trial period).
- **Android In-App Purchases (Google Play Billing)**: RevenueCat SDK v7+ via native Java plugin `RevenueCatPlugin.java` (same product IDs as iOS). API key stored in `VITE_REVENUECAT_GOOGLE_API_KEY` (starts with `goog_`). Plugin registered in `MainActivity.java`. SDK added to app/build.gradle via CI workflow (`com.revenuecat.purchases:purchases:7.+`). Server endpoints: `/api/subscription/google-purchase` and `/api/subscription/google-restore`. Front-end: `client/src/services/revenuecat.ts` supports both platforms; upgrade.tsx shows Google Play branding on Android. Onboarding: Android (and iOS) users go through RevenueCat purchase flow upfront during onboarding (payment commitment + trial), same as Stripe for web. Upgrade page also handles billing for expired/cancelled subscriptions. Build version bumped to 10.9 (versionCode 109). NOTE: Requires setup in RevenueCat dashboard — add Google Play app and get Android API key. Social share trial extension hidden on Android (Google Play controls trial period).
- **SMS Services**: Twilio (primary), AWS SNS (backup) for notifications.
- **Email Services**: SendGrid.
- **Calendar Integration**: Google Calendar API for synchronization.
- **Weather Data**: Open-Meteo API.