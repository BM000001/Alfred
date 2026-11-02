# Continuidade do Alfred

> Documento de passagem de contexto entre sessões e ferramentas de desenvolvimento. Atualize ao final de cada sessão.

## Estado atual
- **Fase:** fundação e documentação.
- **Situação:** documentação-base criada e registrada no GitHub.
- **Aplicação executável:** ainda não implementada.
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
- Confirmada a permissão de escrita no repositório GitHub.
- Realizado teste de criação, leitura e remoção de arquivo temporário; operações concluídas.
- README existente foi lido e preservado.
- Criados e registrados: `CLAUDE.md`, `CONTINUIDADE.md`, `docs/VISAO-PRODUTO.md`, `docs/ARQUITETURA.md`, `docs/ROADMAP.md` e `docs/decisoes/README.md`.

## Próxima tarefa
1. Criar o esqueleto React + TypeScript + Vite.
2. Definir scripts de desenvolvimento, teste e build.
3. Criar a primeira tela-base responsiva do Alfred, sem conectar serviços externos.
4. Instalar dependências somente quando necessário e validar build.

## Regras para atualizar este documento
- Registre apenas o que foi realmente feito.
- Inclua comandos de teste executados e seus resultados.
- Não marque funcionalidades como concluídas apenas porque foram planejadas.
- Registre bloqueios e decisões pendentes.
