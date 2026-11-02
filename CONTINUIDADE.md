# Continuidade do Alfred

## Estado atual — 2026-11-02
- `main` é a fonte da verdade.
- Última integração: PR #22 — restauração da configuração React + Vite e da entrada HTML do aplicativo.
- Commit integrado: `736e2a7ff147d9e6ed30bf1c4e8de24bea8554a2`.
- CI da PR #22: aprovado (12 arquivos de teste, 70 testes; build de produção aprovado).
- PR #21 — importação iCalendar — também integrada à `main`.
- Nenhum dado fictício ou de demonstração foi criado.

## Funcionalidades integradas
- Tarefas e projetos: cadastro, filtros, conclusão, arquivamento e progresso.
- Agenda: compromissos, visualizações Dia/Semana/Mês, detecção de conflitos, edição, cancelamento e persistência local.
- Importação de calendários iCalendar: arquivo .ics, prévia e confirmação explícita; eventos recorrentes são ignorados com aviso; não há sincronização direta com iCloud.
- Painel inicial: pendências, atrasos, compromissos de hoje e próximos itens; somente leitura.
- Estudos: disciplinas, conteúdos, anotações, filtros, conclusão e progresso; edição de conteúdos e disciplinas.
- Arquivos: adicionar, pesquisar, baixar e excluir arquivos (limite de 10 MB por arquivo).
- Backup e restauração atuais: exportação JSON com arquivos em Base64, prévia e confirmação explícita para substituir os dados locais.
- Persistência local via IndexedDB, sem backend próprio.

## Etapa 1 recebida de implementação independente
- Os arquivos da Etapa 1 foram preservados na raiz do repositório.
- A configuração TypeScript independente havia substituído os arquivos de configuração React/Vite; a PR #22 restaurou `package.json`, configurações TypeScript, Vite e `index.html`.
- Os módulos independentes de domínio, armazenamento, privacidade, criptografia e adaptador manual ainda NÃO estão integrados à aplicação React.
- Não considerar a cifra AES-GCM nem o consentimento de envio implementados no produto principal até existir integração explícita e testes no fluxo da aplicação.
- Os testes independentes da Etapa 1 não fazem parte da suíte Vitest do app. A suíte principal executou 70 testes em 12 arquivos no CI da PR #22.
- A implementação da Etapa 1 relata testes próprios, mas eles ainda precisam de um pipeline separado ou migração de testes para a suíte adequada antes de serem tratados como verificação contínua.

## Pontos de atenção conhecidos
- Revisar o limite de tamanho do backup: Base64 aumenta o tamanho dos arquivos exportados.
- Revisar o ciclo de vida de URLs temporárias no download de arquivos.
- Avaliar testes específicos de interface para edição de compromissos, incluindo edição sem conflito próprio, conflito com outro compromisso e limpeza de local/observações.
- Revisar cálculos de data do painel inicial para garantir consistência de fuso horário.
- Investigar vulnerabilidades reportadas pelo npm sem aplicar atualizações forçadas indiscriminadamente.
- Verificar o workflow de publicação do GitHub Pages e confirmar a URL publicada antes de considerá-la operacional.
- Verificar licença, atribuições de terceiros e dependências da Etapa 1 antes de distribuir o produto.

## Próximas etapas prioritárias
1. Integrar backup criptografado AES-GCM ao fluxo atual, preservando compatibilidade com backups JSON existentes e exigindo senha/ação explícita.
2. Integrar o portão de privacidade à futura camada de IA; por enquanto, não existe envio automático a provedores.
3. Revisar o modelo de entidades independente e mapear apenas campos compatíveis com os módulos atuais.
4. Validar experiência mobile, acessibilidade e persistência real em Safari/iPhone.
5. Verificar publicação GitHub Pages e licenças.

## Protocolo de trabalho
- Desenvolver em branches e PRs; não alterar `main` diretamente para código.
- Integrar após CI verde, conforme autorização anterior.
- Não afirmar testes locais: validação oficial pelo GitHub Actions.
- Atualizar este documento em cada marco confirmado.
- Não criar registros fictícios ou de demonstração.
- Nunca incluir segredos ou dados pessoais.
