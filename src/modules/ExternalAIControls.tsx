import { useEffect, useState, type FormEvent } from 'react';
import type { EgressDataClass } from './assistant/egressPolicy';

export interface RemoteAIConsent {
  confirmed: true;
  reviewedSensitive: true;
  classes: EgressDataClass[];
}

interface ExternalAIControlsProps {
  authorized: boolean;
  onModeChange: (enabled: boolean) => void;
  onAuthorizationChange: (consent: RemoteAIConsent | null) => void;
  onAuthenticatedChange: (authenticated: boolean) => void;
}

type APIStatus = 'checking' | 'unavailable' | 'signed-out' | 'signed-in';

const classLabels: Record<EgressDataClass, string> = {
  public: 'Pública',
  personal: 'Pessoal',
  academic: 'Acadêmica',
};

export function ExternalAIControls({
  authorized,
  onModeChange,
  onAuthorizationChange,
  onAuthenticatedChange,
}: ExternalAIControlsProps) {
  const [status, setStatus] = useState<APIStatus>('checking');
  const [password, setPassword] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [classes, setClasses] = useState<EgressDataClass[]>([]);
  const [reviewedSensitive, setReviewedSensitive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('API indisponível');
        return response.json();
      })
      .then((result: { configured?: boolean; authenticated?: boolean }) => {
        if (!active) return;
        if (!result.configured) {
          setStatus('unavailable');
          onAuthenticatedChange(false);
          return;
        }
        const authenticated = result.authenticated === true;
        setStatus(authenticated ? 'signed-in' : 'signed-out');
        onAuthenticatedChange(authenticated);
      })
      .catch(() => {
        if (!active) return;
        setStatus('unavailable');
        onAuthenticatedChange(false);
      });
    return () => { active = false; };
  }, [onAuthenticatedChange]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível entrar.');
      setPassword('');
      setStatus('signed-in');
      onAuthenticatedChange(true);
      setFeedback('Sessão iniciada. A IA externa continua desligada até você ativá-la.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao iniciar sessão.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Não foi possível encerrar a sessão.');
      setStatus('signed-out');
      setEnabled(false);
      setClasses([]);
      setReviewedSensitive(false);
      onModeChange(false);
      onAuthorizationChange(null);
      onAuthenticatedChange(false);
      setFeedback('Sessão encerrada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao sair.');
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: boolean) {
    setEnabled(next);
    setClasses([]);
    setReviewedSensitive(false);
    onModeChange(next);
    onAuthorizationChange(null);
    setError('');
  }

  function toggleClass(value: EgressDataClass, checked: boolean) {
    setClasses((current) => checked ? [...current, value] : current.filter((item) => item !== value));
    onAuthorizationChange(null);
  }

  function authorize() {
    if (!enabled || classes.length === 0 || !reviewedSensitive) return;
    onAuthorizationChange({ confirmed: true, reviewedSensitive: true, classes });
  }

  return (
    <section className="assistant-remote-panel" aria-labelledby="assistant-remote-title">
      <header>
        <div><span className="card-label">INTELIGÊNCIA OPCIONAL</span><h3 id="assistant-remote-title">Conexão com IA externa</h3></div>
        <span className={status === 'signed-in' ? 'assistant-remote-status ready' : 'assistant-remote-status'}>
          {status === 'checking' ? 'Verificando' : status === 'unavailable' ? 'API indisponível' : status === 'signed-in' ? 'Sessão ativa' : 'Não conectado'}
        </span>
      </header>
      <p>O modo local continua sendo o padrão. A conexão externa envia somente a mensagem atual — nunca tarefas, agenda, memórias ou histórico local. No modo externo, Alfred não executa alterações nos seus registros.</p>
      {status === 'checking' && <p role="status">Verificando disponibilidade do backend…</p>}
      {status === 'unavailable' && <p className="assistant-remote-note">O backend ainda não está publicado neste domínio. A versão atual continua funcionando localmente.</p>}
      {status === 'signed-out' && <form className="assistant-remote-login" onSubmit={login}>
        <label htmlFor="assistant-remote-password">Senha de acesso do Alfred</label>
        <div><input id="assistant-remote-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} maxLength={256} required />
          <button type="submit" className="secondary-action" disabled={busy || !password}>{busy ? 'Entrando…' : 'Entrar'}</button></div>
      </form>}
      {status === 'signed-in' && <div className="assistant-remote-controls">
        <div className="assistant-remote-toggle">
          <div><strong>Usar IA externa nesta conversa</strong><small>Desligado por padrão. Não altera o comportamento do modo local.</small></div>
          <button type="button" className={enabled ? 'primary-action' : 'secondary-action'} onClick={() => changeMode(!enabled)} disabled={busy}>
            {enabled ? 'Desativar IA externa' : 'Ativar IA externa'}
          </button>
        </div>
        {enabled && <>
          <strong>Autorize o próximo envio</strong>
          <small>Selecione as categorias que podem estar presentes na mensagem atual.</small>
          <div className="assistant-remote-classes">
            {(['public', 'personal', 'academic'] as const).map((value) => <label key={value}>
              <input type="checkbox" checked={classes.includes(value)} onChange={(event) => toggleClass(value, event.target.checked)} />
              {classLabels[value]}
            </label>)}
          </div>
          <label className="assistant-remote-review"><input type="checkbox" checked={reviewedSensitive} onChange={(event) => { setReviewedSensitive(event.target.checked); onAuthorizationChange(null); }} />
            Revisei a mensagem atual e confirmei que ela não contém dados sensíveis.</label>
          <button type="button" className="secondary-action" onClick={authorize} disabled={classes.length === 0 || !reviewedSensitive}>
            Autorizar somente o próximo envio
          </button>
          <p className="assistant-remote-note" role="status">{authorized ? 'Próximo envio autorizado. A autorização será consumida após uma tentativa.' : 'Nenhum envio autorizado no momento.'}</p>
        </>}
        <button type="button" className="assistant-remote-logout" onClick={() => void logout()} disabled={busy}>Encerrar sessão</button>
      </div>}
      {error && <p className="module-error" role="alert">{error}</p>}
      {feedback && <p className="module-feedback" role="status">{feedback}</p>}
      <p className="assistant-remote-warning">O texto enviado será processado pelo provedor de IA configurado. A confirmação vale apenas para uma mensagem. A revisão de dados sensíveis depende de você; não há detector automático.</p>
    </section>
  );
}
