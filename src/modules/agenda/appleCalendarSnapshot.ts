import type { NativeCalendarResponse } from './nativeCalendarBridge';

export type ValidatedAppleCalendarSnapshot = {
  events: NonNullable<NativeCalendarResponse['events']>;
  rangeStart: string;
  rangeEnd: string;
};

/**
 * Validates the complete native snapshot before any event is persisted.
 * EventKit may return events that overlap the requested range while starting
 * before its lower bound (for example, an ongoing all-day event).
 */
export function validateAppleCalendarSnapshot(
  response: NativeCalendarResponse,
  selectedCalendarIds: string[],
): ValidatedAppleCalendarSnapshot {
  if (response.snapshotComplete !== true) {
    throw new Error('A leitura do Calendário Apple não confirmou um snapshot completo. Nenhum evento será arquivado nesta sincronização.');
  }

  if (selectedCalendarIds.length === 0 ||
      selectedCalendarIds.some((id) => !id.trim()) ||
      new Set(selectedCalendarIds).size !== selectedCalendarIds.length) {
    throw new Error('Selecione ao menos um calendário válido antes de sincronizar.');
  }

  const snapshotCalendarIds = response.calendarIds ?? [];
  const expectedCalendarIds = [...selectedCalendarIds].sort();
  if (snapshotCalendarIds.length !== expectedCalendarIds.length ||
      new Set(snapshotCalendarIds).size !== snapshotCalendarIds.length ||
      snapshotCalendarIds.some((id) => !id.trim()) ||
      [...snapshotCalendarIds].sort().some((id, index) => id !== expectedCalendarIds[index])) {
    throw new Error('Os calendários consultados não correspondem à seleção atual. A reconciliação foi interrompida para proteger seus compromissos.');
  }

  const start = Date.parse(response.rangeStart ?? '');
  const end = Date.parse(response.rangeEnd ?? '');
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error('O intervalo retornado pelo Calendário Apple é inválido. Nenhum evento será arquivado.');
  }

  const events = response.events ?? [];
  const seenEventIds = new Set<string>();
  for (const event of events) {
    const eventStart = Date.parse(event.startsAt ?? '');
    const eventEnd = Date.parse(event.endsAt ?? '');
    if (!event.id?.trim() || !event.calendarId?.trim() ||
        !selectedCalendarIds.includes(event.calendarId) ||
        !snapshotCalendarIds.includes(event.calendarId) ||
        !Number.isFinite(eventStart) || !Number.isFinite(eventEnd) ||
        eventEnd <= eventStart || eventEnd <= start || eventStart >= end) {
      throw new Error('A leitura retornou dados incompletos, inválidos ou fora do intervalo consultado. Nenhum compromisso será importado ou arquivado.');
    }

    const eventKey = `${event.calendarId}\u0000${event.id}`;
    if (seenEventIds.has(eventKey)) {
      throw new Error('A leitura retornou eventos duplicados no mesmo calendário. Nenhum compromisso será importado ou arquivado.');
    }
    seenEventIds.add(eventKey);
  }

  return {
    events,
    rangeStart: new Date(start).toISOString(),
    rangeEnd: new Date(end).toISOString(),
  };
}
