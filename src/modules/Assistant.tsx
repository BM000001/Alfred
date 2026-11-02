import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ApprovalDecision, AssistantMessage, ToolDefinition } from './assistant/contracts';
import './assistant/assistant.css';
import { ActionApprovalError, executeApprovedProposal } from './assistant/actionApproval';
import { prepareTaskCompletion, type TaskCompletionPreparation } from './assistant/actionProposals';
import { LocalAssistantProvider } from './assistant/localAssistant';
import { appointmentRepository, studyTopicRepository, taskRepository } from '../storage/repositories';

function createMessage(role: AssistantMessage['role'], content: string): AssistantMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

type PendingTaskProposal = Extract<TaskCompletionPreparation, { kind: 'proposal' }>;

export function Assistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    createMessage('assistant', 'À sua disposição. Posso consultar suas tarefas pendentes, próximos compromissos e progresso dos estudos. Também posso preparar uma proposta para concluir uma tarefa; nada será alterado sem sua confirmação explícita.'),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<PendingTaskProposal | null>(null);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading, pendingProposal]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading || approving) return;
    const userMessage = createMessage('user', content);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError('');
    try {
      const [tasks, appointments, topics] = await Promise.all([
        taskRepository.getAll(), appointmentRepository.getAll(), studyTopicRepository.getAll(),
      ]);
      const preparation = prepareTaskCompletion(content, tasks);
      if (preparation.kind === 'proposal') {
        setPendingProposal(preparation);
        setMessages((current) => [...current, createMessage('assistant', 'Preparei uma proposta. Revise os detalhes abaixo e confirme somente se quiser executar a alteração.')]);
        return;
      }
      if (preparation.kind === 'not-found') {
        setMessages((current) => [...current, createMessage('assistant', `Não encontrei uma tarefa com o título exato “${preparation.taskTitle}”. Para evitar alterar a tarefa errada, não criei uma proposta.`)]);
        return;
      }
      if (preparation.kind === 'ambiguous') {
        setMessages((current) => [...current, createMessage('assistant', `Encontrei ${preparation.matches} tarefas chamadas “${preparation.taskTitle}”. Renomeie uma delas para diferenciá-las; não vou escolher por conta própria.`)]);
        return;
      }
      if (preparation.kind === 'already-completed') {
        setMessages((current) => [...current, createMessage('assistant', `A tarefa “${preparation.task.title}” já está concluída. Nenhuma alteração foi feita.`)]);
        return;
      }

      const provider = new LocalAssistantProvider({ tasks, appointments, topics });
      const response = await provider.generate({
        messages: nextMessages,
        context: { locale: 'pt-BR', now: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local' },
      });
      setMessages((current) => [...current, createMessage('assistant', response.message)]);
    } catch {
      setError('Não consegui acessar seus dados locais. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function approveProposal() {
    if (!pendingProposal || approving || loading) return;
    const { proposal, task } = pendingProposal;
    setApproving(true);
    setError('');
    const completeTaskTool: ToolDefinition<unknown, unknown> = {
      id: 'tasks.complete',
      description: 'Marca uma tarefa pendente como concluída.',
      risk: 'write',
      approval: 'explicit-confirmation',
      async execute(input) {
        if (typeof input !== 'object' || input === null || !('id' in input) || typeof input.id !== 'string') {
          throw new ActionApprovalError('Entrada inválida para concluir a tarefa.');
        }
        const current = await taskRepository.getById(input.id);
        if (!current) throw new ActionApprovalError('A tarefa não existe mais. Atualize os dados e tente novamente.');
        if (current.status !== 'pending') throw new ActionApprovalError('A tarefa já foi alterada. Nenhuma nova alteração foi feita.');
        await taskRepository.save({ ...current, status: 'completed' });
        return { id: current.id, title: current.title, status: 'completed' };
      },
    };
    const decision: ApprovalDecision = {
      proposalId: proposal.id,
      approved: true,
      decidedAt: new Date().toISOString(),
    };
    try {
      await executeApprovedProposal(proposal, decision, [completeTaskTool]);
      setPendingProposal(null);
      setMessages((current) => [...current, createMessage('assistant', `Confirmado. A tarefa “${task.title}” foi marcada como concluída.`)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a tarefa. Nenhuma confirmação de sucesso foi registrada.');
    } finally {
      setApproving(false);
    }
  }

  function cancelProposal() {
    if (!pendingProposal || approving) return;
    const title = pendingProposal.task.title;
    setPendingProposal(null);
    setMessages((current) => [...current, createMessage('assistant', `Proposta cancelada. “${title}” continua sem alterações.`)]);
  }

  return (
    <section className="assistant-module" aria-label="Assistente Alfred">
      <header className="assistant-heading">
        <div><span className="card-label">ALFRED · ASSISTENTE</span><h2>Como posso ajudar?</h2><p>Consultas locais, sem enviar seus dados para serviços externos.</p></div>
        <span className="assistant-status"><i aria-hidden="true" /> Local</span>
      </header>
      <div className="assistant-capabilities" aria-label="Consultas disponíveis">
        <span>Tarefas pendentes</span><span>Próximos compromissos</span><span>Progresso dos estudos</span><span>Concluir tarefa com confirmação</span>
      </div>
      <div className="assistant-conversation" role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((message) => (
          <article className={`assistant-message ${message.role === 'user' ? 'from-user' : 'from-alfred'}`} key={message.id}>
            <span>{message.role === 'user' ? 'Você' : 'Alfred'}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {loading && <p className="assistant-loading" role="status">Consultando seus dados locais…</p>}
        <div ref={endRef} />
      </div>
      {pendingProposal && (
        <section className="assistant-proposal" aria-labelledby="assistant-proposal-title" aria-describedby="assistant-proposal-description">
          <span className="card-label">CONFIRMAÇÃO NECESSÁRIA</span>
          <h3 id="assistant-proposal-title">{pendingProposal.proposal.title}</h3>
          <p id="assistant-proposal-description">{pendingProposal.proposal.explanation}</p>
          <div className="assistant-proposal-record"><span>Tarefa afetada</span><strong>{pendingProposal.task.title}</strong></div>
          <p className="assistant-proposal-warning">Nada será alterado até você selecionar “Confirmar alteração”.</p>
          <div className="assistant-proposal-actions">
            <button type="button" className="secondary-action" onClick={cancelProposal} disabled={approving}>Cancelar</button>
            <button type="button" className="primary-action" onClick={approveProposal} disabled={approving || loading}>{approving ? 'Salvando…' : 'Confirmar alteração'}</button>
          </div>
        </section>
      )}
      {error && <p className="module-error" role="alert">{error}</p>}
      <form className="assistant-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="assistant-prompt">Mensagem para Alfred</label>
        <input id="assistant-prompt" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ex.: Quais tarefas estão pendentes?" maxLength={500} disabled={loading || approving} />
        <button type="submit" className="primary-action" disabled={loading || approving || !input.trim()}>Enviar</button>
      </form>
      <p className="assistant-disclaimer">Versão local: consultas por regras e conclusão de tarefa mediante confirmação explícita. Ainda não há modelo de IA remoto, voz ou memória persistente.</p>
    </section>
  );
}
