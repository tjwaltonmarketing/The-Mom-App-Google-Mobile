# The Mom App

## Overview
The Mom App is a comprehensive family coordination platform designed to reduce mental load for busy parents. It is a full-stack web application with mobile support, featuring AI-powered assistance, smart calendar management with granular privacy controls, advanced task organization, and secure family data management. The project's vision is to streamline family logistics, enhance communication, and foster collaboration among family members, ultimately improving daily life for busy households.

## Recent Changes (August 9, 2025)
- **Fixed Teen Calendar Display Issue**: Resolved timezone conversion problems that prevented events from showing in calendar grid view
- **Improved Calendar Timezone Handling**: Fixed date comparison logic to properly convert UTC stored events to local timezone for accurate calendar display
- **Fixed Password Form Cursor Issue**: Resolved cursor jumping problem in password text inputs by memoizing form component and optimizing re-render behavior
- **Enhanced Calendar Event Filtering**: Events now display correctly in both dashboard list view and calendar grid view with proper timezone awareness
- **Cleaned Up Debugging Code**: Removed temporary console.log statements from calendar components
- **Removed Teen Passwords Tab**: Temporarily removed the "My Passwords" tab from teen navigation as requested by user

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