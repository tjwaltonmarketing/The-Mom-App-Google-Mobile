# Calendar Privacy Controls - Technical Documentation

## Overview
THE MOM APP features sophisticated calendar privacy controls that allow family members to manage their event visibility with three distinct levels: Shared, Busy, and Private.

## Privacy Levels

### 1. Shared Events
- **Visibility**: Full event details visible to all family members
- **Use Case**: Family activities, shared appointments, coordinated schedules
- **Display**: Shows complete title, time, location, and description
- **Default**: Most family events should use this setting

### 2. Busy Events  
- **Visibility**: Time slot shows as blocked without revealing details
- **Use Case**: Personal appointments, work meetings, private activities
- **Display**: Shows "Busy" during the time slot with no other details
- **Privacy**: Maintains schedule coordination while protecting personal information

### 3. Private Events
- **Visibility**: Completely hidden from other family members
- **Use Case**: Sensitive appointments, surprise planning, personal time
- **Display**: No indication of the event to other users
- **Security**: Highest level of privacy protection

## Selective Sharing Feature

### How It Works
- Override default privacy for specific family members
- Share private or busy events with chosen individuals
- Maintain granular control over information access

### Use Cases
- Share medical appointments with spouse but not children
- Coordinate surprise parties with select family members
- Allow babysitters access to relevant schedule information

## Implementation Details

### Database Schema
```sql
events table:
- privacy_level: enum('shared', 'busy', 'private')
- shared_with: integer[] (array of family member IDs)
- show_as_busy: boolean (for private events shown as busy)
```

### Frontend Components
- **Event Form**: Dropdown selector for privacy levels
- **Calendar View**: Conditional rendering based on privacy settings
- **Family Selector**: Multi-select for selective sharing

### Backend Logic
- Privacy filtering in API endpoints
- Permission checks for event access
- Secure data transmission

## User Interface

### Creating Events
1. Standard event form with title, time, description
2. Privacy level dropdown with clear descriptions
3. Optional family member selector for sharing
4. Visual indicators for privacy level selection

### Viewing Calendar
- Shared events display normally
- Busy events show gray "Busy" blocks
- Private events are invisible to unauthorized users
- Own events always visible regardless of privacy level

### Visual Indicators
- **Green**: Shared events (open book icon)
- **Yellow**: Busy events (clock icon)  
- **Red**: Private events (lock icon)
- **Blue**: Selectively shared events (people icon)

## Security Considerations

### Data Protection
- Events filtered at API level before transmission
- No client-side privacy filtering
- Encrypted storage for sensitive information
- Audit trail for privacy setting changes

### Access Control
- User can only modify their own events
- Family admin can view privacy settings (not content)
- No backdoor access to private information

## Benefits for Families

### Reduced Conflict
- Respect individual privacy needs
- Maintain family coordination
- Clear boundaries around personal time

### Enhanced Communication
- Transparent scheduling for shared activities
- Protected space for personal appointments
- Flexible sharing for special circumstances

### Mental Load Reduction
- Automatic privacy handling
- No need to remember what's shared
- Simplified family schedule management

## Future Enhancements

### Planned Features
- Time-based privacy (auto-share after event)
- Category-based default privacy levels
- Privacy templates for recurring events
- Integration with external calendar privacy settings

### Advanced Options
- Partial information sharing (time only, location only)
- Temporary privacy overrides
- Bulk privacy setting changes
- Privacy setting inheritance for recurring events

## Technical Specifications

### API Endpoints
- `GET /api/events` - Returns filtered events based on privacy
- `POST /api/events` - Creates events with privacy settings
- `PATCH /api/events/:id` - Updates events with permission checks

### Database Migrations
- Added privacy_level column with default 'shared'
- Added shared_with array column
- Created indexes for efficient privacy filtering

### Performance Considerations
- Optimized queries for privacy filtering
- Cached permission calculations
- Minimal overhead for privacy checks

## User Education

### Onboarding Flow
1. Introduction to privacy levels during setup
2. Interactive tutorial showing each privacy type
3. Best practice recommendations
4. Examples of when to use each level

### Help Documentation
- Clear explanations of each privacy level
- Visual examples of how events appear
- Troubleshooting common privacy questions
- FAQ section for family coordination

This privacy system represents a significant advancement in family calendar applications, providing the perfect balance between coordination and individual privacy needs.