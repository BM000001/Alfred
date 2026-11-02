import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Appointment, AppointmentType } from './agenda/types';
import { findAppointmentConflicts, sortAppointmentsByStart } from './agenda/agendaRules';
import { createAgendaService } from './agenda/agendaService';
import { appointmentRepository } from '../storage/repositories';

const agenda = createAgendaService(appointmentRepository);
type ViewMode = 'day' | 'week' | 'month';

function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function dateKey(value: Date): string {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function typeLabel(type: AppointmentType): string {
  return ({ class: 'Aula', exam: 'Prova', deadline: 'Prazo', personal: 'Pessoal', other: 'Outro' })[type];
}

export function Agenda() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [view, setView] = useState<ViewMode>('week');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AppointmentType>('personal');
  const [startsAt, setStartsAt] = useState(() => localDateTime(new Date(Date.now() + 60 * 60_000)));
  const [endsAt, setEndsAt] = useState(() => localDateTime(new Date(Date.now() + 2 * 60 * 60_000)));
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<Appointment[]>([]);

  async function refresh() {
    const loaded = await agenda.list();
    setItems(sortAppointmentsByStart(loaded));
  }

  useEffect(() => {
    let active = true;
    agenda.list().then((loaded) => {
      if (active) setItems(sortAppointmentsByStart(loaded));
    }).catch(() => {
      if (active) setError('Não foi possível carregar a Agenda. Verifique o armazenamento local do navegador.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const range = useMemo(() => {
    const selected = new Date(`${selectedDate}T12:00:00`);
    const start = startOfDay(selected);
    if (view === 'day') return { start, end: new Date(start.getTime() + 86400000) };
    if (view === 'week') {
      start.setDate(start.getDate() - start.getDay());
      return { start, end: new Date(start.getTime() + 7 * 86400000) };
    }
    return {
      start: new Date(selected.getFullYear(), selected.getMonth(), 1),
      end: new Date(selected.getFullYear(), selected.getMonth() + 1, 1),
    };
  }, [selectedDate, view]);

  const visibleItems = useMemo(() => items.filter((item) => {
    const date = new Date(item.startsAt);
    return date >= range.start && date < range.end && item.status !== 'cancelled';
  }), [items, range]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setConflicts([]);
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const candidate = { id: '__new__', startsAt: start.toISOString(), endsAt: end.toISOString() };
    const overlaps = findAppointmentConflicts(items, candidate);
    if (overlaps.length) {
      setConflicts(overlaps);
      setError('Este horário coincide com outro compromisso. Ajuste o horário antes de salvar.');
      return;
    }
    try {
      await agenda.create({
        title,
        type,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        ...(location.trim() ? { location: location.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setTitle('');
      setLocation('');
      setDescription('');
      setShowForm(false);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o compromisso.');
    }
  }

  async function cancelAppointment(item: Appointment) {
    if (!window.confirm(`Cancelar "${item.title}"?`)) return;
    try {
      await agenda.cancel(item.id);
      await refresh();
    } catch {
      setError('Não foi possível cancelar o compromisso.');
    }
  }

  const selectedLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    ...(view === 'day' ? { day: 'numeric' as const } : {}),
  });

  return (
    <section className="agenda-module">
      <div className="agenda-toolbar">
        <div>
          <span className="card-label">SEUS COMPROMISSOS</span>
          <h2>{selectedLabel}</h2>
        </div>
        <button className="primary-action" type="button" onClick={() => { setShowForm((value) => !value); setError(''); setConflicts([]); }}>
          {showForm ? 'Fechar' : '+ Novo compromisso'}
        </button>
      </div>

      <div className="agenda-controls">
        <label className="agenda-date-label">Data de referência<input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
        <div className="agenda-view-switch" aria-label="Visualização da agenda">
          <button type="button" className={view === 'day' ? 'selected' : ''} onClick={() => setView('day')}>Dia</button>
          <button type="button" className={view === 'week' ? 'selected' : ''} onClick={() => setView('week')}>Semana</button>
          <button type="button" className={view === 'month' ? 'selected' : ''} onClick={() => setView('month')}>Mês</button>
        </div>
      </div>

      {showForm && (
        <form className="entry-panel agenda-form" onSubmit={handleSubmit}>
          <span className="card-label">NOVO COMPROMISSO</span>
          <h2>O que está marcado?</h2>
          <label className="field-label" htmlFor="appointment-title">Título</label>
          <input id="appointment-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Ex.: Aula de programação" required />
          <div className="form-grid agenda-form-grid">
            <div><label className="field-label" htmlFor="appointment-type">Tipo</label><select id="appointment-type" value={type} onChange={(event) => setType(event.target.value as AppointmentType)}><option value="class">Aula</option><option value="exam">Prova</option><option value="deadline">Prazo</option><option value="personal">Pessoal</option><option value="other">Outro</option></select></div>
            <div><label className="field-label" htmlFor="appointment-start">Início</label><input id="appointment-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required /></div>
            <div><label className="field-label" htmlFor="appointment-end">Término</label><input id="appointment-end" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required /></div>
          </div>
          <label className="field-label" htmlFor="appointment-location">Local <span className="optional-label">· opcional</span></label>
          <input id="appointment-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Sala, endereço ou link" />
          <label className="field-label" htmlFor="appointment-description">Observações <span className="optional-label">· opcional</span></label>
          <textarea id="appointment-description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Detalhes importantes..." />
          <button className="primary-action" type="submit">Salvar compromisso</button>
        </form>
      )}

      {error && <p className="module-error" role="alert">{error}</p>}
      {conflicts.length > 0 && <div className="agenda-conflicts"><strong>Conflito encontrado</strong>{conflicts.map((item) => <p key={item.id}>{item.title} · {formatTime(item.startsAt)}–{formatTime(item.endsAt)}</p>)}</div>}

      {loading ? <p className="module-feedback">Carregando sua Agenda...</p> : visibleItems.length === 0 ? (
        <div className="empty-state"><strong>Nenhum compromisso neste período.</strong><p>Quando você adicionar aulas, provas e outros eventos, eles aparecerão aqui.</p></div>
      ) : (
        <div className="appointment-list">
          {visibleItems.map((item) => (
            <article className="appointment-card" key={item.id}>
              <div className="appointment-time"><strong>{formatTime(item.startsAt)}</strong><span>{formatTime(item.endsAt)}</span></div>
              <div className="appointment-details">
                <span className={`appointment-type type-${item.type}`}>{typeLabel(item.type)}</span>
                <h3>{item.title}</h3>
                <p>{new Date(item.startsAt).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}{item.location ? ` · ${item.location}` : ''}</p>
                {item.description && <p>{item.description}</p>}
              </div>
              <button className="text-action" type="button" onClick={() => void cancelAppointment(item)}>Cancelar</button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
