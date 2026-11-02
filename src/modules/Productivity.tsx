import { useEffect, useState } from 'react';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export function Productivity() {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [remaining, setRemaining] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          if (mode === 'focus') {
            setSessions((count) => count + 1);
            setMode('break');
            return BREAK_SECONDS;
          }
          setMode('focus');
          return WORK_SECONDS;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, mode]);

  const total = mode === 'focus' ? WORK_SECONDS : BREAK_SECONDS;
  const progress = ((total - remaining) / total) * 100;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');

  function reset() {
    setRunning(false);
    setRemaining(mode === 'focus' ? WORK_SECONDS : BREAK_SECONDS);
  }

  function changeMode(next: 'focus' | 'break') {
    setRunning(false);
    setMode(next);
    setRemaining(next === 'focus' ? WORK_SECONDS : BREAK_SECONDS);
  }

  return (
    <section className="productivity-module">
      <div className="focus-card">
        <div className="focus-card-heading">
          <div><span className="card-label">SESSÃO ATUAL</span><h2>{mode === 'focus' ? 'Hora de concentrar.' : 'Pausa merecida.'}</h2></div>
          <span className="focus-session-count">{sessions} {sessions === 1 ? 'sessão concluída' : 'sessões concluídas'}</span>
        </div>
        <div className="focus-mode-switch" role="group" aria-label="Tipo de sessão">
          <button type="button" className={mode === 'focus' ? 'selected' : ''} onClick={() => changeMode('focus')}>Foco · 25 min</button>
          <button type="button" className={mode === 'break' ? 'selected' : ''} onClick={() => changeMode('break')}>Pausa · 5 min</button>
        </div>
        <div className="focus-clock" aria-live="off"><span>{minutes}</span><i>:</i><span>{seconds}</span></div>
        <div className="focus-progress" role="progressbar" aria-label="Progresso da sessão" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: progress + '%' }} /></div>
        <p className="focus-guidance">{running ? 'Uma coisa de cada vez. Alfred está cuidando do tempo.' : 'Escolha uma tarefa, afaste as distrações e comece quando estiver pronto.'}</p>
        <div className="focus-actions">
          <button className="primary-action" type="button" onClick={() => setRunning((value) => !value)}>{running ? 'Pausar sessão' : 'Iniciar sessão'}</button>
          <button className="secondary-action" type="button" onClick={reset}>Reiniciar</button>
        </div>
      </div>
      <div className="focus-side-card">
        <span className="card-label">MÉTODO POMODORO</span>
        <h3>Ritmo sustentável.</h3>
        <p>Trabalhe por 25 minutos e faça uma pausa de 5. Ao concluir quatro sessões, considere uma pausa mais longa.</p>
        <div className="focus-cycle" aria-label={sessions % 4 + ' de 4 sessões no ciclo'}>
          {[0, 1, 2, 3].map((item) => <span key={item} className={item < sessions % 4 ? 'done' : ''} />)}
        </div>
        <small>{sessions % 4} de 4 sessões neste ciclo</small>
      </div>
    </section>
  );
}
