# Continuidade do Alfred

## Estado atual — 2026-11-02
- `main` é a fonte da verdade.
- Última integração confirmada: PR #30 — fundação segura do assistente Alfred.
- Commit integrado mais recente confirmado: `5ac2bea4071c65245b0c27add9973d69060f3f25` (PR #30).
- PR #28 — briefing diário de prioridades — está integrada.
- PR #29 — análise arquitetural do Jarvis — está integrada.
- PR #30 — contratos do assistente, ferramentas locais somente leitura e provider por regras — está integrada.
- PR #31 — interface conversacional local — consta como proposta aberta na consulta; antes de integrar, confirmar estado, revisão, arquivos, CI e SHA atual do head.
- Nenhum dado fictício ou de demonstração deve ser criado.

## Funcionalidades integradas
- Tarefas e projetos: cadastro, filtros, conclusão, arquivamento e progresso.
- Agenda: compromissos, visualizações Dia/Semana/Mês, detecção de conflitos, edição, cancelamento e persistência local.
- Importação de calendários iCalendar: arquivo .ics, prévia e confirmação explícita; eventos recorrentes são ignorados com aviso; não há sincronização direta com iCloud.
- Painel inicial: pendências, atrasos, compromissos próximos e briefing diário de prioridades; leitura sem alteração automática dos dados.
- Estudos: disciplinas, conteúdos, anotações, filtros, conclusão e progresso; edição de conteúdos e disciplinas.
- Arquivos: adicionar, pesquisar, baixar e excluir arquivos (limite de 10 MB por arquivo).
- Backup e restauração: exportação JSON com arquivos em Base64, pré-visualização e confirmação explícita para substituir os dados locais.
- Produtividade: temporizador Pomodoro, histórico de sessões e associação opcional com tarefas.
- Persistência local via IndexedDB, sem backend próprio.

## Etapa 1 recebida de implementação independente
- Os arquivos da Etapa 1 foram preservados na raiz do repositório.
- A configuração TypeScript independente havia substituído arquivos de configuração React/Vite; a PR #22 restaurou `package.json`, configurações TypeScript, Vite e `index.html`.
- Os módulos independentes de domínio, armazenamento, privacidade, criptografia e adaptador manual ainda NÃO estão integrados à aplicação React.
- Não considerar AES-GCM nem consentimento de envio implementados no produto principal até existir integração explícita e testes no fluxo da aplicação.
- Os testes independentes da Etapa 1 não fazem parte da suíte Vitest do app; devem ter pipeline separado ou migrar para a suíte adequada antes de serem tratados como verificação contínua.

## Pontos de atenção conhecidos
- Revisar o limite de tamanho do backup: Base64 aumenta o tamanho dos arquivos exportados.
- Revisar o ciclo de vida de URLs temporárias no download de arquivos.
- Ampliar testes de interface para edição de compromissos: sem conflito próprio, conflito com outro compromisso e limpeza de local/observações.
- Revisar cálculos de data e fuso horário no painel e no histórico Pomodoro.
- Investigar vulnerabilidades reportadas pelo npm sem aplicar atualizações forçadas indiscriminadamente.
- Verificar workflow de publicação do GitHub Pages e confirmar a URL publicada antes de considerá-la operacional.
- Verificar licenças, atribuições e dependências da Etapa 1 antes de distribuir o produto.

## Integração Jarvis — análise concluída
- Documento: `docs/ANALISE-JARVIS.md`.
- Análise arquitetural documentada; nenhum código do Jarvis foi copiado.
- Decisão: preservar React/Vite, IndexedDB e serviços atuais; IA independente de provedor, ferramentas com escopo e aprovação explícita; voz opcional.
- Riscos registrados: chave de API no frontend do Jarvis, permissões de ferramentas, bridge/SSRF, privacidade de voz e licenças individuais de assets.

## Fundação do assistente — integrada na PR #30
- Contratos provider-independent para mensagens, contexto, provider, ferramentas, propostas e decisões de aprovação.
- Ferramentas locais somente leitura para tarefas, agenda e progresso de estudos.
- Provider inicial baseado em regras locais; não chama APIs externas e não envia dados pessoais.
- Testes para consultas locais reconhecidas e fallback de pedidos não reconhecidos.
- Limitação: ainda não é um LLM conversacional; a compreensão depende de regras locais.

## Interface conversacional — PR #31 em validação
- A proposta adiciona a área Alfred à navegação e uma interface de conversa responsiva.
- A interface lê tarefas, compromissos e tópicos do IndexedDB ao enviar cada consulta.
- Usa o provider local e ferramentas somente leitura; mensagens permanecem apenas na sessão.
- Não oferece ainda LLM remoto, voz, ações de escrita ou memória persistente.
- Antes da integração: conferir status atual da PR, CI verde, testes de interface, acessibilidade/mobile e erros de acesso ao IndexedDB. O estado de CI não foi confirmado nesta atualização.

## Próximas etapas prioritárias
1. Validar e finalizar a PR #31: estado, diff, CI, testes e comportamento mobile; integrar somente após validação.
2. Melhorar testes da interface conversacional, incluindo consultas aos três domínios, falha de armazenamento, mensagens longas, loading e acessibilidade.
3. Implementar propostas de alteração e aprovação explícita, com testes que comprovem que nenhuma mutação ocorre antes da aprovação.
4. Corrigir timezone local do histórico Pomodoro e cobrir limites de dia com testes.
5. Integrar backup criptografado AES-GCM ao fluxo atual, preservando compatibilidade com backups JSON existentes e exigindo senha/ação explícita.
6. Integrar portão de privacidade à futura camada de IA. Não há envio automático a provedores no estado atual.
7. Avaliar adaptador para modelo real somente com credenciais fora do frontend, consentimento explícito, minimização de contexto, limites de custo e tratamento de falhas.
8. Validar experiência mobile, acessibilidade e persistência real em Safari/iPhone.
9. Verificar publicação GitHub Pages, dependências e licenças.

## Protocolo de trabalho
- Desenvolver em branches e PRs; não alterar `main` diretamente para código.
- Integrar após CI verde, conforme autorização anterior, e depois de revisar o diff.
- Não afirmar testes locais: validação oficial deve ser comprovada no GitHub Actions.
- Atualizar este documento em cada marco confirmado.
- Não criar registros fictícios ou de demonstração.
- Nunca incluir segredos ou dados pessoais.
