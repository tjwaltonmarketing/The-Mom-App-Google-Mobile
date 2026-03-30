import { google } from 'googleapis';
import type { Event as CalendarEvent } from '@shared/schema';

export class GoogleCalendarService {
  private oauth2Client: any;

  constructor() {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://app.themom.app/api/calendar/callback'
      : 'http://localhost:5000/api/calendar/callback';

    if (!clientId || !clientSecret) {
      console.warn('Google Calendar integration: Missing GOOGLE_CALENDAR_CLIENT_ID or GOOGLE_CALENDAR_CLIENT_SECRET');
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  generateAuthUrl(userId?: number): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly'
    ];

    const state = userId
      ? Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64')
      : undefined;

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      ...(state ? { state } : {})
    });
  }

  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  async listCalendars() {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const response = await calendar.calendarList.list();
    
    return response.data.items?.map(cal => ({
      id: cal.id,
      name: cal.summary,
      primary: cal.primary,
      backgroundColor: cal.backgroundColor
    })) || [];
  }

  async importEvents(calendarId: string = 'primary', daysToImport: number = 365): Promise<any[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + daysToImport);

    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
    });

    return response.data.items?.map(event => ({
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      startTime: event.start?.dateTime || event.start?.date,
      endTime: event.end?.dateTime || event.end?.date,
      location: event.location || '',
      isAllDay: !event.start?.dateTime, // If no dateTime, it's an all-day event
      googleEventId: event.id,
      googleCalendarId: calendarId
    })) || [];
  }
}
