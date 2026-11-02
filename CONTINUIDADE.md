# Continuidade do Alfred

## Estado atual — 2026-11-02
- `main` é a fonte da verdade.
- Última integração: PR #13 — biblioteca local de arquivos.
- Commit integrado: `ca95a64ee3b2abf3a00c74a3be037fe63f67408e`.
- CI da PR #13: testes e build aprovados na execução #43.
- Trabalho atual: branch `feat/local-backup-restore`, módulo em desenvolvimento.

## Funcionalidades integradas
- Tarefas e projetos: cadastro, filtros, conclusão, arquivamento e progresso.
- Agenda: compromissos, visualizações Dia/Semana/Mês, detecção de conflitos e persistência local.
- Painel inicial: pendências, atrasos, compromissos de hoje e próximos itens; somente leitura.
- Estudos: disciplinas, conteúdos, anotações, filtros, conclusão e progresso.
- Arquivos: adicionar, pesquisar, baixar e excluir arquivos (limite de 10 MB por arquivo).
- Persistência local via IndexedDB, sem backend próprio.

## Backup e restauração — em desenvolvimento
- Exportação de tarefas, projetos, compromissos, disciplinas, conteúdos e arquivos em JSON.
- Conteúdo dos arquivos incluído no backup em Base64.
- Validação de formato, versão e estrutura antes da restauração.
- Restauração substitui os dados locais e exige confirmação explícita.
- Interface adicionada às Configurações.
- Testes de validação do formato e teste de navegação escritos.
- Ainda depende de CI para confirmar tipagem, testes e build.

## Próximas etapas
1. Validar backup e restauração com GitHub Actions.
2. Corrigir falhas, se houver, e integrar somente após testes e build aprovados.
3. Revisar segurança e limites de tamanho dos backups.
4. Revisar experiência mobile e acessibilidade.
5. Implementar temas claro/escuro e módulos restantes.

## Protocolo de trabalho
- Desenvolver em branches e PRs; não alterar `main` diretamente.
- Integrar após CI verde, conforme autorização anterior.
- Não afirmar testes locais: validação oficial pelo GitHub Actions.
- Atualizar este documento em cada marco confirmado.
- Nunca incluir segredos ou dados pessoais.
