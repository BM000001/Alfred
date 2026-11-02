import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AssistantMessage } from './assistant/contracts';
import { LocalAssistantProvider } from './assistant/localAssistant';
import { appointmentRepository, studyTopicRepository, taskRepository } from '../storage/repositories';

function createMessage(role: AssistantMessage['role'], content: string): AssistantMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString() };
}

export function Assistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    createMessage('assistant', 'À sua disposição. Posso consultar suas tarefas pendentes, próximos compromissos e progresso dos estudos. Por enquanto, opero localmente e em modo somente leitura.'),
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
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

  return (
    <section className="assistant-module" aria-label="Assistente Alfred">
      <header className="assistant-heading">
        <div><span className="card-label">ALFRED · ASSISTENTE</span><h2>Como posso ajudar?</h2><p>Consultas locais, sem enviar seus dados para serviços externos.</p></div>
        <span className="assistant-status"><i aria-hidden="true" /> Local</span>
      </header>
      <div className="assistant-capabilities" aria-label="Consultas disponíveis">
        <span>Tarefas pendentes</span><span>Próximos compromissos</span><span>Progresso dos estudos</span>
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
      {error && <p className="module-error" role="alert">{error}</p>}
      <form className="assistant-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="assistant-prompt">Mensagem para Alfred</label>
        <input id="assistant-prompt" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ex.: Quais tarefas estão pendentes?" maxLength={500} disabled={loading} />
        <button type="submit" className="primary-action" disabled={loading || !input.trim()}>Enviar</button>
      </form>
      <p className="assistant-disclaimer">Versão inicial: respostas por regras locais, somente leitura. Ainda não há modelo de IA remoto, voz ou execução de alterações.</p>
    </section>
  );
}
