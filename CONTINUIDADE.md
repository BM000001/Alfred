# Continuidade do Alfred

## Estado atual — 2026-11-02
- `main` é a fonte da verdade.
- Última integração: PR #19 — edição de conteúdos no módulo Estudos.
- Commit integrado: `592f86d24469e27cee9c94cf9522a46d956677dd`.
- CI da PR #19: execução #58 aprovada (testes e build).
- Nenhum dado fictício ou de demonstração foi criado.

## Funcionalidades integradas
- Tarefas e projetos: cadastro, filtros, conclusão, arquivamento e progresso.
- Agenda: compromissos, visualizações Dia/Semana/Mês, detecção de conflitos, edição, cancelamento e persistência local.
- Painel inicial: pendências, atrasos, compromissos de hoje e próximos itens; somente leitura.
- Estudos: disciplinas, conteúdos, anotações, filtros, conclusão e progresso; edição de conteúdos integrada. Edição de disciplinas em desenvolvimento no PR #20.
- Arquivos: adicionar, pesquisar, baixar e excluir arquivos (limite de 10 MB por arquivo).
- Backup e restauração: exportação JSON com arquivos em Base64, prévia e confirmação explícita para substituir os dados locais.
- Persistência local via IndexedDB, sem backend próprio.

## Pontos de atenção conhecidos
- Revisar o limite de tamanho do backup: Base64 aumenta o tamanho dos arquivos exportados.
- Revisar o ciclo de vida de URLs temporárias no download de arquivos.
- Avaliar testes específicos de interface para edição de compromissos, incluindo edição sem conflito próprio, conflito com outro compromisso e limpeza de local/observações.
- Revisar cálculos de data do painel inicial para garantir consistência de fuso horário.
- Investigar as vulnerabilidades reportadas pelo npm sem aplicar atualizações forçadas indiscriminadamente.

## Próximas etapas
1. Finalizar a edição de disciplinas no módulo Estudos (PR #20).
2. Revisar experiência mobile e acessibilidade.
3. Revisar conflitos e limpeza de campos opcionais na edição da Agenda.
4. Implementar temas claro/escuro e módulos restantes.
5. Verificar o workflow de publicação do GitHub Pages e confirmar a URL publicada antes de considerá-la operacional.

## Protocolo de trabalho
- Desenvolver em branches e PRs; não alterar `main` diretamente para código.
- Integrar após CI verde, conforme autorização anterior.
- Não afirmar testes locais: validação oficial pelo GitHub Actions.
- Atualizar este documento em cada marco confirmado.
- Não criar registros fictícios ou de demonstração.
- Nunca incluir segredos ou dados pessoais.
