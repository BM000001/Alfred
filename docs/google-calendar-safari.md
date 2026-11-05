# Google Calendar no Safari — decisão de arquitetura

## Decisões confirmadas

- Fonte: Google Calendar.
- Sincronização: manual e automática.
- Permissões: leitura e escrita.
- Plataforma prioritária: Safari no iPhone, sem exigir o aplicativo iOS nativo.
- Arquitetura: IndexedDB continua sendo a base local do Alfred.
- Nenhum segredo OAuth, senha ou token de atualização será versionado ou armazenado no navegador.

## Requisito de segurança

A documentação atual do Google recomenda o fluxo OAuth Authorization Code (GIS Code Model) em vez do fluxo de token no navegador. O Code Model entrega o código ao backend, que valida a solicitação, troca o código por tokens e guarda o refresh token com segurança. O fluxo permite renovar tokens sem pedir consentimento a cada expiração.

Por isso, não manteremos um protótipo de token OAuth no frontend como solução final. Ele exigiria que o usuário estivesse presente para renovar o acesso e seria inferior ao fluxo recomendado para a permissão de escrita.

## Arquitetura recomendada

1. Frontend estático no GitHub Pages, compatível com Safari.
2. Backend mínimo (recomendação inicial: Cloudflare Worker, sem Vercel) para receber o authorization code, validar state/CSRF, trocar código por tokens e guardar refresh token criptografado em armazenamento seguro.
3. O frontend recebe somente uma credencial de sessão curta, nunca o refresh token ou client secret.
4. O backend expõe operações autenticadas e limitadas para listar calendários, ler alterações e executar gravações confirmadas.
5. IndexedDB continua sendo a fonte local de verdade. Eventos e metadados de sincronização ficam no dispositivo; o backend guarda apenas o mínimo necessário para autenticação e renovação.
6. Escopos Google mínimos: `calendar.events` (leitura/escrita de eventos) e `calendar.calendarlist.readonly` (listar calendários).
7. Cada evento externo recebe identidade composta por provedor + calendário + ID do evento. Eventos manuais nunca são reconciliados como eventos importados.
8. A sincronização de entrada usa `nextSyncToken`; HTTP 410 invalida o cursor e exige leitura completa controlada.
9. A sincronização de saída usa fila local, prévia e confirmação explícita. Atualizações usam ETag/If-Match para evitar sobrescrita concorrente; exclusões exigem confirmação específica.
10. Conflitos são apresentados ao usuário. Nunca escolher automaticamente entre a versão local e a versão Google quando ambas foram alteradas.

## Limite real do Safari

Safari/iOS pode suspender a página quando vai para segundo plano. Uma página web estática não consegue garantir execução contínua com o navegador fechado. O backend permite renovar credenciais e executar tarefas agendadas, mas sincronizar alterações locais enquanto o Safari está fechado só é possível se o usuário tiver enviado previamente essas alterações para uma fila remota. Para preservar o princípio local-first, a proposta inicial sincroniza automaticamente quando o Alfred está aberto/ativo e manualmente quando solicitado; não envia a agenda local inteira para um servidor.

## Infraestrutura que precisa de aprovação

- Criar um Cloudflare Worker e um armazenamento seguro para refresh tokens (criptografia com chave em secret do Worker).
- Configurar um OAuth Client ID do tipo Web Application no Google Cloud Console.
- Habilitar Google Calendar API e cadastrar a origem do Alfred e o redirect URI do Worker.
- Configurar secrets no Cloudflare fora do GitHub (client secret e chave de criptografia).
- Definir URL pública do backend e política de CORS restrita ao domínio oficial do Alfred.

O Client ID pode ser público no frontend. Client secret, refresh token e chave de criptografia nunca podem ser colocados no repositório.

## Estado desta branch

- [x] Branch isolada criada a partir de `main`.
- [x] Documento de arquitetura e requisitos de segurança.
- [x] Revisão da escolha OAuth: não usar token model browser-only como solução final.
- [ ] Aprovação do backend Cloudflare Worker.
- [ ] Backend OAuth Authorization Code com validação state/CSRF, refresh token criptografado e sessão curta.
- [ ] Interface de conexão e seleção de calendários na Agenda.
- [ ] Metadados de origem Google no modelo local.
- [ ] Sincronização de entrada incremental e reconciliação segura.
- [ ] Fila de saída para criar/editar/excluir eventos Google com confirmação explícita.
- [ ] Conflitos e ETag/If-Match.
- [ ] Testes automatizados, CI e build.
- [ ] Teste real no Safari do iPhone.

A PR permanece Draft. Nenhum merge ou deploy foi feito.
