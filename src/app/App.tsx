import { useState } from 'react';
import { PersonalOrganization } from '../modules/PersonalOrganization';
import { Agenda } from '../modules/Agenda';
import { Overview } from '../modules/Overview';
import { Studies } from '../modules/Studies';
import { Files } from '../modules/Files';
import { BackupSettings } from '../modules/BackupSettings';

const sections = [
  { id: 'inicio', label: 'Início', mark: '⌂' },
  { id: 'tarefas', label: 'Tarefas', mark: '✓' },
  { id: 'estudos', label: 'Estudos', mark: '▤' },
  { id: 'agenda', label: 'Agenda', mark: '▦' },
  { id: 'projetos', label: 'Projetos', mark: '◇' },
  { id: 'arquivos', label: 'Arquivos', mark: '▱' },
  { id: 'produtividade', label: 'Produtividade', mark: '◷' },
  { id: 'configuracoes', label: 'Configurações', mark: '⚙' },
] as const;

type SectionId = (typeof sections)[number]['id'];

const sectionDetails: Record<SectionId, { title: string; description: string }> = {
  inicio: { title: 'Seu dia, sob controle.', description: 'Um espaço claro para entender o que está acontecendo e decidir o próximo passo.' },
  tarefas: { title: 'Tarefas', description: 'Transforme suas prioridades em próximos passos claros.' },
  estudos: { title: 'Estudos', description: 'Disciplinas, conteúdos, cronogramas e avaliações ficarão organizados aqui.' },
  agenda: { title: 'Agenda', description: 'Compromissos, eventos e prazos em uma visão única.' },
  projetos: { title: 'Projetos', description: 'Acompanhe objetivos, etapas e entregas importantes.' },
  arquivos: { title: 'Arquivos', description: 'Seus documentos e materiais, organizados e fáceis de encontrar.' },
  produtividade: { title: 'Produtividade', description: 'Hábitos, foco, pausas e revisões no seu ritmo.' },
  configuracoes: { title: 'Configurações', description: 'Preferências, aparência, privacidade e controle dos seus dados.' },
};

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('inicio');
  const activeDetails = sectionDetails[activeSection];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Alfred, início" onClick={(event) => { event.preventDefault(); setActiveSection('inicio'); }}>
          <span className="brand-mark" aria-hidden="true">A</span>
          <span>Alfred<span className="brand-period">.</span></span>
        </a>
        <span className="topbar-caption">ASSISTENTE PESSOAL</span>
      </header>

      <div className="workspace">
        <nav className="sidebar" aria-label="Navegação principal">
          <p className="nav-caption">ESPAÇO PESSOAL</p>
          {sections.map((section) => (
            <button className={`nav-item ${activeSection === section.id ? 'active' : ''}`} key={section.id} type="button"
              aria-current={activeSection === section.id ? 'page' : undefined} onClick={() => setActiveSection(section.id)}>
              <span className="nav-mark" aria-hidden="true">{section.mark}</span><span>{section.label}</span>
            </button>
          ))}
        </nav>

        <section className="main-content" aria-live="polite">
          <section className="welcome" aria-labelledby="welcome-title">
            <p className="eyebrow">{activeSection === 'inicio' ? 'SEU DIA, SOB CONTROLE' : 'ALFRED · ESPAÇO PESSOAL'}</p>
            <h1 id="welcome-title">{activeSection === 'inicio' ? 'Boa tarde.' : activeDetails.title}</h1>
            <p className="welcome-copy">{activeSection === 'inicio' ? 'Estou preparando seu espaço. Em breve, suas prioridades estarão reunidas aqui.' : activeDetails.description}</p>
          </section>

          {activeSection === 'inicio' ? (
            <Overview onNavigate={setActiveSection} />
          ) : activeSection === 'agenda' ? (
            <Agenda />
          ) : activeSection === 'estudos' ? (
            <Studies />
          ) : activeSection === 'arquivos' ? (
            <Files />
          ) : activeSection === 'configuracoes' ? (
            <BackupSettings />
          ) : activeSection === 'tarefas' || activeSection === 'projetos' ? (
            <PersonalOrganization section={activeSection} />
          ) : (
            <section className="module-placeholder">
              <span className="placeholder-mark" aria-hidden="true">{sections.find((item) => item.id === activeSection)?.mark}</span>
              <h2>Esta área está sendo preparada.</h2>
              <p>O próximo passo será implementar este módulo com armazenamento local e testes, mantendo você no controle dos dados.</p>
            </section>
          )}
        </section>
      </div>

      <footer className="app-footer"><span>ALFRED</span><span>Discreto. Atento. Ao seu lado.</span></footer>
    </main>
  );
}

export default App;
