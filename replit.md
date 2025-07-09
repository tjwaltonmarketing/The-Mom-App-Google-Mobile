# replit.md - The Mom App

## Overview

The Mom App is a comprehensive family coordination platform designed to reduce mental load for busy parents. It's a full-stack web application with mobile support via Capacitor, featuring AI-powered assistance, calendar management with privacy controls, task organization, and secure family data management.

## System Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Vite build system
- **UI Framework**: Shadcn/UI components with Tailwind CSS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Express-session with bcrypt password hashing
- **Mobile**: Capacitor for Android/iOS builds
- **AI Integration**: OpenAI API for voice transcription and smart assistance
- **Hosting**: Replit (development), prepared for production deployment

### Database Schema
The application uses a multi-tenant architecture with the following core entities:
- Users with family-based organization
- Family members with role-based access
- Events with three-tier privacy controls (shared/busy/private)
- Tasks with assignment and tracking capabilities
- Voice notes with AI transcription
- Secure password vault for family credentials
- Meal planning and grocery management

## Key Components

### Family Coordination Hub
- Multi-user dashboard with real-time updates
- Role-based permissions (mom, dad, child, etc.)
- Family member management with color coding and avatars
- Centralized communication and information sharing

### Smart Calendar with Privacy Controls
- **Shared Events**: Full details visible to all family members
- **Busy Events**: Time blocked without revealing details
- **Private Events**: Completely hidden from other members
- **Selective Sharing**: Override privacy for specific family members
- Google Calendar sync integration (configured but requires API keys)

### AI-Powered Task Management
- Voice-to-task conversion using OpenAI transcription
- Smart task assignment based on family roles
- Priority tracking and due date management
- Natural language processing for task creation

### Voice Assistant Features
- Real-time speech recognition (browser-based)
- AI transcription with smart action suggestions
- Voice notes with searchable text conversion
- Context-aware family assistance

### Secure Data Management
- Family password vault with encrypted storage
- Import/export functionality for data migration
- Role-based access controls
- Session management with secure cookies

## Data Flow

### Authentication Flow
1. User registration creates user account and default family
2. Session-based authentication with secure cookies
3. JWT token generation for API access
4. Family membership validation for data access

### Voice Processing Pipeline
1. Browser speech recognition captures audio
2. Real-time transcription to text
3. AI processing for action extraction
4. Smart suggestions for tasks/events/reminders
5. One-click creation of suggested items

### Mobile App Integration
- Capacitor builds for Android/iOS platforms
- CORS-enabled API endpoints for mobile access
- Session persistence across web/mobile platforms
- Development server connectivity for testing

## External Dependencies

### Required Services
- **Database**: PostgreSQL (Neon serverless recommended)
- **AI Services**: OpenAI API key for transcription and assistance
- **Session Storage**: In-memory store (MemoryStore for development)

### Optional Integrations
- **Google Calendar API**: For calendar synchronization
- **SMS/Email Services**: For family notifications
- **Maps API**: For location autocomplete in events

### Mobile Build Dependencies
- **Android SDK**: API Level 35+ for Google Play compliance
- **Capacitor**: Version 6.1.2 for Android/iOS builds
- **GitHub Actions**: Automated Android APK/AAB building

## Deployment Strategy

### Development Environment
- Replit development server with hot reloading
- SQLite fallback for development database
- Mock AI responses when OpenAI key unavailable
- CORS configuration for mobile app testing

### Production Deployment
- Environment variable configuration for database and API keys
- Session store upgrade to Redis or database-backed storage
- Static asset optimization and CDN integration
- Mobile app deployment to Google Play Store

### Mobile App Deployment
- GitHub Actions workflow builds signed APK/AAB files
- Google Play Console integration with proper API targeting
- Version management with semantic versioning
- Certificate signing for production releases

## Changelog
- July 09, 2025. Comprehensive teen account system implementation: Complete invite workflow with SMS integration, teen dashboard with gamification (points/streaks), smart notification engine with progressive reminders and quiet hours, parent oversight without nagging, permission-based access controls
- July 09, 2025. Updated tutorials and FAQs: Added comprehensive documentation for teen account setup, gamification system, SMS messaging, and anti-nagging benefits
- July 09, 2025. Enhanced voice-to-calendar with smart date/time parsing: AI now correctly handles relative dates ("tomorrow", "Friday") and natural time expressions ("2:00 PM"), automatically pre-populating date and time fields in 12-hour AM/PM format
- July 09, 2025. Fixed calendar event creation: Voice assistant now properly detects calendar requests and provides date/time selection interface for scheduling events
- July 05, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.