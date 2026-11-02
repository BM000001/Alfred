import { FormEvent, useEffect, useState } from 'react';
import type { AssistantMessage } from './assistant/contracts';
import type { Task } from './tasks/types';
import type { Appointment } from './agenda/types';
import type { StudyTopic } from './studies/types';
import { taskRepository, appointmentRepository, studyTopicRepository } from '../storage/repositories';
import { LocalAssistantProvider } from './assistant/localAssistant';

type Data = { tasks: Task[]; appointments: Appointment[]; topics: StudyTopic[] };

export function Assistant() {
  const [data, setData] = useState<Data>({ tasks: [], appointments: [], topics: [] });
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

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
    if (!content || sending || loading) return;
    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: 'user', content, createdAt: new Date().toISOString() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft('');
    setSending(true);
    try {
      const provider = new LocalAssistantProvider({ ...data, now: new Date() });
      const response = await provider.generate({
        messages: nextMessages,
        context: { locale: 'pt-BR', now: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: response.message, createdAt: new Date().toISOString() }]);
    } catch {
      setError('Ocorreu um erro ao preparar a resposta. Seus dados não foram alterados.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="assistant-module" aria-label="Conversa com Alfred">
      <div className="assistant-intro">
        <span className="assistant-status"><i /> MODO LOCAL · SOMENTE LEITURA</span>
        <h2>À sua disposição.</h2>
        <p>Posso consultar suas tarefas, próximos compromissos e progresso dos estudos. Suas informações permanecem no dispositivo.</p>
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
          <article className={`assistant-message ${message.role}`} key={message.id}>
            <span>{message.role === 'user' ? 'Você' : 'Alfred'}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {sending && <p className="assistant-thinking">Analisando seus dados locais...</p>}
      </div>
      {error && <p className="module-error" role="alert">{error}</p>}
      {loading && <p className="module-feedback">Carregando seus dados...</p>}
      <form className="assistant-composer" onSubmit={send}>
        <label className="sr-only" htmlFor="assistant-prompt">Mensagem para Alfred</label>
        <input id="assistant-prompt" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Pergunte sobre tarefas, agenda ou estudos..." disabled={loading || sending} />
        <button className="primary-action" type="submit" disabled={!draft.trim() || loading || sending}>Enviar</button>
      </form>
      <p className="assistant-disclaimer">Esta versão usa regras locais, não um modelo de IA generativa. Ela não cria, edita ou exclui registros.</p>
    </section>
  );
}
