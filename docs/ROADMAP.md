# Roadmap — Alfred

O roadmap descreve o estado verificável do produto. Uma funcionalidade só é considerada concluída quando está implementada e coberta por validação adequada; testes automatizados não substituem testes em dispositivo real.

## Etapa 1 — Fundação técnica
- [x] React, TypeScript, Vite e Vitest.
- [x] Estrutura modular e persistência local com IndexedDB.
- [x] Navegação responsiva e aplicação PWA.
- [x] Pipeline de CI para instalação, auditoria, testes e build.
- [ ] Revisão visual e funcional em dispositivos reais.

## Etapa 2 — Organização pessoal
- [x] Cadastro e gerenciamento de tarefas, prioridades, estados, filtros e progresso.
- [x] Projetos e organização das tarefas.
- [x] Backup e restauração JSON com prévia e confirmação.
- [x] Exportação de backup protegida por senha.
- [x] Testes automatizados das regras principais.

## Etapa 3 — Agenda e estudos
- [x] Cadastro e gerenciamento local de compromissos.
- [x] Visões de agenda Dia, Semana e Mês.
- [x] Detecção de conflitos de horário.
- [x] Importação de arquivos iCalendar (.ics), com prévia e confirmação.
- [x] Disciplinas, tópicos, anotações, conclusão e acompanhamento de progresso.
- [ ] Sincronização direta com provedores de calendário — não implementada; a importação .ics é manual.
- [ ] Tratamento de eventos recorrentes na importação — atualmente ignorados com aviso.

## Etapa 4 — Painel e produtividade
- [x] Painel com pendências, atrasos, próximos compromissos e briefing diário.
- [x] Pomodoro e histórico de sessões.
- [x] Alertas e recomendações locais explicáveis.
- [ ] Preferências avançadas configuráveis para todos os alertas e rotinas.
- [ ] Validação de usabilidade e acessibilidade em dispositivos reais.

## Etapa 5 — Assistente local e contexto
- [ ] Fundação do Alfred Brain em andamento na branch `feature/alfred-brain-foundation`: contratos de intenção/contexto, orquestração provider-independent e registro inicial de ferramentas; aguardando revisão e CI.
- [x] Interface conversacional conectada aos dados locais.
- [x] Consultas locais de tarefas, agenda e progresso dos estudos.
- [x] Histórico local de conversas, com limite e ação explícita para apagar.
- [x] Memórias estruturadas cadastradas manualmente e recuperadas por correspondência lexical explicável.
- [x] Propostas de alteração de tarefas com confirmação explícita.
- [x] Portão de exportação manual, revisão do conteúdo e consentimento por classe de dados.
- [ ] Busca semântica — não implementada; a recuperação atual é lexical.
- [ ] Extração automática de memórias — não implementada.
- [ ] Modelo de IA generativa conectado — não há provedor remoto ativo.
- [ ] Resumos e recomendações generativas com fontes e incertezas.

## Etapa 6 — Protocolo Tático e integrações
- [x] Fundamentos de propostas, validação e aprovação explícita de ações.
- [ ] Reorganização de agenda/tarefas após imprevistos, com simulação e justificativas.
- [ ] Aprovação em lote e revisão de impactos.
- [ ] Integrações externas avaliadas individualmente, sempre com minimização de dados e consentimento.
- [ ] Nenhuma dependência da Vercel ou backend remoto obrigatório.

## Etapa 7 — Experiência avançada e confiabilidade
- [x] Manifesto PWA e service worker.
- [x] Instruções de instalação e roteiro de 11 testes manuais no iPhone.
- [ ] Executar e registrar os testes manuais no Safari/iPhone.
- [ ] Verificar persistência após períodos prolongados sem abrir o app.
- [ ] Revisar acessibilidade, desempenho, segurança e licenças de dependências/assets.
- [ ] Avaliar notificações configuráveis e comandos por voz, sem comprometer privacidade.

## Próximas prioridades
1. Executar o roteiro manual em iPhone/Safari e registrar resultados reais; não marcar como concluído com base apenas no CI.
2. Corrigir problemas encontrados em instalação PWA, navegação mobile, teclado, offline, backup/restauração e persistência.
3. Ampliar testes da interface conversacional para erros de IndexedDB, carregamento, mensagens longas e acessibilidade.
4. Só então avaliar recursos generativos ou integrações externas, mantendo credenciais fora do frontend, contexto mínimo e autorização explícita.

## Regra de conclusão
Uma tarefa só pode ser marcada como concluída quando estiver implementada, revisada e validada pelo tipo de teste apropriado. Registre resultados e limitações em `CONTINUIDADE.md`.
