# Google Calendar no Safari — plano técnico e estado

## Decisões confirmadas

- Fonte: Google Calendar.
- Sincronização: manual e automática.
- Permissões: leitura e escrita.
- Plataforma prioritária: Safari no iPhone, sem exigir o aplicativo iOS nativo.
- Arquitetura: IndexedDB continua sendo a base local do Alfred. A conexão Google é opcional e revogável.
- Nenhum segredo OAuth, senha ou token deve ser versionado.

## Arquitetura proposta

1. A interface solicita um OAuth Client ID público do tipo Web Application, configurado no Google Cloud Console com a origem autorizada `https://bm000001.github.io`.
2. O usuário inicia a autorização e concede apenas os escopos `calendar.events` e `calendar.calendarlist.readonly`.
3. O cliente Google executa chamadas HTTPS diretamente do navegador para a Google Calendar API. Não há servidor intermediário recebendo títulos, locais, descrições ou horários.
4. Os eventos são normalizados para o modelo local `Appointment`; a origem externa deve ser registrada separadamente para não confundir eventos Google com Apple, ICS ou compromissos manuais.
5. Alterações locais são colocadas em uma fila de saída. Antes de enviar um lote ao Google, Alfred mostra a prévia e pede confirmação. Exclusões externas exigem confirmação específica.
6. A sincronização incremental usa `nextSyncToken`; respostas HTTP 410 invalidam o cursor e exigem uma leitura completa segura. Conflitos são apresentados ao usuário e nunca resolvidos por sobrescrita silenciosa.
7. Tokens de acesso permanecem somente em memória. Desconectar limpa o token. O token não é escrito no IndexedDB, localStorage, logs ou backup.

## Limites reais do Safari e da hospedagem estática

GitHub Pages não executa backend. Um cliente JavaScript público não pode guardar um client secret. A primeira implementação de navegador pode usar tokens de acesso temporários e exigir nova autorização quando expirarem; não deve fingir que possui refresh token permanente.

A sincronização automática significa atualização periódica enquanto o Alfred estiver aberto e ativo, além de sincronização ao retornar ao primeiro plano. O Safari/iOS pode suspender ou encerrar páginas em segundo plano; uma PWA estática não pode garantir sincronização contínua com o navegador fechado. Garantir sincronização em segundo plano exige um backend/BFF seguro com refresh token armazenado no servidor, ou um aplicativo nativo. Isso é uma decisão de infraestrutura separada e não será introduzido sem aprovação.

## Estado desta branch

- [x] Branch isolada criada a partir de `main`.
- [x] Cliente de navegador inicial: autenticação GIS, listagem de calendários, leitura incremental e operações de criação/atualização/exclusão da API.
- [x] Token de acesso mantido somente em memória.
- [ ] Interface de conexão e seleção de calendários na Agenda.
- [ ] Persistência local de metadados Google e cursor incremental.
- [ ] Reconciliação de eventos importados sem afetar compromissos manuais.
- [ ] Fila de saída para criar/editar/excluir eventos locais no Google.
- [ ] Prévia e confirmação explícita das operações de escrita.
- [ ] Tratamento de conflitos, revogação, expiração e cursor HTTP 410.
- [ ] Testes automatizados e validação de build.
- [ ] Teste real no Safari do iPhone.

## Configuração necessária antes do teste OAuth

O proprietário do projeto precisa criar um OAuth Client ID do tipo Web Application no Google Cloud Console, habilitar Google Calendar API e cadastrar a origem `https://bm000001.github.io`. O Client ID é público e pode ser incluído na configuração do frontend; client secret não deve ser criado nem colocado no repositório para este cliente de navegador.

O app ainda não deve exibir “Conectado” nem permitir operações reais até a interface, os testes e a configuração do Client ID estarem concluídos.
