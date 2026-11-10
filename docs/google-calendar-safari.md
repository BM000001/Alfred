# Google Calendar no Alfred — integração via Google Apps Script

## Decisões confirmadas

- Fonte: Google Calendar.
- Sincronização: manual e automática enquanto a Agenda do Alfred estiver aberta e visível.
- Permissões: leitura e escrita; toda criação, atualização ou exclusão remota exige confirmação explícita no Alfred.
- Plataforma prioritária: Safari no iPhone, sem exigir aplicativo iOS nativo.
- IndexedDB continua sendo a fonte local de verdade dos compromissos e dos cursores incrementais.
- Nenhum access token, refresh token, client secret ou credencial Google será salvo no Alfred, IndexedDB, localStorage, sessionStorage, backup ou repositório.
- Não usar Cloudflare, D1 ou Vercel nesta integração.

## Arquitetura proposta

**GitHub Pages (Alfred) + Google Apps Script Web App, executado como o usuário que acessa.**

O projeto Apps Script deve ser criado pelo próprio usuário na mesma Conta Google cuja agenda será conectada. A implantação deve usar **Execute as: User accessing the web app** e **Who has access: Only myself**. Assim, a ponte é privada para a conta proprietária e o token de execução corresponde ao usuário que acessa.

O Alfred abre o Apps Script por uma ação explícita do usuário. A janela/aba do Apps Script permanece aberta e funciona como ponte RPC:
- A página Alfred abre a URL HTTPS /exec do Apps Script com um nonce aleatório de uso único.
- O Apps Script estabelece um canal postMessage validando origem, janela de origem e nonce.
- O navegador envia somente operações permitidas; o Apps Script executa-as com google.script.run.
- O token OAuth é obtido no servidor com ScriptApp.getOAuthToken(), usado apenas em memória durante a execução e nunca devolvido ao Alfred.
- O Apps Script chama a Google Calendar REST API via UrlFetchApp; não mantém cópia persistente de eventos ou tokens.
- A conexão da interface depende da janela/aba Apps Script aberta. Fechar a janela ou recarregar o Alfred encerra a sessão local e exige reconexão.

### Por que não usar iframe ou fetch direto

O Content Service do Apps Script não oferece uma configuração geral de cabeçalhos CORS para a aplicação cliente. Além disso, houve relatos recentes de web apps Apps Script bloqueados em iframes mesmo com XFrameOptionsMode.ALLOWALL. Por isso, o desenho inicial usa uma janela/aba aberta por gesto do usuário, não iframe nem fetch cross-origin. A compatibilidade de window.opener dentro do sandbox HTML Service e postMessage no Safari iOS ainda é um critério obrigatório de prova de conceito. Se o sandbox não expuser o opener da janela de topo, a ponte falha fechada e esta arquitetura não poderá ser liberada. Não será considerada garantida antes do teste físico.

### Segurança do canal

- Origem Alfred permitida no Apps Script: https://bm000001.github.io.
- O Alfred valida que a mensagem veio da janela aberta por ele e de uma origem HTTPS do domínio Google Apps Script/Googleusercontent.
- O Apps Script valida event.origin, a referência ao opener da janela de topo e o nonce; o Alfred valida que a mensagem veio de um frame pertencente à janela aberta por ele.
- O servidor aceita somente métodos RPC em allowlist e valida identificadores, parâmetros e tamanho dos eventos.
- Nenhum token ou segredo é transportado por postMessage.
- O Apps Script executa como a conta Google que autorizou o web app; nunca como o proprietário do script.
- Nenhum conteúdo de evento é gravado em PropertiesService, CacheService, planilha, logs ou outro armazenamento.
- A desconexão fecha a ponte local. A revogação do consentimento Google deve ser feita nas configurações da Conta Google; a interface não alegará revogação remota confirmada.

## Escopos mínimos

Manifesto explícito:
- calendar.events: ler e gravar eventos.
- calendar.calendarlist.readonly: listar calendários.
- userinfo.email e openid: identificar a conta para isolar os compromissos/cursors locais.
- script.external_request: chamadas HTTPS do Apps Script para as APIs Google.
- Google Calendar API v3 declarada como serviço avançado no manifesto para garantir sua ativação no projeto Apps Script; as operações continuam usando REST via UrlFetchApp.

O token é criado e usado apenas no servidor Apps Script. A conta do usuário verá o nome do projeto/script na tela de consentimento. O Google pode exibir aviso de app não verificado ou aplicar limites de autorização; isso deve ser avaliado durante a configuração e não pode ser contornado pelo Alfred.

## Dados e sincronização

- IndexedDB permanece como base local dos compromissos.
- O cursor incremental syncToken fica no IndexedDB, separado por conta + calendário.
- Paginação, recorrências, cancelamentos e recuperação de cursor expirado (HTTP 410) permanecem no cliente.
- A janela inicial continua de 90 dias no passado e 365 dias no futuro.
- O Apps Script encaminha temporariamente os dados da requisição/resposta entre o Alfred e o Google, mas não os persiste.
- Atualizações e exclusões usam ETag/If-Match. Um conflito não deve sobrescrever silenciosamente uma alteração feita fora do Alfred.
- A sincronização automática roda a cada 5 minutos enquanto a página estiver visível; Safari pode suspender timers em segundo plano ou quando a aba estiver fechada.
- Nenhuma sincronização em background é prometida.

## Limitações e critérios de aceitação

1. **Safari iPhone:** abrir Apps Script a partir de gesto do usuário deve preservar comunicação com a janela/aba de origem. Se o Safari abrir nova aba sem window.opener, a arquitetura precisa ser revista antes de liberar a integração.
2. **Suspensão de aba:** o Safari pode suspender a aba/janela Apps Script enquanto Alfred está em primeiro plano. A ponte precisa continuar respondendo às chamadas RPC depois da troca de abas; se não continuar, a arquitetura não atende ao requisito de uso móvel.
3. **Autorização:** implantação como usuário que acessa e acesso restrito a Only myself, com consentimento dos escopos mínimos. O Alfred deve falhar fechado se a autorização não estiver concedida.
4. **Privacidade:** inspecionar logs e armazenamento do Apps Script para confirmar que não há payloads, tokens ou identificadores sensíveis persistidos.
5. **Leitura:** listar todos os calendários e páginas de eventos; manter cursor incremental no IndexedDB.
6. **Escrita:** criar, atualizar e excluir somente após confirmação individual no Alfred.
7. **Conflito:** HTTP 412 do Google é apresentado como conflito recuperável; não repetir escrita automaticamente.
8. **Desconexão:** fechar a janela de ponte, limpar estado em memória e preservar todos os compromissos locais. Explicar como revogar o script na Conta Google.
9. **Falhas:** timeouts e erros de autorização devem ser exibidos sem apagar compromissos ou cursores locais.
10. **Quotas:** respeitar quotas de execução/UrlFetch do Apps Script; falhas de quota não podem causar perda ou reconciliação parcial destrutiva.

## Implementação nesta branch

- [x] Integração de calendário local, identidade externa e cursores incrementais em IndexedDB.
- [x] Interface de seleção de calendários e sincronização manual/automática.
- [x] Confirmação individual antes de criar, atualizar e excluir eventos no Google.
- [x] Primeira implementação do Apps Script RPC bridge, com execução como usuário que acessa.
- [x] Cliente TypeScript substituindo as chamadas HTTP ao Worker por RPC via janela Apps Script.
- [x] Revisão estática inicial de segurança do dispatcher e do protocolo de mensagens.
- [x] Teste automatizado do handshake sandbox/opener, RPC, origem, janela de origem e nonce.
- [x] Testes simulados do dispatcher Apps Script: identidade, token apenas no servidor, allowlist RPC, paginação, payloads, PATCH/DELETE, ETag e conflito 412.
- [ ] Testes de integração do Apps Script real e dos contratos completos de payload.
- [ ] Teste de autorização e execução no Apps Script real, incluindo confirmação de que Calendar API v3 está ativa.
- [ ] Teste físico em Safari iPhone (popup, opener, retorno à aba Alfred, fechamento e reconexão).
- [ ] Validar quotas, paginação e ETag/If-Match com eventos reais.
- [ ] Configurar a variável GitHub Actions VITE_GOOGLE_APPS_SCRIPT_URL com a URL de implantação /exec.
- [ ] Publicar GitHub Pages somente depois de merge autorizado.

## Estado operacional

Nenhuma implantação Apps Script foi criada ou publicada nesta etapa. Nenhuma conta foi conectada. Nenhum teste real no Safari foi executado. O PR permanece Draft, aberto e sem merge. A integração ainda não está pronta para uso real.
