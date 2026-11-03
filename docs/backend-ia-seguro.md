# Backend seguro de IA — Alfred

## Objetivo

Esta etapa adiciona uma API serverless para autenticação de acesso e chamadas ao Vercel AI Gateway. O navegador nunca recebe a chave do provedor. A API não lê IndexedDB e não envia tarefas, agenda, estudos ou memórias automaticamente.

## Arquitetura de publicação

- **GitHub Pages:** continua publicando a versão estática e local-first. Não executa as rotas `/api/*`.
- **Vercel:** deve hospedar frontend e API no mesmo domínio. O build padrão (`npm run build`) usa a raiz do domínio; `npm run build:pages` mantém o caminho `/Alfred/` para GitHub Pages.
- **Desenvolvimento local:** use `vercel dev` depois de vincular o projeto; `vite dev` sozinho não executa as funções de `api/`.

O projeto Vercel ainda não está conectado nesta etapa. Portanto, a API foi preparada no repositório, mas não está publicada nem utilizável na URL atual do GitHub Pages.

## Rotas

| Rota | Método | Função |
|---|---|---|
| `/api/auth/login` | POST | Valida senha e cria cookie de sessão |
| `/api/auth/session` | GET | Verifica se a sessão ainda é válida |
| `/api/auth/logout` | POST | Encerra a sessão no navegador |
| `/api/chat` | POST | Encaminha mensagens explicitamente aprovadas ao AI Gateway |

## Variáveis de ambiente — somente no servidor

Configure no projeto Vercel, nunca em `VITE_*`, no frontend, no Git ou em mensagens:

- `ALFRED_APP_ORIGIN`: origem exata do domínio Vercel usado pelo Alfred, por exemplo `https://alfred.seudominio.com`.
- `ALFRED_ACCESS_PASSWORD`: senha longa e exclusiva, com pelo menos 16 caracteres.
- `ALFRED_SESSION_SECRET`: segredo aleatório com pelo menos 32 caracteres.
- `ALFRED_AI_ENABLED`: manter `false` até concluir as proteções e a integração da interface; só então configurar `true`.
- `AI_GATEWAY_API_KEY`: chave do AI Gateway. Em deploy Vercel pode ser usada a autenticação OIDC suportada pelo Gateway.
- `AI_GATEWAY_MODEL`: ID completo `provider/model` existente no catálogo atual do Gateway.

Não peça nem cole segredos em issues, PRs ou no chat. Cadastre-os pelo painel de variáveis de ambiente da Vercel e faça novo deploy após configurar.

## Proteções implementadas

- Cookie `HttpOnly; Secure; SameSite=Strict`, escopo `/api`, expiração em quatro horas.
- Assinatura HMAC-SHA256 e comparação de senha em tempo constante.
- Validação estrita de origem e host; sem CORS aberto.
- Endpoint de IA exige sessão válida, método POST, confirmação explícita, categorias declaradas e revisão de conteúdo sensível.
- Limites de tamanho e quantidade de mensagens; saída limitada a 800 tokens; timeout de 30 segundos.
- A API não lê dados do IndexedDB, não oferece ferramentas de escrita e não grava conteúdo de conversa no servidor.
- IA externa permanece desativada por padrão (`ALFRED_AI_ENABLED` diferente de `true`).

## Limitações e bloqueios antes de produção

1. **A interface ainda não chama essas rotas.** O painel conversacional permanece no provider local. Uma próxima etapa precisa adicionar login, estado de sessão e confirmação visível por envio, sem reaproveitar consentimento antigo.
2. **Rate limit de login atual é apenas best-effort em memória.** Instâncias serverless não compartilham esse estado. Antes de expor o login, configurar Vercel Firewall ou um limitador compartilhado.
3. **Limite de custo obrigatório:** configurar budget/alertas no AI Gateway e regras de tráfego no Vercel Firewall antes de ativar a IA.
4. **Sem revogação server-side individual:** sair apaga o cookie no navegador; uma sessão copiada permanece válida até expirar ou até rotacionar `ALFRED_SESSION_SECRET`.
5. **Revisão de sensibilidade é declaração do usuário, não detecção automática.** O servidor valida a confirmação, mas não classifica semanticamente o texto.
6. **Sem auditoria persistente no backend.** A auditoria local existente registra metadados da cópia manual; a próxima integração deverá registrar metadados da chamada, sem guardar conteúdo.
7. **Sem sincronização:** histórico e dados do Alfred continuam no aparelho; a API recebe somente as mensagens incluídas explicitamente na requisição.

## Próximos passos

1. Validar CI e revisar o código desta PR.
2. Vincular o repositório a um projeto Vercel e publicar uma prévia.
3. Configurar domínio/origem, senha, segredo de sessão, chave/modelo Gateway e proteção contra abuso no painel Vercel.
4. Implementar a tela de login e a confirmação por requisição na interface.
5. Testar login, expiração, logout, bloqueios, custo e chamadas de ponta a ponta antes de ativar IA em produção.
