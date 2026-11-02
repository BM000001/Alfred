# Continuidade do Alfred

> Documento de passagem de contexto entre sessões e ferramentas de desenvolvimento. Atualize ao final de cada sessão.

## Estado atual
- **Fase:** fundação técnica e navegação inicial implementadas.
- **Situação:** correção de limpeza entre testes integrada à `main` pelo PR #1. O GitHub Actions do PR concluiu com sucesso (instalação, testes e build).
- **Aplicação:** tela inicial e navegação entre Início, Estudos, Agenda, Projetos, Arquivos, Produtividade e Configurações. Os módulos internos ainda são placeholders.
- **Última atualização:** 2026-11-02.

## Visão resumida
Alfred é um assistente pessoal inteligente para centralizar estudos, agenda, tarefas, projetos, arquivos e produtividade. Deve ser proativo, mas nunca executar alterações pessoais sem aprovação explícita.

## Decisões já estabelecidas
- Interface elegante, minimalista e responsiva, com prioridade para iPhone.
- Personalidade inspirada em Alfred Pennyworth: respeitosa, inteligente, discreta e levemente bem-humorada.
- Armazenamento local-first; compartilhamento externo somente com consentimento.
- Stack: React, TypeScript, Vite, CSS, IndexedDB, Vitest e PWA em etapa posterior.
- Separação entre interface, regras de negócio, serviços e persistência.
- Ações sobre dados do usuário exigem confirmação explícita.

## Estrutura documental
- `CLAUDE.md`: instruções permanentes para agentes de desenvolvimento.
- `docs/VISAO-PRODUTO.md`: objetivos, usuários, princípios e escopo.
- `docs/ARQUITETURA.md`: arquitetura e decisões técnicas iniciais.
- `docs/ROADMAP.md`: etapas de implementação.
- `docs/PROTOCOLO-SALVAMENTO.md`: regras de checkpoint e preservação do trabalho.

## Histórico confirmado
- Criado esqueleto com React 19, TypeScript, Vite 6 e Vitest 3.
- Criada tela inicial responsiva com identidade visual inicial.
- Implementada navegação principal responsiva para sete áreas; módulos ainda são placeholders.
- Criados testes para a tela inicial e navegação.
- Corrigido o setup de testes com `cleanup()` após cada teste em `src/test/setup.ts`.
- PR #1 (`fix/test-cleanup`) integrado à `main` por squash merge.
- GitHub Actions do PR #1 concluiu com sucesso: instalação, testes e build.
- Workflow `.github/workflows/ci.yml` executa instalação, testes e build em PRs/pushes conforme sua configuração.
- Documentação de produto, arquitetura, roadmap, continuidade e protocolo de salvamento criada.

## Próxima tarefa prioritária
1. Abrir a aplicação no Codespace e revisar a navegação em celular e desktop.
2. Implementar o módulo de tarefas e projetos, começando pelos modelos e regras de negócio.
3. Adicionar persistência local e testes antes de avançar para os próximos módulos.

## Regras para atualizar este documento
- Registre apenas o que foi realmente feito.
- Inclua comandos de teste executados e seus resultados.
- Não marque funcionalidades como concluídas apenas porque foram planejadas.
- Registre bloqueios e decisões pendentes.

## Protocolo obrigatório de salvamento entre sessões

1. **Salvar em etapas pequenas:** após cada funcionalidade ou conjunto coerente de arquivos, revisar o diff, testar, criar commit e fazer push imediatamente.
2. **Não depender do fim da sessão:** nunca acumular toda a implementação para um único commit final.
3. **Troca de conta:** antes de trocar de conta/ferramenta, atualizar este documento e enviar tudo ao GitHub.
4. **Confirmar o salvamento:** só considerar salvo remotamente quando o push for concluído e o commit aparecer no GitHub.
5. **Falha no push:** não apagar nem resetar alterações. Criar backup patch local, registrar seu caminho e manter o Codespace. O trabalho ainda não está salvo no GitHub.
6. **Segurança:** nunca incluir .env, tokens, chaves, senhas ou dados pessoais em commits.
7. **CI não é backup:** GitHub Actions apenas testa o que já foi enviado; não recupera arquivos não commitados.

Cada checkpoint deve registrar: data, branch, hash do commit, resumo, testes e pendências.
