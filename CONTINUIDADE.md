# Continuidade do Alfred

> Documento de passagem de contexto entre sessões e ferramentas de desenvolvimento. Atualize ao final de cada sessão.

## Estado atual
- **Fase:** fundação técnica e primeira interface.
- **Situação:** documentação-base e esqueleto inicial React + TypeScript + Vite registrados no GitHub; execução local ainda não verificada.
- **Aplicação:** ponto de entrada React e tela inicial criados; dependências ainda precisam ser instaladas e o build/teste executados no Codespace.
- **Última atualização:** 2026-11-02.

## Visão resumida
Alfred é um assistente pessoal inteligente para centralizar estudos, agenda, tarefas, projetos, arquivos e produtividade. Deve ser proativo, mas nunca executar alterações pessoais sem aprovação explícita.

## Decisões já estabelecidas
- Interface elegante, minimalista e responsiva, com prioridade para iPhone.
- Personalidade inspirada em Alfred Pennyworth: respeitosa, inteligente, discreta e levemente bem-humorada.
- Armazenamento local-first; compartilhamento externo somente com consentimento.
- Stack planejada: React, TypeScript, Vite, CSS, IndexedDB, Vitest e PWA em etapa posterior.
- Separação entre interface, regras de negócio, serviços e persistência.
- Ações sobre dados do usuário exigem confirmação explícita.

## Estrutura documental
- `CLAUDE.md`: instruções permanentes para agentes de desenvolvimento.
- `docs/VISAO-PRODUTO.md`: objetivos, usuários, princípios e escopo.
- `docs/ARQUITETURA.md`: arquitetura e decisões técnicas iniciais.
- `docs/ROADMAP.md`: etapas de implementação.

## Histórico desta etapa
- Criado esqueleto com `package.json`, Vite, TypeScript, React e configuração do Vitest.
- Criada primeira tela-base responsiva com identidade visual inicial.
- Criado teste inicial da tela principal.
- **Validação pendente:** `npm install`, `npm test` e `npm run build` ainda não foram executados.
- Confirmada a permissão de escrita no repositório GitHub.
- Realizado teste de criação, leitura e remoção de arquivo temporário; operações concluídas.
- README existente foi lido e preservado.
- Criados e registrados: `CLAUDE.md`, `CONTINUIDADE.md`, `docs/VISAO-PRODUTO.md`, `docs/ARQUITETURA.md`, `docs/ROADMAP.md` e `docs/decisoes/README.md`.

## Próxima tarefa
1. No Codespace, executar `npm install`.
2. Executar `npm test` e corrigir eventuais falhas.
3. Executar `npm run build` e corrigir eventuais falhas.
4. Abrir a aplicação com `npm run dev` e conferir a tela no navegador.
5. Depois da validação, avançar para navegação e módulos de tarefas/projetos.

## Regras para atualizar este documento
- Registre apenas o que foi realmente feito.
- Inclua comandos de teste executados e seus resultados.
- Não marque funcionalidades como concluídas apenas porque foram planejadas.
- Registre bloqueios e decisões pendentes.
