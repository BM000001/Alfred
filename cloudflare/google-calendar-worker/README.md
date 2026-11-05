# Alfred Google Calendar Worker

Backend mínimo para OAuth Google e proxy da Calendar API. O Worker não recebe nem armazena os compromissos locais por padrão. Ele guarda somente a identidade Google e o refresh token criptografado necessário para renovar a autorização.

## Por que este backend existe

O GitHub Pages é estático e não pode proteger um client secret. O Worker executa o OAuth Authorization Code com PKCE, recebe o callback diretamente do Google e mantém o refresh token no D1 criptografado com AES-GCM. O frontend recebe apenas um ticket de uso único no fragmento da URL e o troca por uma sessão assinada de 30 minutos mantida em memória.

O fragmento não é enviado em requisições HTTP e o frontend o remove do endereço assim que começa a troca. A sessão não é persistida no IndexedDB, localStorage ou sessionStorage. Ao recarregar a página ou expirar a sessão, o usuário precisa reconectar.

O uso de Authorization: Bearer evita depender de cookies de terceiros entre github.io e workers.dev, uma restrição relevante no Safari/iOS.

## Requisitos de configuração

1. Criar projeto no Google Cloud Console e habilitar Google Calendar API.
2. Configurar a tela de consentimento OAuth e criar credencial OAuth do tipo Web Application.
3. Cadastrar o redirect URI exato do Worker: https://SEU-WORKER.workers.dev/auth/google/callback.
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
- PUT /api/events/:eventId?calendarId=...
- DELETE /api/events/:eventId?calendarId=...
- POST /api/disconnect

As rotas de API exigem sessão Bearer assinada e CORS limitado à origem oficial do Alfred. O Worker renova o access token Google sob demanda; não o devolve ao frontend. O endpoint de desconexão revoga o refresh token e apaga a conexão.

## Limites e segurança

- O Worker não sincroniza a agenda local sozinho e não recebe uma cópia integral dos eventos.
- A sincronização automática deve rodar no frontend enquanto a página estiver ativa. Safari/iOS pode suspender a página em segundo plano.
- Sessões frontend são temporárias e em memória; recarregar exige nova conexão.
- O token de atualização Google é criptografado em D1; a chave AES fica em secret do Worker.
- O ticket OAuth é aleatório, de uso único, armazenado somente como hash e expira em 2 minutos.
- O estado OAuth é validado com cookie Secure/HttpOnly/SameSite=Lax, e PKCE S256.
- Não há telemetria de conteúdo dos eventos nem logging de tokens.
- Antes de liberar escrita na interface, cada operação deve passar por prévia e confirmação do usuário.

## Ainda pendente

- Integrar o client src/modules/agenda/googleCalendarApi.ts à interface da Agenda.
- Implementar origem/provedor Google nos metadados locais sem confundir IDs Apple, ICS e Google.
- Implementar sincronização incremental com cursor por calendário e recuperação de HTTP 410.
- Implementar fila local de saída, reconciliação e tratamento de conflitos/ETag.
- Adicionar testes de integração do Worker e do cliente web.
- Configurar credenciais, D1, domínio/URL e publicar o Worker em conta Cloudflare.
- Validar fluxo OAuth e sincronização no Safari físico.
