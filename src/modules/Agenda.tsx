import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Appointment, AppointmentType } from './agenda/types';
import { findAppointmentConflicts, sortAppointmentsByStart } from './agenda/agendaRules';
import { createAgendaService } from './agenda/agendaService';
import { appointmentRepository } from '../storage/repositories';
import { ICalendarImport } from './ICalendarImport';
import { connectAppleCalendar, isNativeAppleCalendarAvailable, syncAppleCalendar, type NativeCalendarEvent, type NativeCalendarInfo } from './agenda/nativeCalendarBridge';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<Appointment[]>([]);
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleMessage, setAppleMessage] = useState('');
  const [appleLastSync, setAppleLastSync] = useState<string | null>(null);
  const [appleCalendars, setAppleCalendars] = useState<NativeCalendarInfo[]>([]);
  const [selectedAppleCalendars, setSelectedAppleCalendars] = useState<string[]>([]);
  const [appleConnected, setAppleConnected] = useState(false);
  const appleAvailable = isNativeAppleCalendarAvailable();

  async function saveAppleEvents(events: NativeCalendarEvent[]) {
    let imported = 0;
    for (const event of events) {
      if (!event.id || !event.startsAt || !event.endsAt || !Number.isFinite(Date.parse(event.startsAt)) || !Number.isFinite(Date.parse(event.endsAt))) continue;
      await agenda.upsertImported({
        importedUid: `apple:${event.id}`,
        title: (event.title || 'Sem título').slice(0, 120),
        type: 'other',
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        ...(event.location ? { location: event.location } : {}),
      });
      imported += 1;
    }
    await refresh();
    setAppleLastSync(new Date().toISOString());
    return imported;
  }

  async function handleAppleCalendar(connect: boolean) {
    setAppleBusy(true);
    setAppleMessage(connect ? 'Solicitando acesso ao Calendário Apple...' : 'Lendo eventos do Calendário Apple...');
    try {
      if (connect) {
        const response = await connectAppleCalendar();
        const calendars = response.calendars ?? [];
        setAppleCalendars(calendars);
        setSelectedAppleCalendars(calendars.map((calendar) => calendar.id));
        setAppleConnected(true);
        setAppleMessage(`${calendars.length} calendário(s) encontrado(s). Escolha quais deseja sincronizar.`);
      } else {
        const response = await syncAppleCalendar(selectedAppleCalendars);
        const count = await saveAppleEvents(response.events ?? []);
        setAppleMessage(`${count} evento(s) sincronizado(s) de ${selectedAppleCalendars.length} calendário(s). Seus compromissos manuais foram preservados.`);
      }
    } catch (cause) {
      setAppleMessage(cause instanceof Error ? cause.message : 'Não foi possível sincronizar o Calendário Apple.');
    } finally {
      setAppleBusy(false);
    }
  }

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
    if (!startsAt || !endsAt || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setError('Informe datas e horários válidos para o compromisso.');
      return;
    }
    if (end <= start) {
      setError('O horário de término deve ser posterior ao início.');
      return;
    }
    const candidate = { id: '__new__', startsAt: start.toISOString(), endsAt: end.toISOString() };
    const overlaps = findAppointmentConflicts(items, { ...candidate, id: editingId ?? candidate.id });
    if (overlaps.length) {
      setConflicts(overlaps);
      setError('Este horário coincide com outro compromisso. Ajuste o horário antes de salvar.');
      return;
    }
    try {
      const input = { title, type, startsAt: start.toISOString(), endsAt: end.toISOString(), location: location.trim(), description: description.trim() };
      if (editingId) await agenda.update(editingId, input);
      else await agenda.create(input);
      resetForm();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o compromisso.');
    }
  }

  function resetForm() {
    setTitle('');
    setType('personal');
    setStartsAt(localDateTime(new Date(Date.now() + 60 * 60_000)));
    setEndsAt(localDateTime(new Date(Date.now() + 2 * 60 * 60_000)));
    setLocation('');
    setDescription('');
    setEditingId(null);
    setShowForm(false);
    setConflicts([]);
    setError('');
  }

  function editAppointment(item: Appointment) {
    setEditingId(item.id);
    setTitle(item.title);
    setType(item.type);
    setStartsAt(localDateTime(new Date(item.startsAt)));
    setEndsAt(localDateTime(new Date(item.endsAt)));
    setLocation(item.location ?? '');
    setDescription(item.description ?? '');
    setConflicts([]);
    setError('');
    setShowForm(true);
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
        <button className="primary-action" type="button" onClick={() => { if (showForm) resetForm(); else { setEditingId(null); setShowForm(true); setError(''); setConflicts([]); } }}>
          {showForm ? 'Fechar' : '+ Novo compromisso'}
        </button>
      </div>

      <section className="entry-panel apple-calendar-panel" aria-labelledby="apple-calendar-title">
        <div className="apple-calendar-heading"><div><span className="card-label">INTEGRAÇÃO COM APPLE</span><h3 id="apple-calendar-title">Conectar Calendário Apple</h3></div><span className={appleAvailable ? 'apple-calendar-indicator' : 'apple-calendar-unavailable'}><span /> {appleAvailable ? 'Disponível neste dispositivo' : 'Aguardando app iOS'}</span></div>
        {appleAvailable ? <>
          <p>Conecte o calendário do iPhone para trazer seus próximos 90 dias de eventos. A sincronização é somente leitura e não altera seus compromissos manuais.</p>
          <div className="apple-calendar-actions">
            <button className="primary-action" type="button" disabled={appleBusy} onClick={() => void handleAppleCalendar(true)}>{appleBusy ? 'Aguarde...' : appleConnected ? 'Atualizar lista de calendários' : 'Conectar Calendário Apple'}</button>
            <button className="text-action" type="button" disabled={appleBusy || !appleConnected || selectedAppleCalendars.length === 0} onClick={() => void handleAppleCalendar(false)}>Sincronizar selecionados</button>
          </div>
          {appleConnected && <div className="apple-calendar-picker"><strong>Escolha os calendários para importar</strong>{appleCalendars.length === 0 ? <p>Nenhum calendário disponível para leitura.</p> : appleCalendars.map((calendar) => <label key={calendar.id} className="apple-calendar-option"><input type="checkbox" checked={selectedAppleCalendars.includes(calendar.id)} onChange={(event) => setSelectedAppleCalendars((current) => event.target.checked ? [...current, calendar.id] : current.filter((id) => id !== calendar.id))} /><span><b>{calendar.title}</b><small>{calendar.source}</small></span></label>)}</div>}
          {appleLastSync && <small className="apple-calendar-last-sync">Última sincronização: {new Date(appleLastSync).toLocaleString('pt-BR')}</small>}
          {appleMessage && <p className="module-feedback" role="status">{appleMessage}</p>}
        </> : <>
          <p>Você está usando o Alfred pelo navegador. Para adicionar seu calendário diretamente, sem exportar arquivos, será necessário abrir o Alfred no aplicativo iOS nativo, que usa a permissão oficial do sistema Apple.</p>
          <p className="apple-calendar-note">A conexão direta está em preparação e ainda não pode ser ativada nesta página. Enquanto isso, você pode importar um arquivo .ics na seção abaixo.</p>
        </>}
      </section>
      <ICalendarImport existing={items} onImported={refresh} />

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
          <span className="card-label">{editingId ? 'EDITAR COMPROMISSO' : 'NOVO COMPROMISSO'}</span>
          <h2>{editingId ? 'Atualize seus dados.' : 'O que está marcado?'}</h2>
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
          <div className="agenda-form-actions"><button className="primary-action" type="submit">{editingId ? 'Salvar alterações' : 'Salvar compromisso'}</button>{editingId && <button className="text-action" type="button" onClick={resetForm}>Cancelar edição</button>}</div>
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
              <div className="appointment-actions"><button className="text-action" type="button" onClick={() => editAppointment(item)}>Editar</button><button className="text-action" type="button" onClick={() => void cancelAppointment(item)}>Cancelar</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
