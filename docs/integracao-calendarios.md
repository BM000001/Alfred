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
4. Usar EventKit para listar eventos futuros e devolver ao Alfred os campos de título, início, fim, dia inteiro, calendário, local e observações.
5. Fazer correspondência pelo identificador nativo do evento para atualizar registros importados sem duplicá-los.
6. Manter a agenda manual independente e permitir desconectar/revogar o acesso.

O arquivo `native/ios/AlfredCalendarAccess.swift` contém o primeiro serviço nativo EventKit. Ele é um ponto de partida para o aplicativo iOS; ainda não está ligado ao site/PWA nem pode ser compilado pelo pipeline web atual.

## Etapa Google (segunda)

Adicionar “Conectar Google Agenda” com OAuth 2.0 usando Authorization Code + PKCE e escopos mínimos de leitura. Tokens devem ficar no armazenamento seguro do sistema nativo (Keychain no iOS), nunca em código-fonte ou localStorage. Consultar a Google Calendar API e normalizar os eventos para o mesmo formato interno usado pela integração Apple.

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
- [ ] Aplicativo iOS nativo e configuração de permissões.
- [ ] Ponte segura entre o app nativo e a interface Alfred.
- [ ] Sincronização incremental e atualização sem duplicações.
- [ ] Integração Google Agenda via OAuth.
