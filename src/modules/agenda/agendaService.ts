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
        createdAt: now().toISOString(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.location?.trim() ? { location: input.location.trim() } : {}),
      };

      await repository.save(appointment);
      return appointment;
    },

    async upsertImported(input: CreateAppointmentInput & { importedUid: string }): Promise<Appointment> {
      const existing = (await repository.getAll()).find((item) => item.importedUid === input.importedUid);
      if (existing) {
        const updated: Appointment = {
          ...existing,
          title: input.title.trim(),
          type: input.type,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
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
        createdAt: now().toISOString(),
        importedUid: input.importedUid,
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.location?.trim() ? { location: input.location.trim() } : {}),
      };
      await repository.save(imported);
      return imported;
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
