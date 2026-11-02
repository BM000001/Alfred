# Continuidade do Alfred

> Documento de passagem de contexto entre sessões e ferramentas de desenvolvimento. Atualize ao final de cada sessão.

## Estado atual
- **Fase:** fundação concluída; navegação inicial implementada.
- **Situação:** CI do GitHub confirmou instalação, testes e build com sucesso; navegação principal responsiva adicionada, aguardando CI da nova alteração.
- **Aplicação:** tela inicial e navegação entre Início, Estudos, Agenda, Projetos, Arquivos, Produtividade e Configurações. Módulos internos ainda são espaços reservados.
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
- CI confirmado com sucesso na execução #3: instalação, testes e build concluídos.
- Implementada navegação principal responsiva com estado local e placeholders para módulos ainda não construídos.
- Adicionado teste de navegação entre Agenda e Estudos; CI da nova alteração pendente de conferência.
- Criado esqueleto com `package.json`, Vite, TypeScript, React e configuração do Vitest.
- Criada primeira tela-base responsiva com identidade visual inicial.
- Criado teste inicial da tela principal.
- **Validação:** workflow `.github/workflows/ci.yml` criado para executar `npm install`, `npm test` e `npm run build` em pushes/PRs para `main`. A execução precisa ser conferida em GitHub Actions; ela não executa dentro do Codespace.
- Confirmada a permissão de escrita no repositório GitHub.
- Realizado teste de criação, leitura e remoção de arquivo temporário; operações concluídas.
- README existente foi lido e preservado.
- Criados e registrados: `CLAUDE.md`, `CONTINUIDADE.md`, `docs/VISAO-PRODUTO.md`, `docs/ARQUITETURA.md`, `docs/ROADMAP.md` e `docs/decisoes/README.md`.

## Próxima tarefa
1. Conferir o resultado do CI após a implementação da navegação.
2. Abrir a aplicação no Codespace e revisar o comportamento em celular e desktop.
3. Implementar o módulo de tarefas e projetos com persistência local, regras de negócio e testes.


## Regras para atualizar este documento
- Registre apenas o que foi realmente feito.
- Inclua comandos de teste executados e seus resultados.
- Não marque funcionalidades como concluídas apenas porque foram planejadas.
- Registre bloqueios e decisões pendentes.


## Protocolo obrigatório de salvamento entre sessões

O risco que queremos eliminar é perder trabalho quando uma conta Claude atingir o limite, a sessão for encerrada ou outra conta assumir.

1. **Salvar em etapas pequenas:** após cada funcionalidade ou conjunto coerente de arquivos, revisar o diff, testar, criar commit e fazer push imediatamente.
2. **Não depender do fim da sessão:** nunca acumular toda a implementação para um único commit final.
3. **Troca de conta:** antes de trocar de conta/ferramenta, atualizar este documento e enviar tudo ao GitHub.
4. **Confirmar o salvamento:** só considerar salvo remotamente quando o push for concluído e o commit aparecer no GitHub.
5. **Falha no push:** não apagar nem resetar alterações. Criar backup patch local, registrar seu caminho e manter o Codespace. O trabalho ainda não está salvo no GitHub.
6. **Segurança:** nunca incluir .env, tokens, chaves, senhas ou dados pessoais em commits.
7. **CI não é backup:** GitHub Actions apenas testa o que já foi enviado; não recupera arquivos não commitados.

Cada checkpoint deve registrar: data, branch, hash do commit, resumo, testes e pendências.
