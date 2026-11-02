# Continuidade do Alfred

## Estado atual — 2026-11-02
- `main` é a fonte da verdade.
- Última integração: PR #12 — módulo Estudos.
- Commit integrado: `d9b13753e58eaef188ebad806f84e3d68228be1b`.
- PR #12 passou nos testes e no build pelo GitHub Actions antes do merge.
- Trabalho atual: branch `feat/files-module`, PR em preparação.

## Funcionalidades integradas
- Tarefas e projetos: cadastro, filtros, conclusão, arquivamento e progresso.
- Agenda: compromissos, visualizações Dia/Semana/Mês, detecção de conflitos e persistência local.
- Painel inicial: pendências, atrasos, compromissos de hoje e próximos itens; somente leitura.
- Estudos: disciplinas, conteúdos, anotações, filtros, conclusão e progresso.
- Persistência local via IndexedDB, sem backend próprio.

## Módulo Arquivos — em desenvolvimento
- Modelo de arquivo com metadados e conteúdo Blob.
- Limite de 10 MB por arquivo e rejeição de arquivos vazios.
- Serviços para listar, adicionar, recuperar e excluir arquivos.
- Interface para adicionar, pesquisar, baixar e excluir arquivos.
- Migração do IndexedDB para versão 4 com nova store `files`, preservando stores existentes.
- Dados permanecem no dispositivo; não há envio para servidor.
- Testes unitários do serviço e teste de navegação da interface escritos.
- Ainda depende de CI para confirmar tipagem, testes e build.

## Próximas etapas
1. Abrir PR do módulo Arquivos.
2. Corrigir eventuais falhas reportadas pelo GitHub Actions.
3. Integrar somente após testes e build aprovados.
4. Próxima prioridade após Arquivos: backup e restauração local, para proteger dados do usuário.
5. Depois, revisar temas claro/escuro e experiência mobile.

## Protocolo de trabalho
- Desenvolver em branches e PRs; não alterar `main` diretamente.
- Integrar após CI verde, conforme autorização anterior.
- Não afirmar testes locais: validação oficial pelo GitHub Actions.
- Atualizar este documento em cada marco confirmado.
- Nunca incluir segredos ou dados pessoais.
