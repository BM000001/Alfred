# Continuidade do Alfred

## Estado atual — 2026-11-02
- `main` é a fonte da verdade; desenvolver em branches e PRs.
- PR #29 — análise arquitetural do Jarvis — integrada.
- PR #30 — fundação segura do assistente — integrada.
- PR #31 — interface conversacional local — integrada no commit `19863d0604a2d6b053d172964e0a2da49e1ec663`.
- GitHub Actions da PR #31: Alfred CI concluído com sucesso (run #90).
- Não criar dados fictícios ou de demonstração.

## Funcionalidades integradas
- Tarefas e projetos: cadastro, filtros, conclusão, arquivamento e progresso.
- Agenda: compromissos, visualizações Dia/Semana/Mês, detecção de conflitos, edição, cancelamento e persistência local.
- Importação iCalendar: arquivo .ics, prévia e confirmação explícita; eventos recorrentes são ignorados com aviso; sem sincronização direta com iCloud.
- Painel inicial: pendências, atrasos, compromissos próximos e briefing diário; somente leitura para recomendações.
- Estudos: disciplinas, conteúdos, anotações, filtros, conclusão e progresso.
- Arquivos: adicionar, pesquisar, baixar e excluir arquivos (limite de 10 MB por arquivo).
- Backup/restauração: JSON com arquivos em Base64, prévia e confirmação explícita para substituir dados locais.
- Produtividade: Pomodoro, histórico de sessões e associação opcional com tarefas.
- Persistência local via IndexedDB, sem backend próprio.

## Assistente Alfred — estado real
- Contratos provider-independent para mensagens, contexto, providers, ferramentas, propostas e decisões de aprovação.
- Ferramentas locais somente leitura para tarefas pendentes, próximos compromissos e progresso dos estudos.
- Provider inicial baseado em regras locais; não chama APIs externas nem envia dados pessoais.
- Interface conversacional acessível/responsiva conectada aos dados reais do IndexedDB.
- Mensagens existem somente na sessão atual; ainda não há memória persistente, modelo de IA remoto, voz ou execução de alterações.
- A interface é uma primeira versão conversacional, não um assistente geral nem uma extração completa do Jarvis.

## Integração Jarvis — análise concluída, código não copiado
- Documento: `docs/ANALISE-JARVIS.md`.
- A análise identificou arquitetura e capacidades reutilizáveis, mas nenhum código do Jarvis foi copiado.
- Decisão: preservar React/Vite, IndexedDB e serviços existentes; manter provider independente, ferramentas com escopo, aprovação explícita e voz opcional.
- Riscos a tratar: credenciais no frontend, permissões de ferramentas, bridge/SSRF, privacidade de voz e licenças de assets/dependências.

## Etapa 1 recebida de implementação independente
- Os arquivos dessa etapa foram preservados na raiz.
- A PR #22 restaurou a configuração React/Vite que havia sido substituída por configuração TypeScript independente.
- Módulos independentes de domínio, armazenamento, privacidade, criptografia e adaptador manual ainda NÃO estão integrados à aplicação React.
- Não declarar AES-GCM nem consentimento de envio como implementados no produto principal sem integração explícita e testes.
- Testes independentes da Etapa 1 não fazem parte da suíte Vitest do app.

## Pontos de atenção conhecidos
- Rever o limite de tamanho do backup, pois Base64 aumenta os arquivos exportados.
- Rever o ciclo de vida de URLs temporárias de download.
- Ampliar testes da edição de compromissos (conflito próprio, conflito com outro compromisso e limpeza de campos).
- Rever fusos horários no painel e no histórico Pomodoro.
- Investigar vulnerabilidades do npm sem atualizações forçadas indiscriminadas.
- Confirmar publicação e URL do GitHub Pages antes de considerá-la operacional.
- Verificar licenças e atribuições de dependências/assets antes de distribuir.

## Próximas etapas prioritárias
1. Ampliar testes da interface conversacional: três domínios, erro de IndexedDB, mensagens longas, estado de carregamento, acessibilidade e mobile.
2. Implementar propostas de alteração com confirmação explícita e testes provando que nada muda antes da aprovação.
3. Corrigir timezone local do histórico Pomodoro e testar limites entre dias.
4. Integrar backup AES-GCM ao fluxo atual com senha/ação explícita e compatibilidade com backups JSON existentes.
5. Integrar portão de privacidade antes de qualquer provedor externo; sem envio automático de dados.
6. Avaliar provider de IA real somente com credenciais fora do frontend, minimização de contexto, consentimento, limites de custo e tratamento de falhas.
7. Validar Safari/iPhone, publicação GitHub Pages, dependências e licenças.

## Protocolo de trabalho
- Desenvolver em branches e PRs; não alterar `main` diretamente para código.
- Integrar após revisar o diff e confirmar CI verde.
- Não afirmar testes locais: validação oficial deve ser comprovada no GitHub Actions.
- Atualizar este documento em cada marco confirmado.
- Não criar registros fictícios nem incluir segredos ou dados pessoais.
