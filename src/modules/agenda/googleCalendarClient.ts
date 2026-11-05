/**
 * Google Calendar browser client.
 *
 * OAuth access tokens are intentionally kept in memory only. This module does
 * not persist tokens, refresh tokens, event descriptions, or calendar data.
 * A new browser session requires the user to authorize again.
 */
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
].join(' ');

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleIdentityServices {
  oauth2: {
    initTokenClient(options: {
      client_id: string;
      scope: string;
      callback: (response: GoogleTokenResponse) => void;
      error_callback?: (error: { type?: string; message?: string }) => void;
    }): GoogleTokenClient;
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  timeZone?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  etag?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  recurringEventId?: string;
  updated?: string;
  htmlLink?: string;
}

interface GoogleEventsPage {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

let accessToken: string | null = null;
let tokenExpiresAt = 0;

function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Agenda só pode ser conectada em um navegador.'));
  if (window.google?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Não foi possível carregar a autenticação Google.')), { once: true });
      if (window.google?.oauth2) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar a autenticação Google.'));
    document.head.appendChild(script);
  });
}

function requireToken(): string {
  if (!accessToken || Date.now() >= tokenExpiresAt - 30_000) {
    accessToken = null;
    throw new Error('Sua autorização Google expirou. Conecte novamente para continuar.');
  }
  return accessToken;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = requireToken();
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (response.status === 401) {
    accessToken = null;
    throw new Error('A autorização Google expirou ou foi revogada. Conecte novamente.');
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(detail?.error?.message || `Google Calendar respondeu com HTTP ${response.status}.`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function connectGoogleCalendar(clientId: string): Promise<void> {
  const normalized = clientId.trim();
  if (!normalized || !normalized.endsWith('.apps.googleusercontent.com')) {
    throw new Error('Informe um OAuth Client ID válido do tipo Aplicativo da Web.');
  }
  await loadGoogleIdentityServices();
  if (!window.google?.oauth2) throw new Error('O serviço de autenticação Google não ficou disponível.');
  await new Promise<void>((resolve, reject) => {
    const client = window.google!.oauth2.initTokenClient({
      client_id: normalized,
      scope: SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'A autorização Google não foi concluída.'));
          return;
        }
        accessToken = response.access_token;
        tokenExpiresAt = Date.now() + Math.max(0, response.expires_in ?? 3600) * 1000;
        resolve();
      },
      error_callback: (error) => reject(new Error(error.message || 'Falha na autenticação Google.')),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

export function disconnectGoogleCalendar(): void {
  accessToken = null;
  tokenExpiresAt = 0;
}

export function isGoogleCalendarConnected(): boolean {
  return Boolean(accessToken && Date.now() < tokenExpiresAt - 30_000);
}

export async function listGoogleCalendars(): Promise<GoogleCalendarInfo[]> {
  const result = await api<{ items?: GoogleCalendarInfo[] }>('/users/me/calendarList?maxResults=250');
  return result.items ?? [];
}

export async function listGoogleEvents(calendarId: string, syncToken?: string): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken?: string }> {
  if (!calendarId.trim()) throw new Error('Selecione um calendário Google.');
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  do {
    const params = new URLSearchParams({ maxResults: '2500', showDeleted: 'true' });
    if (syncToken) params.set('syncToken', syncToken);
    else {
      const now = new Date();
      const from = new Date(now.getTime() - 90 * 86400_000);
      const to = new Date(now.getTime() + 365 * 86400_000);
      params.set('timeMin', from.toISOString());
      params.set('timeMax', to.toISOString());
      params.set('singleEvents', 'true');
      params.set('orderBy', 'startTime');
    }
    if (pageToken) params.set('pageToken', pageToken);
    const page = await api<GoogleEventsPage>(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
    events.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken;
  } while (pageToken);

  return { events, ...(nextSyncToken ? { nextSyncToken } : {}) };
}

export function createGoogleEvent(calendarId: string, event: Omit<GoogleCalendarEvent, 'id' | 'etag' | 'status' | 'updated' | 'htmlLink'>): Promise<GoogleCalendarEvent> {
  return api(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

export function updateGoogleEvent(calendarId: string, eventId: string, event: Omit<GoogleCalendarEvent, 'id' | 'etag' | 'status' | 'updated' | 'htmlLink'>): Promise<GoogleCalendarEvent> {
  return api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'PUT',
    body: JSON.stringify(event),
  });
}

export function deleteGoogleEvent(calendarId: string, eventId: string): Promise<void> {
  return api(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}
