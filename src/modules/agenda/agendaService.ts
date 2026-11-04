import type { EntityRepository } from '../../storage/repositories';
import type { Appointment, CreateAppointmentInput, UpdateAppointmentInput } from './types';
import { validateAppointment } from './agendaRules';

export interface AgendaServiceOptions {
  createId?: () => string;
  now?: () => Date;
}

export function createAgendaService(
  repository: EntityRepository<Appointment>,
  options: AgendaServiceOptions = {},
) {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date());

  async function update(id: string, changes: UpdateAppointmentInput): Promise<Appointment> {
    const current = await repository.getById(id);
    if (!current) throw new Error('Compromisso não encontrado.');

    const updated: Appointment = { ...current, ...changes };
    const validationError = validateAppointment(updated);
    if (validationError) throw new Error(validationError);

    if (changes.description !== undefined) {
      const description = changes.description.trim();
      if (description) updated.description = description;
      else delete updated.description;
    }
    if (changes.location !== undefined) {
      const location = changes.location.trim();
      if (location) updated.location = location;
      else delete updated.location;
    }

    await repository.save(updated);
    return updated;
  }

  return {
    async list(): Promise<Appointment[]> {
      return repository.getAll();
    },

    async get(id: string): Promise<Appointment | undefined> {
      return repository.getById(id);
    },

    async create(input: CreateAppointmentInput): Promise<Appointment> {
      const validationError = validateAppointment(input);
      if (validationError) throw new Error(validationError);

      const appointment: Appointment = {
        id: createId(),
        title: input.title.trim(),
        type: input.type,
        status: 'scheduled',
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        ...(input.isAllDay ? { isAllDay: true } : {}),
        createdAt: now().toISOString(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.location?.trim() ? { location: input.location.trim() } : {}),
      };

      await repository.save(appointment);
      return appointment;
    },

    async upsertImported(input: CreateAppointmentInput & { importedUid: string; importedCalendarId?: string }): Promise<Appointment> {
      const existing = (await repository.getAll()).find((item) => item.importedUid === input.importedUid);
      if (existing) {
        const updated: Appointment = {
          ...existing,
          title: input.title.trim(),
          type: input.type,
          status: 'scheduled',
          importedCalendarId: input.importedCalendarId ?? existing.importedCalendarId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          ...(input.isAllDay ? { isAllDay: true } : { isAllDay: false }),
          ...(input.location?.trim() ? { location: input.location.trim() } : {}),
        };
        if (!input.location?.trim()) delete updated.location;
        const validationError = validateAppointment(updated);
        if (validationError) throw new Error(validationError);
        await repository.save(updated);
        return updated;
      }
      const validationError = validateAppointment(input);
      if (validationError) throw new Error(validationError);
      const imported: Appointment = {
        id: createId(),
        title: input.title.trim(),
        type: input.type,
        status: 'scheduled',
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        ...(input.isAllDay ? { isAllDay: true } : {}),
        createdAt: now().toISOString(),
        importedUid: input.importedUid,
        ...(input.importedCalendarId ? { importedCalendarId: input.importedCalendarId } : {}),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.location?.trim() ? { location: input.location.trim() } : {}),
      };
      await repository.save(imported);
      return imported;
    },


    async reconcileImportedCalendar(calendarId: string, seenImportedUids: string[], from: string, to: string): Promise<number> {
      const seen = new Set(seenImportedUids);
      const start = Date.parse(from);
      const end = Date.parse(to);
      if (!calendarId || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        throw new Error('Intervalo inválido para reconciliar o Calendário Apple.');
      }
      let cancelled = 0;
      for (const item of await repository.getAll()) {
        if (item.importedCalendarId !== calendarId || !item.importedUid || item.status === 'cancelled') continue;
        const eventStart = Date.parse(item.startsAt);
        if (!Number.isFinite(eventStart) || eventStart < start || eventStart >= end || seen.has(item.importedUid)) continue;
        await repository.save({ ...item, status: 'cancelled' });
        cancelled += 1;
      }
      return cancelled;
    },

    update,

    async cancel(id: string): Promise<Appointment> {
      return update(id, { status: 'cancelled' });
    },

    async delete(id: string): Promise<void> {
      const current = await repository.getById(id);
      if (!current) throw new Error('Compromisso não encontrado.');
      await repository.delete(id);
    },
  };
}
