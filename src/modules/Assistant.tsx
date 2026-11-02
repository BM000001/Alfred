import { FormEvent, useEffect, useState } from 'react';
import type { ActionProposal, ApprovalDecision, AssistantMessage } from './assistant/contracts';
import type { Task } from './tasks/types';
import type { Appointment } from './agenda/types';
import type { StudyTopic } from './studies/types';
import { taskRepository, appointmentRepository, studyTopicRepository } from '../storage/repositories';
import { LocalAssistantProvider } from './assistant/localAssistant';
import { executeApprovedProposal } from './assistant/proposalExecutor';
import './assistant/assistant.css';
type Data = { tasks: Task[]; appointments: Appointment[]; topics: StudyTopic[] };

export function Assistant() {
  const [data, setData] = useState<Data>({ tasks: [], appointments: [], topics: [] });
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [proposal, setProposal] = useState<ActionProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');

  async function refreshData() {
    const [tasks, appointments, topics] = await Promise.all([
      taskRepository.getAll(), appointmentRepository.getAll(), studyTopicRepository.getAll(),
    ]);
    setData({ tasks, appointments, topics });
  }
  useEffect(() => {
    let active = true;
    Promise.all([taskRepository.getAll(), appointmentRepository.getAll(), studyTopicRepository.getAll()])
      .then(([tasks, appointments, topics]) => { if (active) setData({ tasks, appointments, topics }); })
      .catch(() => { if (active) setError('Não consegui acessar seus dados locais.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending || loading || proposal) return;
    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages); setDraft(''); setSending(true); setError('');
    try {
      const provider = new LocalAssistantProvider({ ...data, now: new Date() });
      const response = await provider.generate({
        messages: nextMessages,
        context: { locale: 'pt-BR', now: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: response.message, createdAt: new Date().toISOString() }]);
      if (response.proposal) setProposal(response.proposal);
    } catch {
      setError('Ocorreu um erro ao preparar a resposta. Seus dados não foram alterados.');
    } finally { setSending(false); }
  }

  async function decide(approved: boolean) {
    if (!proposal || approving) return;
    const current = proposal;
    const decision: ApprovalDecision = approved
      ? { proposalId: current.id, approved: true, decidedAt: new Date().toISOString() }
      : { proposalId: current.id, approved: false, decidedAt: new Date().toISOString(), reason: 'Recusada pelo usuário.' };
    setApproving(true); setError('');
    try {
      if (approved) {
        const task = await executeApprovedProposal(current, decision, taskRepository);
        await refreshData();
        setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'assistant', content: 'Pronto. "' + task.title + '" foi marcada como concluída.', createdAt: new Date().toISOString() }]);
      } else {
        setMessages((items) => [...items, { id: crypto.randomUUID(), role: 'assistant', content: 'Tudo bem. Não fiz nenhuma alteração.', createdAt: new Date().toISOString() }]);
      }
      setProposal(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a ação.');
    } finally { setApproving(false); }
  }

  return (
    <section className="assistant-module" aria-label="Conversa com Alfred">
      <div className="assistant-intro">
        <span className="assistant-status"><i /> MODO LOCAL · APROVAÇÃO EXPLÍCITA</span>
        <h2>À sua disposição.</h2>
        <p>Consulte tarefas, compromissos e estudos. Quando uma ação estiver disponível, você verá exatamente o que será alterado e precisará aprovar antes da execução.</p>
      </div>
      <div className="assistant-conversation" aria-live="polite">
        {messages.length === 0 ? (
          <div className="assistant-empty">
            <strong>Por onde começamos?</strong>
            <div className="assistant-suggestions">
              {['Quais tarefas estão pendentes?', 'O que tenho na agenda?', 'Como estão meus estudos?'].map((suggestion) => (
                <button type="button" key={suggestion} onClick={() => setDraft(suggestion)} disabled={loading || sending}>{suggestion}</button>
              ))}
            </div>
          </div>
        ) : messages.map((message) => (
          <article className={'assistant-message ' + message.role} key={message.id}>
            <span>{message.role === 'user' ? 'Você' : 'Alfred'}</span><p>{message.content}</p>
          </article>
        ))}
        {sending && <p className="assistant-thinking">Analisando seus dados locais...</p>}
      </div>
      {proposal && (
        <section className="assistant-proposal" aria-label="Confirmação de ação">
          <span className="assistant-proposal-label">AÇÃO AGUARDANDO SUA APROVAÇÃO</span>
          <h3>{proposal.title}</h3><p>{proposal.explanation}</p>
          <div className="assistant-proposal-actions">
            <button type="button" className="primary-action" onClick={() => void decide(true)} disabled={approving}>{approving ? 'Executando...' : 'Aprovar e executar'}</button>
            <button type="button" className="secondary-action" onClick={() => void decide(false)} disabled={approving}>Não, cancelar</button>
          </div>
        </section>
      )}
      {error && <p className="module-error" role="alert">{error}</p>}
      {loading && <p className="module-feedback">Carregando seus dados...</p>}
      <form className="assistant-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="assistant-prompt">Mensagem para Alfred</label>
        <input id="assistant-prompt" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Pergunte ou peça para concluir uma tarefa..." disabled={loading || sending || Boolean(proposal)} />
        <button className="primary-action" type="submit" disabled={!draft.trim() || loading || sending || Boolean(proposal)}>Enviar</button>
      </form>
      <p className="assistant-disclaimer">Esta versão usa regras locais, não um modelo de IA generativa. A primeira ação disponível é concluir tarefas, sempre mediante aprovação. Nenhum dado é enviado a serviços externos.</p>
    </section>
  );
}
