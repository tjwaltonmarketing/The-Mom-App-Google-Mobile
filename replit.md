# The Mom App

## Overview
The Mom App is a comprehensive family coordination platform designed to reduce mental load for busy parents. It is a full-stack web application with mobile support, featuring AI-powered assistance, smart calendar management with granular privacy controls, advanced task organization, and secure family data management. The project's vision is to streamline family logistics, enhance communication, and foster collaboration among family members, ultimately improving daily life for busy households.

## Recent Changes (October 3, 2025)
- **📅 Google Calendar Import Feature**: Implemented full one-way import functionality with OAuth authentication, calendar selection, and event import (commented out in UI)
- **🔒 Google OAuth Limitations**: Feature requires Google OAuth verification to work for all users - currently only works for test users added in Google Cloud Console
- **🚀 Launch Decision**: Hidden Google Calendar import feature from Settings and Calendar pages until Google OAuth verification is complete (can take 2-8 weeks)
- **📝 Future Enhancement**: Feature code remains in codebase (server/google-calendar-service.ts, client/src/components/calendar-sync.tsx) for easy re-enablement after verification
- **⚠️ REMEMBER**: To re-enable, uncomment CalendarSync imports and components in settings.tsx and calendar.tsx after completing Google's verification process

## Previous Changes (October 1, 2025)
- **🚀 PRODUCTION DEPLOYMENT PREPARATION**: Prepared application for Google Play Store deployment with complete mobile app configuration
- **📱 Splash Screen Added**: Implemented professional 3-second splash screen for mobile app with full-screen immersive display featuring app logo across all Android density configurations
- **🤖 GitHub Actions CI/CD**: Created automated Android APK/AAB build workflow enabling non-technical users to build releases via one-click GitHub Actions triggers without local Android SDK
- **🔒 Security Enhancement**: Removed hardcoded keystore credentials from source control; GitHub Actions now uses secure environment secrets for signing
- **🧹 Code Cleanup**: Fixed duplicate `updateUserSubscription` method and duplicate imports in storage.ts to eliminate build warnings
- **✅ Deployment Readiness Verified**: All environment secrets confirmed (DATABASE_URL, OpenAI, Stripe, SendGrid, Twilio), app runs successfully, ready for backend deployment
- **⚠️ DEPLOYMENT NOTE**: Mobile app connects to deployed backend at `the-mom-app.replit.app` - backend must be published for APK updates to work

## Previous Changes (September 23, 2025)
- **🎯 MAJOR ARCHITECTURAL SIMPLIFICATION - Task Management System**: Transformed from complex child account management to simple family member-grouped task view to reduce mental load
- **Child Account System Removed**: Eliminated complex child profile creation, management, and authentication system that was adding unnecessary complexity
- **Simplified Task Organization**: Implemented family member-grouped task sections with collapsible functionality (Emily's Tasks, TJ's Tasks, Adri's Tasks, Evie's Tasks, Unassigned Tasks)
- **Printable Task Lists Added**: Created kid-friendly printable task lists with award-style design, emojis, and wall-posting format for children without devices
- **Mental Load Reduction Achieved**: Users can now easily view and manage tasks by family member without navigating complex account systems
- **Code Cleanup Completed**: Removed all child profile state variables, queries, mutations, handlers, and UI components from settings page
- **⚠️ DESIGN PRINCIPLE CONFIRMED**: Features must reduce mental load, not add complexity - simple family member grouping proved more effective than sophisticated child account system

## Previous Changes (September 21, 2025)
- **🎯 CRITICAL FIX - React Query Cache Invalidation Issue**: Resolved persistent task creation cache refresh problem where newly created tasks wouldn't appear in UI until navigation refresh
- **Root Cause Identified**: Multiple QueryClient instances caused cache invalidations to target wrong client - components imported singleton queryClient while useQuery/useMutation used QueryClientProvider instance
- **Expert Solution Implemented**: 
  - **Fixed Client Instance**: Replaced singleton imports with `useQueryClient()` hook in all components (task-modal.tsx, advanced-task-management.tsx)
  - **Added Explicit Refetch**: Used `refetchType: "all"` and `exact: true` in invalidateQueries calls to ensure reliable cache updates
  - **Removed Problematic Settings**: Eliminated `gcTime: 0` that caused timing issues and query garbage collection problems
- **⚠️ REMEMBER FOR FUTURE PROFILES**: If experiencing cache refresh issues where mutations don't update UI immediately, check for QueryClient instance mismatches and use the same solution pattern

## Previous Changes (August 19, 2025)
- **Fixed Critical Calendar Timezone Display Issue**: Resolved complex timezone conversion problem where events were displaying incorrect dates in calendar list view despite being stored correctly in database
- **Enhanced Calendar Date Filtering**: Implemented proper future-only event filtering in calendar list view to show only upcoming events (today and forward), excluding past events
- **Fixed Calendar Date Construction**: Resolved issue where `new Date("2025-08-20")` was being interpreted as UTC midnight, causing date labels to shift backward by one day in Mountain Time timezone
- **Improved Timezone Handling**: Implemented proper timezone-aware date grouping using `formatInTimeZone` from date-fns-tz library with automatic browser timezone detection
- **Cleaned Up Calendar Interface**: Removed confusing "Today" and "Tomorrow" labels from calendar list view since dedicated "Today's Events" section already exists below
- **Enhanced Today's Events Filtering**: Fixed server-side `getTodayEventsByFamily` function to properly handle Mountain Time timezone offset for accurate "today" event detection

## Previous Changes (August 10, 2025)
- **Fixed Critical Parent Login Issue**: Added missing `/api/login` endpoint that was causing "Unexpected token" JSON parsing errors during parent authentication
- **Added Parent Authentication System**: Implemented complete parent login flow with `/api/login`, `/api/auth/user`, and `/api/logout` endpoints using bcrypt password verification and session management
- **Fixed Database Connection Issues**: Resolved Neon PostgreSQL WebSocket connection problems by optimizing connection pool settings and timeout configurations
- **Restored Application Functionality**: Successfully debugged and fixed app startup failures, ensuring stable database connectivity and proper API endpoint registration
- **Added Parent Dashboard and Task Management APIs**: Implemented all missing parent endpoints including `/api/tasks`, `/api/dashboard/stats`, `/api/events/today`, `/api/family-members`, `/api/meal-plans`, `/api/grocery-items`, and `/api/passwords` to match teen functionality for parents
- **Fixed Parent Task Creation**: Resolved issue where parent-created tasks weren't showing up in dashboard or task lists by adding proper endpoint routing and family-based data filtering
- **Fixed Parent Task Deletion**: Added missing parent DELETE endpoints (/api/tasks/:taskId and /api/tasks) that were preventing task deletion from working in the parent interface
- **Enhanced Task Cache Management**: Implemented optimistic updates for immediate UI response and aggressive cache clearing with multiple refetch strategies to ensure task creation/deletion reflects immediately in the interface
- **Applied Teen Account Cache Pattern to Parent Tasks**: Implemented the exact same cache invalidation pattern that works for teen accounts (optimistic updates + comprehensive query invalidation) to fix parent task creation/deletion sync issues
- **Fixed Task Layout Display Issues**: Resolved UI layout problems where task numbers, priority badges, and delete buttons were getting cut off in task containers by completely restructuring the task card layout with badges on separate rows, proper overflow handling, and responsive design

## Previous Changes (August 9, 2025)
- **Fixed Teen Calendar Display Issue**: Resolved timezone conversion problems that prevented events from showing in calendar grid view
- **Improved Calendar Timezone Handling**: Fixed date comparison logic to properly convert UTC stored events to local timezone for accurate calendar display
- **Fixed Password Form Cursor Issue**: Resolved cursor jumping problem in password text inputs by memoizing form component and optimizing re-render behavior
- **Enhanced Calendar Event Filtering**: Events now display correctly in both dashboard list view and calendar grid view with proper timezone awareness
- **Cleaned Up Debugging Code**: Removed temporary console.log statements from calendar components
- **Fixed Teen Password Management**: Restored passwords tab in teen navigation but removed "My Passwords" personal management tab, keeping only shared family passwords accessible to teens
- **Enhanced Teen Passwords Page**: Rebuilt teen passwords page to show only family shared passwords with proper search and copy functionality
- **Confirmed Calendar Cache Invalidation**: Verified teen calendar has comprehensive cache invalidation for event creation including removal, invalidation, and refetch of both teen and main event queries

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
- Database: PostgreSQL with Drizzle ORM. Teen authentication system now uses real database storage instead of mock data.
- Authentication: Express-session with bcrypt for password hashing and secure cookies. JWT token generation for API access. Teen profiles stored in database with proper foreign key relationships to users and family members.
- Mobile: Capacitor for Android/iOS builds, ensuring cross-platform compatibility.
- AI Integration: OpenAI API for voice transcription, natural language processing for task creation, and context-aware smart assistance.
- Voice Processing Pipeline: Browser speech recognition captures audio, real-time transcription to text, AI processing for action extraction, smart suggestions for tasks/events/reminders, and one-click creation.
- Data Flow: Session-based authentication, family membership validation for data access, multi-tenancy architecture ensuring data isolation per family.
- Secure Data Management: Family password vault with encrypted storage, import/export functionality, and role-based access controls.

### Feature Specifications
- **Smart Calendar with Privacy Controls**: Supports shared events (full details), busy events (time blocked), and private events (hidden). Includes selective sharing and Google Calendar sync integration.
- **AI-Powered Task Management**: Voice-to-task conversion, smart task assignment based on family roles, priority tracking, and due date management. Includes parent-to-teen task assignment with points and gamification.
- **Voice Assistant Features**: Real-time speech recognition, AI transcription with smart action suggestions, searchable voice notes.
- **Secure Data Management**: Encrypted family password vault, import/export, role-based access.
- **Family Coordination Hub**: Multi-user dashboard, role-based permissions, family member management, centralized communication.
- **Teen System**: Comprehensive invite workflow (SMS/email), teen dashboard with gamification (points, streaks, achievements), smart notification engine with progressive reminders and quiet hours, parent oversight without nagging, permission-based access controls, and shared meal planning display.

## External Dependencies

- **Database**: PostgreSQL (Neon serverless recommended).
- **AI Services**: OpenAI API for transcription and assistance.
- **Mobile Builds**: Capacitor for Android/iOS.
- **SMS Services**: Twilio (primary), AWS SNS (backup) for notifications.
- **Email Services**: SendGrid.
- **Calendar Integration**: Google Calendar API for synchronization.
- **Weather Data**: Open-Meteo API.
```