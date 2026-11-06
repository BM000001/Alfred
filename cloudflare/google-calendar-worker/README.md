# Alfred Google Calendar Worker

Backend mínimo para OAuth Google e proxy da Calendar API. O Worker trafega e processa temporariamente os payloads de eventos para encaminhar as chamadas entre Alfred e Google, mas não grava títulos, horários, descrições, locais ou listas de eventos no D1. O armazenamento persistente contém somente a identidade Google e o refresh token criptografado necessário para renovar a autorização.

## Por que este backend existe

O GitHub Pages é estático e não pode proteger um client secret. O Worker executa o OAuth Authorization Code com PKCE, recebe o callback diretamente do Google e mantém o refresh token no D1 criptografado com AES-GCM. O frontend recebe apenas um ticket de uso único no fragmento da URL e o troca por uma sessão assinada de 30 minutos mantida em memória.

O fragmento não é enviado em requisições HTTP e o frontend o remove do endereço assim que começa a troca. A sessão não é persistida no IndexedDB, localStorage ou sessionStorage. Ao recarregar a página ou expirar a sessão, o usuário precisa reconectar.

O uso de Authorization: Bearer evita depender de cookies de terceiros entre github.io e workers.dev, uma restrição relevante no Safari/iOS.

## Requisitos de configuração

1. Criar projeto no Google Cloud Console e habilitar Google Calendar API.
2. Configurar a tela de consentimento OAuth e criar credencial OAuth do tipo Web Application.
3. Cadastrar o redirect URI exato do Worker: https://SEU-WORKER.workers.dev/auth/google/callback.

**Atenção ao status do consentimento OAuth:** se o tipo de usuário for External e o app permanecer em Testing, o Google emite refresh tokens que expiram em 7 dias quando o app solicita escopos do Calendar. Para uso contínuo, será necessário publicar o app em Production no Google Auth Platform; dependendo da classificação e do público dos escopos, o Google poderá exigir verificação. A política de produção do Google exige domínios sob seu controle e verificáveis: `workers.dev` e `github.io` são domínios compartilhados, portanto a implantação de produção provavelmente precisará de um domínio próprio configurado no Worker e, se exigido para a página inicial/política de privacidade, também no GitHub Pages. Enquanto estiver em Testing, considere a reconexão semanal como limitação conhecida — não trate isso como falha do Alfred.

4. Criar um D1 chamado alfred-google-calendar e copiar seu database ID para wrangler.toml.
5. Definir GOOGLE_REDIRECT_URI para o callback real e ALFRED_RETURN_URL para https://bm000001.github.io/Alfred/.
6. Definir GOOGLE_CLIENT_ID como variável do Worker.
7. Criar os seguintes secrets no Worker:
   - GOOGLE_CLIENT_SECRET: segredo OAuth do tipo Web Application.
   - TOKEN_ENCRYPTION_KEY: 32 bytes aleatórios codificados em base64url.
   - SESSION_SIGNING_KEY: segredo aleatório com pelo menos 32 bytes.
8. Configurar ALFRED_ORIGIN=https://bm000001.github.io (origem, sem /Alfred/) e ALFRED_RETURN_URL (URL completa com o caminho /Alfred/).
9. Publicar o Worker e definir a variável de repositório GitHub Actions VITE_GOOGLE_CALENDAR_API com a URL base do Worker, sem barra final.

Não usar vars para client secret, chave de criptografia ou chave de assinatura. Usar secrets do Cloudflare. Não colocar nenhum desses valores em arquivos do repositório.

## Comandos de implantação (executar na pasta do Worker)

```bash
npm install
npx wrangler login
npx wrangler d1 create alfred-google-calendar
# Copie o database_id retornado para wrangler.toml.
npx wrangler d1 migrations apply alfred-google-calendar --remote
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler secret put SESSION_SIGNING_KEY
npx wrangler deploy
```

Configure GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, ALFRED_ORIGIN e ALFRED_RETURN_URL no wrangler.toml/Cloudflare Dashboard. Depois de publicar, cadastre a URL do Worker em GitHub Actions → Variables como VITE_GOOGLE_CALENDAR_API e execute o workflow de deploy do Pages após o merge autorizado.

## Rotas implementadas

- GET /health
- GET /auth/google/start
- GET /auth/google/callback
- POST /auth/exchange
- GET /api/session
- GET /api/calendars
- GET /api/events?calendarId=...
- POST /api/events?calendarId=...
- PATCH /api/events/:eventId?calendarId=...
- DELETE /api/events/:eventId?calendarId=...
- POST /api/disconnect

As rotas de API exigem sessão Bearer assinada e CORS limitado à origem oficial do Alfred. A listagem de calendários e eventos usa paginação até consumir todos os resultados. O Worker renova o access token Google sob demanda; não o devolve ao frontend. No callback OAuth, confirma via Google tokeninfo que os escopos de calendário necessários foram realmente concedidos antes de salvar a conexão. Se a verificação falhar ou faltar algum escopo, rejeita a conexão e tenta revogar a autorização recém-obtida. Na desconexão, apaga primeiro a conexão local e tenta revogar o token no Google; a resposta informa se a revogação remota foi confirmada.

## Limites e segurança

- O Worker não sincroniza a agenda local sozinho nem persiste uma cópia dos eventos. Como proxy, ele vê os payloads de eventos em trânsito durante as chamadas; esses conteúdos não são gravados no D1. A interface da Agenda importa alterações incrementalmente e oferece ações confirmadas para enviar, atualizar ou excluir eventos individuais.
- A sincronização automática deve rodar no frontend enquanto a página estiver ativa. Safari/iOS pode suspender a página em segundo plano.
- Sessões frontend são temporárias e em memória; recarregar exige nova conexão.
- O token de atualização Google é criptografado em D1; a chave AES fica em secret do Worker.
- Se o Google responder `invalid_grant` ao renovar o token, o Worker remove a conexão inválida do D1 e responde HTTP 401 para a interface encerrar a sessão e solicitar nova conexão. Falhas transitórias no endpoint de tokens são tratadas como HTTP 502, sem apagar a conexão.
- A desconexão local não depende da disponibilidade do endpoint de revogação Google: o refresh token é removido do D1 mesmo se a revogação remota falhar. Nessa situação, a interface orienta o usuário a revogar manualmente o acesso nas configurações da Conta Google.
- O ticket OAuth é aleatório, de uso único, armazenado somente como hash e expira em 2 minutos.
- O estado OAuth é validado com cookie Secure/HttpOnly/SameSite=Lax, e PKCE S256.
- Não há telemetria de conteúdo dos eventos nem logging de tokens; ainda assim, o Worker processa os dados dos eventos em memória como intermediário de rede.
- Antes de liberar escrita na interface, cada operação deve passar por prévia e confirmação do usuário.

## Estado da implementação

Concluído no código desta branch:

- Cliente Google integrado ao painel da Agenda.
- Metadados de origem e identidade externa Google separados das origens Apple/ICS.
- Sincronização incremental por calendário, paginação, recorrências, cancelamentos e recuperação de cursor expirado (HTTP 410).
- Reconciliação local e operações de criação, atualização e exclusão com confirmação e ETag/If-Match.
- Testes automatizados, type-check do Worker e build da aplicação executados no CI.

Pendente para disponibilização real:

- Criar e configurar o D1, as variáveis e os secrets na conta Cloudflare.
- Criar o cliente OAuth Web no Google Cloud Console e cadastrar o callback exato do Worker.
- Publicar o Worker e configurar `VITE_GOOGLE_CALENDAR_API` nas variáveis do GitHub Actions.
- Fazer merge somente após autorização do proprietário e publicar o GitHub Pages.
- Validar OAuth, leitura, escrita, reconciliação e retomada de sessão no Safari físico.

## Observações de identidade

O estado de sincronização e a identidade local dos eventos são isolados por conta Google, calendário e evento. Assim, duas contas Google que possuam calendários com IDs coincidentes não compartilham cursores nem registros locais.
