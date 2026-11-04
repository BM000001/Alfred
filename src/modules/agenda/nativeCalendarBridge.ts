export interface NativeCalendarEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isAllDay: boolean;
  calendarTitle: string;
  location: string | null;
  notes: string | null;
}

export interface NativeCalendarResponse {
  status: 'connected' | 'success' | 'error';
  events?: NativeCalendarEvent[];
  message?: string;
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        alfredCalendar?: {
          postMessage: (message: { action: 'connect' | 'sync' }) => void;
        };
      };
    };
  }
}

const RESPONSE_EVENT = 'alfred-native-calendar';
const REQUEST_TIMEOUT_MS = 30_000;

/** True only inside the Alfred iOS wrapper; ordinary browsers remain unaffected. */
export function isNativeAppleCalendarAvailable(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.webkit?.messageHandlers?.alfredCalendar?.postMessage === 'function';
}

function requestNativeCalendar(action: 'connect' | 'sync'): Promise<NativeCalendarResponse> {
  if (!isNativeAppleCalendarAvailable()) {
    return Promise.reject(new Error('A conexão direta com o Calendário Apple está disponível no aplicativo iOS do Alfred.'));
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener(RESPONSE_EVENT, onResponse);
      window.clearTimeout(timeout);
    };

    const onResponse = (event: Event) => {
      const response = (event as CustomEvent<NativeCalendarResponse>).detail;
      cleanup();
      if (response.status === 'error') {
        reject(new Error(response.message || 'Não foi possível sincronizar o calendário.'));
      } else {
        resolve(response);
      }
    };

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('O Calendário Apple não respondeu. Tente novamente.'));
    }, REQUEST_TIMEOUT_MS);

    window.addEventListener(RESPONSE_EVENT, onResponse, { once: true });

    try {
      window.webkit!.messageHandlers!.alfredCalendar!.postMessage({ action });
    } catch (error) {
      cleanup();
      reject(error instanceof Error ? error : new Error('Falha ao solicitar acesso ao Calendário Apple.'));
    }
  });
}

/** Requests permission and imports the upcoming events returned by iOS. */
export function connectAppleCalendar(): Promise<NativeCalendarResponse> {
  return requestNativeCalendar('connect');
}

/** Reads the latest upcoming events from the already-authorized Apple calendars. */
export function syncAppleCalendar(): Promise<NativeCalendarResponse> {
  return requestNativeCalendar('sync');
}
