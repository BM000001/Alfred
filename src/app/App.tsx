function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Alfred, início">
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>Alfred<span className="brand-period">.</span></span>
        </a>
        <span className="topbar-caption">ASSISTENTE PESSOAL</span>
      </header>

      <section className="welcome" aria-labelledby="welcome-title">
        <p className="eyebrow">SEU DIA, SOB CONTROLE</p>
        <h1 id="welcome-title">Boa tarde.</h1>
        <p className="welcome-copy">
          Estou preparando seu espaço. Em breve, suas prioridades estarão reunidas aqui.
        </p>
      </section>

      <section className="overview" aria-label="Visão geral">
        <article className="overview-card">
          <span className="card-label">AGENDA</span>
          <strong>Em preparação</strong>
          <p>Seus compromissos aparecerão aqui.</p>
        </article>
        <article className="overview-card">
          <span className="card-label">PRIORIDADES</span>
          <strong>Em preparação</strong>
          <p>Vamos organizar o que merece atenção.</p>
        </article>
      </section>

      <footer className="app-footer">
        <span>ALFRED</span>
        <span>Discreto. Atento. Ao seu lado.</span>
      </footer>
    </main>
  );
}

export default App;