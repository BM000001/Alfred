export interface CalendarSyncState {
  id: string;
  provider: 'google';
  calendarId: string;
  syncToken?: string;
  lastSyncedAt?: string;
}
