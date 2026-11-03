import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ActionProposal, ApprovalDecision, AssistantMessage, ToolDefinition } from './assistant/contracts';
import './assistant/assistant.css';
import { ActionApprovalError, executeApprovedProposal } from './assistant/actionApproval';
import { prepareTaskCompletion } from './assistant/actionProposals';
import { prepareTaskCreation } from './assistant/taskCreationProposals';
import { prepareTaskPriorityUpdate } from './assistant/taskUpdateProposals';
import type { Task, TaskPriority } from './tasks/types';
import { LocalAssistantProvider } from './assistant/localAssistant';
import { appointmentRepository, studyTopicRepository, taskRepository } from '../storage/repositories';

function createMessage(role: AssistantMessage['role'], content: string): AssistantMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

type PendingTaskProposal =
  | { action: 'complete'; task: Task; proposal: ActionProposal }
  | { action: 'create'; taskId: string; taskTitle: string; priority: TaskPriority; proposal: ActionProposal }
  | { action: 'priority'; task: Task; priority: TaskPriority; proposal: ActionProposal };

export function Assistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    createMessage('assistant', 'À sua disposição. Posso consultar suas tarefas pendentes, próximos compromissos e progresso dos estudos, além de preparar propostas para criar ou concluir tarefas. Nenhuma alteração será feita sem sua confirmação explícita.'),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<PendingTaskProposal | null>(null);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const recentTaskIdRef = useRef<string | null>(null);

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
      const priorityUpdate = prepareTaskPriorityUpdate(content, tasks, { referenceTaskId: recentTaskIdRef.current });
      if (priorityUpdate.kind === 'proposal') {
        setPendingProposal({ action: 'priority', task: priorityUpdate.task, priority: priorityUpdate.priority, proposal: priorityUpdate.proposal });
        setMessages((current) => [...current, createMessage('assistant', 'Preparei uma proposta para alterar a prioridade. Confira os detalhes e confirme se deseja salvar.')]);
        return;
      }
      if (priorityUpdate.kind === 'not-found') {
        setMessages((current) => [...current, createMessage('assistant', 'Não encontrei “' + priorityUpdate.taskTitle + '”. Não alterei nenhuma tarefa.')]);
        return;
      }
      if (priorityUpdate.kind === 'ambiguous') {
        setMessages((current) => [...current, createMessage('assistant', 'Encontrei ' + priorityUpdate.matches + ' tarefas chamadas “' + priorityUpdate.taskTitle + '”. Não vou escolher uma delas automaticamente.')]);
        return;
      }
      if (priorityUpdate.kind === 'already-set') {
        setMessages((current) => [...current, createMessage('assistant', 'A tarefa “' + priorityUpdate.task.title + '” já está com essa prioridade.')]);
        return;
      }

      const preparation = prepareTaskCompletion(content, tasks, { referenceTaskId: recentTaskIdRef.current });
      if (preparation.kind === 'proposal') {
        setPendingProposal({ action: 'complete', task: preparation.task, proposal: preparation.proposal });
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

      const creation = prepareTaskCreation(content, tasks);
      if (creation.kind === 'proposal') {
        setPendingProposal({
          action: 'create', taskId: creation.taskId, taskTitle: creation.taskTitle,
          priority: creation.priority, proposal: creation.proposal,
        });
        setMessages((current) => [...current, createMessage('assistant', 'Preparei uma proposta para criar a tarefa. Confira o título e a prioridade antes de confirmar.')]);
        return;
      }
      if (creation.kind === 'already-exists') {
        setMessages((current) => [...current, createMessage('assistant', 'Já existe uma tarefa chamada “' + creation.taskTitle + '”. Não criei uma duplicata.')]);
        return;
      }
      if (creation.kind === 'invalid-title') {
        setMessages((current) => [...current, createMessage('assistant', creation.reason)]);
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
    const pending = pendingProposal;
    const proposal = pending.proposal;
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
    const updatePriorityTool: ToolDefinition<unknown, unknown> = {
      id: 'tasks.update-priority',
      description: 'Altera a prioridade de uma tarefa existente.',
      risk: 'write',
      approval: 'explicit-confirmation',
      async execute(input) {
        if (typeof input !== 'object' || input === null) throw new ActionApprovalError('Entrada inválida para alterar a prioridade.');
        const record = input as Record<string, unknown>;
        if (typeof record.id !== 'string' || (record.priority !== 'low' && record.priority !== 'medium' && record.priority !== 'high')) {
          throw new ActionApprovalError('Os dados da alteração de prioridade são inválidos.');
        }
        const current = await taskRepository.getById(record.id);
        if (!current) throw new ActionApprovalError('A tarefa não existe mais. Nenhuma alteração foi feita.');
        await taskRepository.save({ ...current, priority: record.priority });
        return { id: current.id, title: current.title, priority: record.priority };
      },
    };
    const createTaskTool: ToolDefinition<unknown, unknown> = {
      id: 'tasks.create',
      description: 'Cria uma tarefa pendente.',
      risk: 'write',
      approval: 'explicit-confirmation',
      async execute(input) {
        if (typeof input !== 'object' || input === null) throw new ActionApprovalError('Entrada inválida para criar a tarefa.');
        const record = input as Record<string, unknown>;
        const id = record.id;
        const title = record.title;
        const priority = record.priority;
        if (typeof id !== 'string' || typeof title !== 'string' || !title.trim() || title.length > 120 ||
            (priority !== 'low' && priority !== 'medium' && priority !== 'high')) {
          throw new ActionApprovalError('Os dados da nova tarefa são inválidos.');
        }
        if (await taskRepository.getById(id)) throw new ActionApprovalError('O identificador da nova tarefa já está em uso.');
        const existing = await taskRepository.getAll();
        if (existing.some((item) => item.title.toLocaleLowerCase('pt-BR') === title.toLocaleLowerCase('pt-BR'))) {
          throw new ActionApprovalError('Já existe uma tarefa com esse título. Nenhuma tarefa nova foi criada.');
        }
        const created: Task = {
          id, title: title.trim(), priority: priority as TaskPriority,
          status: 'pending', createdAt: new Date().toISOString(),
        };
        await taskRepository.save(created);
        return created;
      },
    };
    const tools = pending.action === 'complete' ? [completeTaskTool] : pending.action === 'create' ? [createTaskTool] : [updatePriorityTool];
    const decision: ApprovalDecision = {
      proposalId: proposal.id,
      approved: true,
      decidedAt: new Date().toISOString(),
    };
    try {
      await executeApprovedProposal(proposal, decision, tools);
      setPendingProposal(null);
      if (pending.action === 'complete') {
        recentTaskIdRef.current = pending.task.id;
        setMessages((current) => [...current, createMessage('assistant', 'Confirmado. A tarefa “' + pending.task.title + '” foi marcada como concluída.')]);
      } else if (pending.action === 'create') {
        recentTaskIdRef.current = pending.taskId;
        setMessages((current) => [...current, createMessage('assistant', 'Confirmado. A tarefa “' + pending.taskTitle + '” foi criada com prioridade média e adicionada às pendências. Agora você pode se referir a ela como “essa tarefa” nesta conversa.')]);
      } else {
        recentTaskIdRef.current = pending.task.id;
        const label = pending.priority === 'high' ? 'alta' : pending.priority === 'low' ? 'baixa' : 'média';
        setMessages((current) => [...current, createMessage('assistant', 'Confirmado. A prioridade de “' + pending.task.title + '” agora é ' + label + '.')]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível executar a ação. Nenhuma confirmação de sucesso foi registrada.');
    } finally {
      setApproving(false);
    }
  }
  function cancelProposal() {
    if (!pendingProposal || approving) return;
    const title = pendingProposal.action === 'create' ? pendingProposal.taskTitle : pendingProposal.task.title;
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
        <span>Tarefas pendentes</span><span>Próximos compromissos</span><span>Progresso dos estudos</span><span>Criar tarefa com confirmação</span><span>Concluir tarefa com confirmação</span><span>Alterar prioridade com confirmação</span>
      </div>
      {messages.length === 1 && (
        <div className="assistant-suggestions" aria-label="Sugestões para começar">
          <span className="assistant-suggestions-label">EXPERIMENTE PERGUNTAR</span>
          <div className="assistant-suggestion-list">
            {[
              'Quais tarefas estão pendentes?',
              'Quais são meus próximos compromissos?',
              'Como está meu progresso nos estudos?',
            ].map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setInput(suggestion)} disabled={loading || approving}>
                <span aria-hidden="true">↗</span>{suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
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
          <div className="assistant-proposal-record"><span>{pendingProposal.action === 'create' ? 'Nova tarefa' : 'Tarefa afetada'}</span><strong>{pendingProposal.action === 'create' ? pendingProposal.taskTitle : pendingProposal.task.title}</strong></div>
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
        <input id="assistant-prompt" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ex.: Quais tarefas estão pendentes?" maxLength={500} disabled={loading || approving || pendingProposal !== null} />
        <button type="submit" className="primary-action" disabled={loading || approving || pendingProposal !== null || !input.trim()}>Enviar</button>
      </form>
      <p className="assistant-disclaimer">Versão local: consultas por regras e criação, conclusão e alteração de prioridade mediante confirmação explícita. O Alfred mantém apenas uma referência temporária à última tarefa criada ou concluída enquanto esta conversa estiver aberta; não é memória persistente.</p>
    </section>
  );
}
