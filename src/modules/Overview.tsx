import { useEffect, useMemo, useState } from 'react';
import type { Task } from './tasks/types';
import type { Appointment } from './agenda/types';
import type { StudyTopic } from './studies/types';
import type { FocusSession } from './productivity/types';
import { taskRepository, appointmentRepository, studyTopicRepository, focusSessionRepository } from '../storage/repositories';
import { summarizeStudyProgress } from './studies/studyRules';
import { summarizeFocusSessions } from './productivity/productivityRules';
import { isTaskOverdue } from './tasks/taskRules';
import { sortAppointmentsByStart } from './agenda/agendaRules';

type Props = {
  onNavigate: (section: 'tarefas' | 'agenda' | 'projetos' | 'estudos' | 'produtividade') => void;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function Overview({ onNavigate }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [topics, setTopics] = useState<StudyTopic[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([taskRepository.getAll(), appointmentRepository.getAll(), studyTopicRepository.getAll(), focusSessionRepository.getAll()])
      .then(([loadedTasks, loadedAppointments, loadedTopics, loadedSessions]) => {
        if (!active) return;
        setTasks(loadedTasks);
        setAppointments(loadedAppointments);
        setTopics(loadedTopics);
        setFocusSessions(loadedSessions);
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar o resumo dos seus dados locais.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const now = new Date();
  const todayKey = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task, now));
  const studyProgress = summarizeStudyProgress(topics);
  const focusSummary = summarizeFocusSessions(focusSessions, now);
  const pendingTasks = tasks.filter((task) => task.status === 'pending');
  const todayAppointments = useMemo(() => sortAppointmentsByStart(
    appointments.filter((item) => item.status === 'scheduled' && item.startsAt.slice(0, 10) === todayKey),
  ), [appointments, todayKey]);
  const upcomingAppointments = useMemo(() => sortAppointmentsByStart(
    appointments.filter((item) => item.status === 'scheduled' && Date.parse(item.startsAt) >= now.getTime()),
  ).slice(0, 3), [appointments, now.toDateString()]);

  return (
    <section className="dashboard" aria-label="Resumo do Alfred">
      {error && <p className="module-error" role="alert">{error}</p>}
      {loading ? <p className="module-feedback">Reunindo suas informações...</p> : (
        <>
          <div className="dashboard-summary">
            <article className="dashboard-stat">
              <span className="card-label">PENDÊNCIAS</span>
              <strong>{pendingTasks.length}</strong>
              <p>{pendingTasks.length === 1 ? 'tarefa aguardando' : 'tarefas aguardando'}</p>
              <button type="button" className="dashboard-link" onClick={() => onNavigate('tarefas')}>Ver tarefas <span aria-hidden="true">→</span></button>
            </article>
            <article className="dashboard-stat">
              <span className="card-label">EM ATRASO</span>
              <strong className={overdueTasks.length ? 'stat-alert' : ''}>{overdueTasks.length}</strong>
              <p>{overdueTasks.length === 1 ? 'tarefa vencida' : 'tarefas vencidas'}</p>
              <button type="button" className="dashboard-link" onClick={() => onNavigate('tarefas')}>Revisar pendências <span aria-hidden="true">→</span></button>
            </article>
            <article className="dashboard-stat">
              <span className="card-label">HOJE NA AGENDA</span>
              <strong>{todayAppointments.length}</strong>
              <p>{todayAppointments.length === 1 ? 'compromisso marcado' : 'compromissos marcados'}</p>
              <button type="button" className="dashboard-link" onClick={() => onNavigate('agenda')}>Abrir agenda <span aria-hidden="true">→</span></button>
            </article>
          </div>

          <div className="dashboard-insights">
            <article className="dashboard-insight">
              <div><span className="card-label">ESTUDOS</span><strong>{studyProgress.percentage}%</strong><p>{studyProgress.completed} de {studyProgress.total} conteúdos concluídos</p></div>
              <div className="progress-track" role="progressbar" aria-label="Progresso dos estudos" aria-valuenow={studyProgress.percentage} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${studyProgress.percentage}%` }} /></div>
              <button type="button" className="dashboard-link" onClick={() => onNavigate('estudos')}>Acompanhar estudos <span aria-hidden="true">→</span></button>
            </article>
            <article className="dashboard-insight">
              <div><span className="card-label">FOCO DE HOJE</span><strong>{focusSummary.todayMinutes} min</strong><p>{focusSummary.today} sessões concluídas · {focusSummary.total} no histórico</p></div>
              <div className="focus-mini-history">{focusSummary.recent.slice(0, 3).map((session) => <span key={session.id}>{session.taskTitle || 'Foco livre'} · {session.durationMinutes} min</span>)}</div>
              <button type="button" className="dashboard-link" onClick={() => onNavigate('produtividade')}>Abrir produtividade <span aria-hidden="true">→</span></button>
            </article>
          </div>
          <div className="dashboard-columns">
            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div><span className="card-label">PRÓXIMOS PASSOS</span><h2>O que merece atenção</h2></div>
                <button type="button" className="dashboard-link" onClick={() => onNavigate('tarefas')}>Ver todas</button>
              </div>
              {pendingTasks.length === 0 ? (
                <p className="dashboard-empty">Nenhuma tarefa pendente. Um raro momento de tranquilidade.</p>
              ) : (
                <ul className="dashboard-task-list">
                  {[...pendingTasks].sort((a, b) => {
                    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    return ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]);
                  }).slice(0, 4).map((task) => (
                    <li key={task.id}>
                      <span className={`dashboard-priority priority-${task.priority}`} aria-label={`Prioridade ${task.priority === 'high' ? 'alta' : task.priority === 'medium' ? 'média' : 'baixa'}`} />
                      <div><strong>{task.title}</strong><span>{task.dueDate ? `Prazo · ${formatDate(`${task.dueDate}T12:00:00`)}` : 'Sem prazo definido'}</span></div>
                      {isTaskOverdue(task, now) && <em>Atrasada</em>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div><span className="card-label">AGENDA</span><h2>Próximos compromissos</h2></div>
                <button type="button" className="dashboard-link" onClick={() => onNavigate('agenda')}>Abrir</button>
              </div>
              {upcomingAppointments.length === 0 ? (
                <p className="dashboard-empty">Nenhum compromisso futuro cadastrado.</p>
              ) : (
                <ul className="dashboard-event-list">
                  {upcomingAppointments.map((item) => (
                    <li key={item.id}>
                      <div className="event-date"><strong>{formatDate(item.startsAt)}</strong><span>{formatTime(item.startsAt)}</span></div>
                      <div><strong>{item.title}</strong><span>{item.location || ({ class: 'Aula', exam: 'Prova', deadline: 'Prazo', personal: 'Pessoal', other: 'Outro' }[item.type])}</span></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
