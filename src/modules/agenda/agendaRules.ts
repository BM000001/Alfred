import type { Appointment } from './types';

export function validateAppointment(input: Pick<Appointment, 'title' | 'startsAt' | 'endsAt'>): string | null {
  if (!input.title.trim()) return 'O título do compromisso é obrigatório.';

  const start = Date.parse(input.startsAt);
  const end = Date.parse(input.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Informe datas e horários válidos.';
  if (end <= start) return 'O horário de término deve ser posterior ao início.';

  return null;
}

export function findAppointmentConflicts(
  appointments: Appointment[],
  candidate: Pick<Appointment, 'id' | 'startsAt' | 'endsAt'>,
): Appointment[] {
  const start = Date.parse(candidate.startsAt);
  const end = Date.parse(candidate.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  return appointments.filter((appointment) => {
    if (appointment.id === candidate.id || appointment.status === 'cancelled') return false;
    const existingStart = Date.parse(appointment.startsAt);
    const existingEnd = Date.parse(appointment.endsAt);
    if (!Number.isFinite(existingStart) || !Number.isFinite(existingEnd)) return false;
    return start < existingEnd && end > existingStart;
  });
}

/** Infers a useful Agenda category from an imported event's title. */
export function classifyImportedAppointment(title: string): Appointment['type'] {
  const normalized = title.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('pt-BR');
  if (/\\b(prova|exame|avaliacao|vestibular|simulado)\\b/.test(normalized)) return 'exam';
  if (/\\b(aula|materia|disciplina|curso|palestra|seminario|laboratorio)\\b/.test(normalized)) return 'class';
  if (/\\b(prazo|entrega|deadline|trabalho|atividade|vencimento|inscricao)\\b/.test(normalized)) return 'deadline';
  if (/\\b(consulta|medico|dentista|aniversario|viagem|ferias|academia|treino)\\b/.test(normalized)) return 'personal';
  return 'other';
}

export function sortAppointmentsByStart(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
}
