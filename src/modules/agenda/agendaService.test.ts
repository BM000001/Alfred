import { describe, expect, it } from 'vitest';
import type { EntityRepository } from '../../storage/repositories';
import type { Appointment } from './types';
import { createAgendaService } from './agendaService';

function createMemoryRepository<T extends { id: string }>(): EntityRepository<T> {
  const records = new Map<string, T>();
  return {
    async getAll() { return [...records.values()]; },
    async getById(id) { return records.get(id); },
    async save(entity) { records.set(entity.id, entity); },
    async delete(id) { records.delete(id); },
    async clear() { records.clear(); },
  };
}

describe('agendaService', () => {
  it('creates an appointment with scheduled status', async () => {
    const service = createAgendaService(createMemoryRepository<Appointment>(), {
      createId: () => 'appointment-1',
      now: () => new Date('2026-11-02T12:00:00.000Z'),
    });
    const appointment = await service.create({
      title: 'Aula de programação',
      type: 'class',
      startsAt: '2026-11-03T08:00:00.000-03:00',
      endsAt: '2026-11-03T09:30:00.000-03:00',
    });

    expect(appointment).toMatchObject({ id: 'appointment-1', status: 'scheduled', type: 'class' });
  });

  it('rejects invalid time ranges', async () => {
    const service = createAgendaService(createMemoryRepository<Appointment>());
    await expect(service.create({
      title: 'Aula',
      type: 'class',
      startsAt: '2026-11-03T09:00:00.000-03:00',
      endsAt: '2026-11-03T08:00:00.000-03:00',
    })).rejects.toThrow('O horário de término deve ser posterior ao início.');
  });

  it('upserts imported calendar events without duplicating them or replacing manual appointments', async () => {
    const repository = createMemoryRepository<Appointment>();
    const service = createAgendaService(repository, { createId: (() => { let id = 0; return () => `event-${++id}`; })() });
    const manual = await service.create({ title: 'Meu compromisso', type: 'personal', startsAt: '2026-11-04T10:00:00.000Z', endsAt: '2026-11-04T11:00:00.000Z' });
    const first = await service.upsertImported({ importedUid: 'apple:stable-1', title: 'Evento Apple', type: 'other', startsAt: '2026-11-04T12:00:00.000Z', endsAt: '2026-11-04T13:00:00.000Z' });
    const second = await service.upsertImported({ importedUid: 'apple:stable-1', title: 'Evento Apple atualizado', type: 'other', startsAt: '2026-11-04T13:00:00.000Z', endsAt: '2026-11-04T14:00:00.000Z' });
    const all = await service.list();
    expect(first.id).toBe(second.id);
    expect(all).toHaveLength(2);
    expect(all.find((item) => item.id === manual.id)?.title).toBe('Meu compromisso');
    expect(all.find((item) => item.id === first.id)).toMatchObject({ title: 'Evento Apple atualizado', importedUid: 'apple:stable-1' });
  });


  it('keeps recurring calendar occurrences as separate appointments across syncs', async () => {
    const repository = createMemoryRepository<Appointment>();
    const service = createAgendaService(repository, {
      createId: (() => { let id = 0; return () => `recurring-${++id}`; })(),
    });

    // EventKit provides a distinct eventIdentifier for each occurrence.
    // Re-syncing those same identifiers must update, not duplicate, either occurrence.
    const firstOccurrence = await service.upsertImported({
      importedUid: 'apple:series-occurrence-2026-11-05',
      importedCalendarId: 'calendar-classes',
      title: 'Aula recorrente',
      type: 'class',
      startsAt: '2026-11-05T08:00:00.000Z',
      endsAt: '2026-11-05T09:00:00.000Z',
    });
    const secondOccurrence = await service.upsertImported({
      importedUid: 'apple:series-occurrence-2026-11-06',
      importedCalendarId: 'calendar-classes',
      title: 'Aula recorrente',
      type: 'class',
      startsAt: '2026-11-06T08:00:00.000Z',
      endsAt: '2026-11-06T09:00:00.000Z',
    });

    const refreshedFirst = await service.upsertImported({
      importedUid: 'apple:series-occurrence-2026-11-05',
      importedCalendarId: 'calendar-classes',
      title: 'Aula recorrente atualizada',
      type: 'class',
      startsAt: '2026-11-05T08:30:00.000Z',
      endsAt: '2026-11-05T09:30:00.000Z',
    });

    const all = await service.list();
    expect(firstOccurrence.id).not.toBe(secondOccurrence.id);
    expect(refreshedFirst.id).toBe(firstOccurrence.id);
    expect(all).toHaveLength(2);
    expect(all.find((item) => item.id === firstOccurrence.id)?.startsAt).toBe('2026-11-05T08:30:00.000Z');
    expect(all.find((item) => item.id === secondOccurrence.id)?.startsAt).toBe('2026-11-06T08:00:00.000Z');
  });

  it('preserves all-day metadata when importing and updating calendar events', async () => {
    const repository = createMemoryRepository<Appointment>();
    const service = createAgendaService(repository, { createId: () => 'all-day-event' });
    const first = await service.upsertImported({
      importedUid: 'apple:all-day-1',
      importedCalendarId: 'calendar-a',
      title: 'Feriado',
      type: 'personal',
      startsAt: '2026-11-15T00:00:00.000Z',
      endsAt: '2026-11-16T00:00:00.000Z',
      isAllDay: true,
    });
    expect(first.isAllDay).toBe(true);

    const updated = await service.upsertImported({
      importedUid: 'apple:all-day-1',
      importedCalendarId: 'calendar-a',
      title: 'Feriado atualizado',
      type: 'personal',
      startsAt: '2026-11-15T00:00:00.000Z',
      endsAt: '2026-11-16T00:00:00.000Z',
      isAllDay: true,
    });
    expect(updated).toMatchObject({ id: first.id, isAllDay: true, title: 'Feriado atualizado' });
  });

  it('preserves recurrence metadata when importing and refreshing Apple events', async () => {
    const repository = createMemoryRepository<Appointment>();
    const service = createAgendaService(repository, { createId: () => 'recurring-event' });
    const first = await service.upsertImported({
      importedUid: 'apple:recurring-1',
      importedCalendarId: 'calendar-a',
      title: 'Aula semanal',
      type: 'class',
      startsAt: '2026-11-09T10:00:00.000Z',
      endsAt: '2026-11-09T11:00:00.000Z',
      isRecurring: true,
    });
    expect(first.isRecurring).toBe(true);

    const refreshed = await service.upsertImported({
      importedUid: 'apple:recurring-1',
      importedCalendarId: 'calendar-a',
      title: 'Aula semanal',
      type: 'class',
      startsAt: '2026-11-09T10:30:00.000Z',
      endsAt: '2026-11-09T11:30:00.000Z',
      isRecurring: false,
    });
    expect(refreshed).toMatchObject({ id: first.id, isRecurring: false });
  });

  it('archives removed Apple events only in the selected source calendar and sync window', async () => {
    const repository = createMemoryRepository<Appointment>();
    const service = createAgendaService(repository, { createId: (() => { let id = 0; return () => `apple-${++id}`; })() });
    const keep = await service.upsertImported({
      importedUid: 'apple:event-1', importedCalendarId: 'calendar-a', title: 'Keep',
      type: 'other', startsAt: '2026-11-05T10:00:00.000Z', endsAt: '2026-11-05T11:00:00.000Z',
    });
    const remove = await service.upsertImported({
      importedUid: 'apple:event-2', importedCalendarId: 'calendar-a', title: 'Removed',
      type: 'other', startsAt: '2026-11-06T10:00:00.000Z', endsAt: '2026-11-06T11:00:00.000Z',
    });
    const otherCalendar = await service.upsertImported({
      importedUid: 'apple:event-3', importedCalendarId: 'calendar-b', title: 'Other calendar',
      type: 'other', startsAt: '2026-11-06T10:00:00.000Z', endsAt: '2026-11-06T11:00:00.000Z',
    });
    const count = await service.reconcileImportedCalendar(
      'calendar-a', [keep.importedUid!], '2026-11-04T00:00:00.000Z', '2026-11-10T00:00:00.000Z',
    );
    expect(count).toBe(1);
    expect((await service.get(keep.id))?.status).toBe('scheduled');
    expect((await service.get(remove.id))?.status).toBe('cancelled');
    expect((await service.get(otherCalendar.id))?.status).toBe('scheduled');
  });

  it('cancels and deletes appointments', async () => {
    const service = createAgendaService(createMemoryRepository<Appointment>(), { createId: () => 'appointment-2' });
    const created = await service.create({
      title: 'Prova',
      type: 'exam',
      startsAt: '2026-11-04T10:00:00.000-03:00',
      endsAt: '2026-11-04T11:00:00.000-03:00',
    });
    const cancelled = await service.cancel(created.id);
    expect(cancelled.status).toBe('cancelled');

    await service.delete(created.id);
    expect(await service.get(created.id)).toBeUndefined();
  });
});
