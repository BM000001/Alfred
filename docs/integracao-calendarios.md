# Integração de calendários do Alfred

## Objetivo

Permitir que o Alfred leia eventos do calendário escolhido pelo usuário, sem exigir cadastro manual e sem enviar o conteúdo dos eventos a um servidor próprio.

## Limite da versão atual

O Alfred publicado em GitHub Pages é uma aplicação web/PWA. O Safari e os demais navegadores não expõem a API EventKit do iOS para páginas web. Portanto, uma página web não consegue solicitar acesso direto a todos os calendários do iPhone. A importação .ics existente continua sendo a alternativa manual compatível com a versão web.

Não devemos simular uma conexão automática nem pedir credenciais do iCloud. Acesso direto ao Calendário Apple requer um contêiner nativo iOS com a permissão do EventKit.

## Etapa Apple (primeira)

1. Criar um aplicativo iOS nativo que hospede a interface do Alfred.
2. Declarar `NSCalendarsFullAccessUsageDescription` no Info.plist, explicando por que o Alfred precisa ler eventos.
3. Solicitar permissão somente quando o usuário tocar em “Conectar Calendário Apple”.
4. Usar EventKit para listar eventos futuros e devolver ao Alfred somente os campos necessários: título, início, fim, dia inteiro, indicador de recorrência, nome e identificador do calendário e local.
5. Fazer correspondência pelo identificador nativo do evento para atualizar registros importados sem duplicá-los.
6. Manter a leitura mínima necessária: título, datas, dia inteiro, calendário e local; não transferir notas privadas do evento.
7. Manter a agenda manual independente e permitir desconectar/revogar o acesso.

O serviço EventKit está em `native/ios/AlfredCalendarAccess.swift`. A casca SwiftUI/WebView está em `native/ios/AlfredApp.swift` e `native/ios/AlfredWebView.swift`. O cliente TypeScript da ponte está em `src/modules/agenda/nativeCalendarBridge.ts`.

### Contrato da ponte

O cliente envia `action` (`connect` ou `sync`) e um `requestId` único. A resposta contém o mesmo `requestId`, permitindo várias solicitações concorrentes sem cruzar resultados. A comunicação só é aceita na página principal HTTPS do host oficial `bm000001.github.io`. O cliente TypeScript oferece `isNativeAppleCalendarAvailable()`, `connectAppleCalendar()` e `syncAppleCalendar(calendarIds)`. Após conceder acesso, o Alfred lista os calendários disponíveis com seus identificadores, títulos e fontes; o usuário escolhe quais serão lidos na sincronização. A seleção é guardada localmente no dispositivo e, ao abrir a Agenda novamente no app iOS, o Alfred tenta atualizar automaticamente os eventos desses calendários. A seção de diagnóstico informa o ambiente em uso, quantidade de calendários selecionados, eventos recebidos na última leitura e eventos Apple ativos já registrados na Agenda. O estado da permissão é descrito com cautela: no navegador não é possível consultá-lo, e no app a confirmação ocorre quando a solicitação nativa é concluída.

Os eventos sem identificador estável do EventKit são ignorados para evitar que uma nova leitura gere cópias difíceis de reconciliar. Os eventos são lidos em uma janela padrão de 90 dias.

**Projeto iOS configurado:** `native/ios/project.yml` define o target iOS 17+ e os três arquivos Swift; `native/ios/Info.plist` declara a mensagem de permissão do EventKit. O projeto Xcode é gerado com XcodeGen. Para gerar e abrir no Mac:

```bash
brew install xcodegen
cd native/ios
xcodegen generate --spec project.yml
open Alfred.xcodeproj
```

O workflow `Alfred iOS Build` gera o projeto e tenta compilar para o simulador iOS no GitHub Actions. A instalação em iPhone ainda exige assinatura Apple Developer e perfil de provisionamento.

O projeto Xcode pode ser gerado a partir da especificação XcodeGen. A compilação automática está configurada, mas ainda precisa concluir com sucesso. A interface da Agenda agora detecta a ponte nativa, oferece conectar/sincronizar no contêiner iOS e faz upsert dos eventos por `apple:<eventIdentifier>`, sem duplicar eventos nem substituir compromissos manuais. Cada resposta de sincronização informa `snapshotComplete`, os calendários consultados e os instantes exatos de início e fim usados pelo EventKit. A reconciliação só é executada se o snapshot estiver explicitamente completo, corresponder exatamente à seleção atual, tiver intervalo válido e todos os eventos tiverem identificadores, calendários e datas válidos. Se o EventKit retornar qualquer evento sem identificador estável, o app interrompe a operação em vez de omiti-lo e potencialmente arquivá-lo por engano. A reconciliação usa o intervalo nativo exato, não um novo intervalo calculado no navegador. Eventos que possuem regras de repetição no EventKit são identificados com `hasRecurrenceRules` e recebem o indicador “Recorrente” na lista da Agenda; a informação é atualizada a cada sincronização. O nome do calendário de origem também é salvo e exibido em cada compromisso importado, permitindo distinguir, por exemplo, eventos vindos de “Universidade” e “Pessoal”. A importação não envia notas dos eventos para o armazenamento da Agenda. O site/PWA no navegador continua sem acesso direto ao EventKit; a importação .ics segue disponível. A identidade de sincronização agora combina o identificador externo fornecido pelo servidor (`calendarItemExternalIdentifier`) com `occurrenceDate` quando o evento pertence a uma série recorrente. O app nativo também observa notificações `EKEventStoreChanged` e o retorno do aplicativo ao primeiro plano; quando a Agenda está visível, esses sinais disparam uma nova leitura dos calendários selecionados. A sincronização inicial ao abrir a Agenda continua ativa. Se a Agenda não estiver visível, o Alfred aguarda até ela voltar a ficar visível/ser reaberta, em vez de tentar executar tarefas em segundo plano. A data original da ocorrência permanece estável mesmo quando uma ocorrência é deslocada, evitando que todas as instâncias da série sejam fundidas. O `eventIdentifier` continua sendo a chave rápida da ocorrência; se ele mudar após uma movimentação, o serviço tenta migrar o registro existente pela identidade estável. Se houver cópias externas ambíguas, o Alfred prefere criar um registro separado a fundir eventos diferentes. O `calendarItemExternalIdentifier` pode ser nulo ou repetido em cenários de cópias/convites, então não é tratado isoladamente como garantia universal de unicidade.

## Etapa Google (segunda)

A versão web implementa “Conectar Google Agenda” com o **Google Identity Services Token Model**, apropriado para a hospedagem estática do GitHub Pages. Não usa Client Secret, backend, refresh token nem armazenamento persistente do access token: o token permanece somente em memória e expira. É necessário reconectar após recarregar a página ou expirar a sessão. Authorization Code + PKCE/Keychain permanece uma opção para o aplicativo nativo futuro, não o fluxo desta versão web.

A autorização solicita somente `calendar.calendarlist.readonly` e `calendar.events.readonly`. A biblioteca oficial é carregada após tocar em conectar; depois, “Continuar com Google” abre a autorização diretamente no gesto do usuário, evitando perder a ativação do popup durante o carregamento no Safari. O usuário seleciona os calendários explicitamente e aciona “Sincronizar selecionados”. A seleção fica na sessão do painel; atualizar a lista preserva a seleção existente. Não há leitura automática em segundo plano.

A leitura inclui todas as páginas de resultados, expande ocorrências recorrentes e abrange hoje até 90 dias adiante. Título, datas, dia inteiro, recorrência, origem e local são importados; notas, convidados e anexos não são consultados. As identidades incluem o calendário e o ID do evento Google, com namespace separado dos eventos Apple e manuais. Somente após ler e validar todos os calendários selecionados começa a gravação local/reconciliação. Se houver erro de rede, permissão ou dados inválidos durante a leitura, nenhuma gravação ou reconciliação é iniciada. Falhas de armazenamento durante a gravação podem deixar uma atualização parcial, recuperável repetindo a sincronização.

Desconectar limpa o token local e tenta revogar a autorização no Google; eventos já importados são mantidos. Se a revogação falhar, a interface orienta removê-la nas permissões da Conta Google. Editar/cancelar um evento importado altera somente a cópia local e pode ser sobrescrito na próxima sincronização.

### Configuração Google Cloud

1. Criar/selecionar um projeto no Google Cloud e habilitar **Google Calendar API**.
2. Configurar a tela de consentimento OAuth, público e usuários de teste. Em produção, cumprir a verificação que o Google exigir para os escopos solicitados.
3. Criar credencial OAuth do tipo **Aplicativo da Web** e cadastrar as origens JavaScript autorizadas: `https://bm000001.github.io` e, para desenvolvimento, `http://localhost:5173`. Origem não inclui `/Alfred/`. Não é necessário redirect URI para o popup do Token Model.
4. Configurar o Client ID **público** em `VITE_GOOGLE_CALENDAR_CLIENT_ID` antes do build. O deploy Pages lê a variável de repositório `GOOGLE_CALENDAR_CLIENT_ID`. Sem configuração de build, o painel oferece configuração manual do Client ID público, mantida apenas na memória da página. Nunca informar Client Secret, senha ou token.
5. Abrir Agenda → Conectar Google Agenda → autorizar as duas permissões → selecionar calendários → Sincronizar selecionados.
6. Validar em Safari/iPhone e PWA, incluindo bloqueio de popups, permissão parcial, sessão expirada, revogação e reconexão com outra conta.

A configuração de um projeto OAuth real não foi realizada automaticamente. Testes com respostas simuladas não comprovam consentimento real do Google nem funcionamento em Safari.

## Modelo comum e sincronização

- Cada evento importado deve guardar provedor, calendário de origem e identificador externo estável.
- Importações repetidas devem atualizar o mesmo evento, não criar cópias.
- Eventos removidos na origem devem ser tratados com cuidado: primeiro marcar como removidos/sincronizados, sem apagar compromissos manuais.
- O usuário escolhe quais calendários conectar e pode desconectar a qualquer momento.
- A sincronização deve ser somente leitura inicialmente; criar/editar eventos na origem exige uma decisão explícita posterior.
- O Alfred deve informar a última sincronização e apresentar erros de permissão/rede de forma clara.

## Estado

- [x] Importação manual de arquivos .ics na versão web.
- [x] Serviço Swift inicial para leitura via EventKit.
- [x] Ponte com identificador por solicitação e validação HTTPS da origem.
- [x] Especificação XcodeGen, Info.plist e workflow de compilação iOS.
- [ ] Compilação iOS confirmada, assinatura e instalação em dispositivo real.
- [x] Interface nativa de conectar/sincronizar e upsert local idempotente dos eventos Apple.
- [x] Listagem de calendários Apple e seleção dos calendários a importar.
- [x] Persistência local da seleção e tentativa de sincronização ao abrir a Agenda no app nativo.
- [x] Reconciliação de eventos ausentes por calendário de origem, com cancelamento lógico e preservação do histórico.
- [x] Proteção contra snapshots vazios/incompletos quando um calendário selecionado não está mais disponível no dispositivo.
- [x] Classificação automática inicial dos eventos importados pelo título (aula, prova, prazo e pessoal).
- [x] Preservação e exibição de eventos de dia inteiro na Agenda.
- [x] Identificação visual de eventos recorrentes do Calendário Apple.
- [x] Exibição do nome do calendário de origem nos eventos importados.
- [x] Painel de diagnóstico da integração Apple na Agenda.
- [x] Confirmação explícita de snapshot completo, intervalo nativo exato e calendários consultados antes da reconciliação.
- [x] Interrupção segura da sincronização quando algum evento retornado não possui identificador estável ou dados válidos.
- [x] Identidade estável adicional para detectar eventos movidos e ocorrências recorrentes sem fundi-las.
- [x] Atualização automática da Agenda aberta após notificações de mudança do EventKit e retorno do app ao primeiro plano.
- [ ] Sincronização em segundo plano com o app suspenso e testes em dispositivo real.
- [x] Integração web Google Agenda via OAuth (Token Model), seleção, paginação e sincronização manual somente leitura.
- [ ] Configurar Client ID real, consentimento e validar Google/Safari/PWA com conta autorizada.
