import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectAppleCalendar,
  isNativeAppleCalendarAvailable,
  syncAppleCalendar,
} from './nativeCalendarBridge';

type NativeMessage = {
  action: 'connect' | 'sync';
  requestId: string;
  calendarIds?: string[];
};

function installNativeBridge(onMessage: (message: NativeMessage) => void) {
  Object.defineProperty(window, 'webkit', {
    configurable: true,
    value: {
      messageHandlers: {
        alfredCalendar: {
          postMessage: onMessage,
        },
      },
    },
  });
}

function respond(message: NativeMessage, payload: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('alfred-native-calendar', {
    detail: { requestId: message.requestId, ...payload },
  }));
}

describe('nativeCalendarBridge', () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, 'webkit');
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'webkit');
    vi.useRealTimers();
  });

  it('reports native calendar availability only when the WebKit handler exists', () => {
    expect(isNativeAppleCalendarAvailable()).toBe(false);
    installNativeBridge(() => undefined);
    expect(isNativeAppleCalendarAvailable()).toBe(true);
  });

  it('sends a connect request and resolves its matching native response', async () => {
    let sentMessage: NativeMessage | undefined;
    installNativeBridge((message) => {
      sentMessage = message;
      respond(message, {
        status: 'connected',
        calendars: [{ id: 'calendar-1', title: 'Pessoal', source: 'iCloud' }],
      });
    });

    await expect(connectAppleCalendar()).resolves.toMatchObject({
      status: 'connected',
      calendars: [{ id: 'calendar-1', title: 'Pessoal', source: 'iCloud' }],
    });
    expect(sentMessage).toMatchObject({ action: 'connect' });
    expect(sentMessage?.requestId).toBeTruthy();
  });

  it('sends only the selected calendar IDs when synchronizing', async () => {
    let sentMessage: NativeMessage | undefined;
    installNativeBridge((message) => {
      sentMessage = message;
      respond(message, {
        status: 'success',
        snapshotComplete: true,
        calendarIds: ['calendar-classes'],
        events: [],
      });
    });

    await expect(syncAppleCalendar(['calendar-classes'])).resolves.toMatchObject({
      status: 'success',
      snapshotComplete: true,
      calendarIds: ['calendar-classes'],
      events: [],
    });
    expect(sentMessage).toMatchObject({
      action: 'sync',
      calendarIds: ['calendar-classes'],
    });
  });

  it('rejects empty, duplicated, or blank calendar selections before calling native code', async () => {
    const postMessage = vi.fn();
    installNativeBridge(postMessage);

    await expect(syncAppleCalendar([])).rejects.toThrow('Selecione ao menos um calendário válido');
    await expect(syncAppleCalendar(['calendar-1', 'calendar-1'])).rejects.toThrow('Selecione ao menos um calendário válido');
    await expect(syncAppleCalendar(['   '])).rejects.toThrow('Selecione ao menos um calendário válido');
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('rejects when the native app does not provide the WebKit bridge', async () => {
    await expect(connectAppleCalendar()).rejects.toThrow(
      'A conexão direta com o Calendário Apple está disponível no aplicativo iOS do Alfred.',
    );
  });

  it('rejects when the native bridge does not answer before the timeout', async () => {
    vi.useFakeTimers();
    installNativeBridge(() => undefined);

    const request = connectAppleCalendar();
    const assertion = expect(request).rejects.toThrow('O Calendário Apple não respondeu.');
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });
});
