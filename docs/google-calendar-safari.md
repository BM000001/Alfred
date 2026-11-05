# Google Calendar no Safari — implementação em andamento

## Decisões confirmadas

- Fonte: Google Calendar.
- Sincronização: manual e automática enquanto a Agenda estiver ativa.
- Permissões: leitura e escrita, com confirmação antes de enviar alterações ao Google.
- Plataforma prioritária: Safari no iPhone, sem exigir aplicativo iOS nativo.
- IndexedDB permanece como base local do Alfred.
- Nenhum segredo OAuth ou token de atualização será armazenado no navegador ou versionado.

## Arquitetura escolhida

Frontend estático em GitHub Pages + Cloudflare Worker + D1.

- O Worker executa OAuth Authorization Code com PKCE S256.
- O refresh token Google é criptografado com AES-GCM antes de ser gravado no D1.
- O frontend recebe um ticket aleatório de uso único via fragmento da URL, troca-o por uma sessão Bearer assinada de 30 minutos e mantém essa sessão somente em memória.
- Não usamos cookies de terceiros para as chamadas de API, evitando depender do comportamento de ITP no Safari entre github.io e workers.dev.
- O Worker renova access tokens Google sob demanda e não envia refresh tokens ao navegador.
- D1 armazena somente identidade Google e refresh token criptografado; os eventos da agenda permanecem no IndexedDB, exceto quando o usuário confirma uma gravação na fonte Google.

Escopos solicitados: openid/email para identificar a conta, calendar.events para leitura e escrita de eventos e calendar.calendarlist.readonly para listar calendários.

## Limite real da sincronização automática

A sincronização automática será executada por timer/retorno ao primeiro plano enquanto o Alfred estiver aberto. Safari/iOS pode suspender a página em segundo plano ou quando fechada. Uma aplicação web estática não consegue garantir execução contínua nesse estado. Não será enviada uma cópia da agenda local ao backend apenas para simular sincronização em background.

A sessão frontend expira em 30 minutos e não é persistida. Depois de recarregar a página ou expirar a sessão, o usuário precisa reconectar. Essa é uma limitação deliberada para evitar armazenar um bearer de longa duração no dispositivo.

## Implementado nesta branch

- [x] Branch isolada a partir de main.
- [x] Decisão de usar Cloudflare Workers, sem Vercel.
- [x] Worker com fluxo OAuth, PKCE, estado anti-CSRF, ticket de uso único e sessão curta.
- [x] Criptografia AES-GCM do refresh token no D1.
- [x] Proxy autenticado para listar calendários/eventos e criar, atualizar e excluir eventos.
- [x] CORS restrito à origem do Alfred.
- [x] Client TypeScript inicial para o frontend.
- [x] Migração D1 e configuração Wrangler.
- [x] CI ampliado para verificar tipos do Worker.
- [x] CI do commit atual aprovado (testes, type-check do Worker e build).
- [x] Interface de conexão, seleção de calendários e estado de sincronização na Agenda.
- [x] Metadados de origem Google, calendário, evento, conta e ETag no modelo local.
- [x] Sincronização incremental com cursor IndexedDB, paginação, recorrências e recuperação de HTTP 410.
- [x] Escrita manual confirmada para criar, atualizar e excluir eventos Google.
- [x] Atualizações e exclusões condicionais com ETag/If-Match; conflitos não sobrescrevem silenciosamente.
- [x] Testes do serviço de agenda e persistência local do cursor; type-check do Worker no CI.
- [ ] Testes de integração ponta a ponta e revisão de segurança independente.
- [ ] Configurar projeto Google Cloud, D1, secrets e publicar Worker.
- [ ] Configurar variável GitHub Actions VITE_GOOGLE_CALENDAR_API.
- [ ] Validar o fluxo completo no Safari físico.

## Configuração/deploy

As instruções detalhadas estão em [cloudflare/google-calendar-worker/README.md](../cloudflare/google-calendar-worker/README.md).

Nenhum secret foi criado, nenhum Worker foi publicado, nenhum deploy Pages foi executado e nenhum merge foi feito. A PR permanece Draft.
