import { describe, expect, it } from 'vitest';
import type { NativeCalendarResponse } from './nativeCalendarBridge';
import { validateAppleCalendarSnapshot } from './appleCalendarSnapshot';

const baseResponse: NativeCalendarResponse = {
  requestId: 'request-1',
  status: 'success',
  snapshotComplete: true,
  rangeStart: '2026-11-05T00:00:00.000Z',
  rangeEnd: '2027-02-03T00:00:00.000Z',
  calendarIds: ['calendar-a'],
  events: [{
    id: 'event-1',
    externalId: 'external-1',
    occurrenceDate: null,
    title: 'Aula',
    startsAt: '2026-11-06T10:00:00.000Z',
    endsAt: '2026-11-06T11:00:00.000Z',
    isAllDay: false,
    isRecurring: false,
    calendarTitle: 'Universidade',
    calendarId: 'calendar-a',
    location: null,
  }],
};

describe('validateAppleCalendarSnapshot', () => {
  it('accepts a complete snapshot and normalizes its range', () => {
    expect(validateAppleCalendarSnapshot(baseResponse, ['calendar-a'])).toMatchObject({
      events: baseResponse.events,
      rangeStart: '2026-11-05T00:00:00.000Z',
      rangeEnd: '2027-02-03T00:00:00.000Z',
    });
  });

  it('accepts an event that began before the range but overlaps it', () => {
    const response = {
      ...baseResponse,
      events: [{ ...baseResponse.events![0], startsAt: '2026-11-04T23:00:00.000Z' }],
    };
    expect(() => validateAppleCalendarSnapshot(response, ['calendar-a'])).not.toThrow();
  });

  it('rejects incomplete snapshots before import or reconciliation', () => {
    expect(() => validateAppleCalendarSnapshot(
      { ...baseResponse, snapshotComplete: false },
      ['calendar-a'],
    )).toThrow(/snapshot completo/);
  });

  it('rejects a snapshot that does not exactly match the selected calendars', () => {
    expect(() => validateAppleCalendarSnapshot(
      { ...baseResponse, calendarIds: ['calendar-a', 'calendar-b'] },
      ['calendar-a'],
    )).toThrow(/não correspondem à seleção/);
  });

  it('rejects duplicate event identifiers inside one calendar', () => {
    const event = baseResponse.events![0];
    expect(() => validateAppleCalendarSnapshot(
      { ...baseResponse, events: [event, { ...event, title: 'Cópia conflitante' }] },
      ['calendar-a'],
    )).toThrow(/eventos duplicados/);
  });

  it('rejects events outside the returned snapshot range', () => {
    const event = baseResponse.events![0];
    expect(() => validateAppleCalendarSnapshot(
      { ...baseResponse, events: [{ ...event, startsAt: '2027-02-03T00:00:00.000Z', endsAt: '2027-02-03T01:00:00.000Z' }] },
      ['calendar-a'],
    )).toThrow(/fora do intervalo/);
  });

  it('rejects invalid or duplicate selected calendar identifiers', () => {
    expect(() => validateAppleCalendarSnapshot(baseResponse, [])).toThrow(/calendário válido/);
    expect(() => validateAppleCalendarSnapshot(baseResponse, ['calendar-a', 'calendar-a'])).toThrow(/calendário válido/);
  });
});
