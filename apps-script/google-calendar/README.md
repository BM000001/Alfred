# Alfred — Google Calendar via Apps Script

Este projeto substitui o Cloudflare Worker/D1 por um Google Apps Script Web App. Ele é um backend de execução por usuário: cada pessoa autoriza o próprio script a acessar a própria agenda.

## Regra de implantação obrigatória

**Execute as: User accessing the web app.**

Nunca escolha "Me" / proprietário. Se o Web App executar como o proprietário, as chamadas Calendar API usarão a agenda do proprietário e poderão expor dados de outra pessoa.

## Arquivos

- Code.gs: dispatcher RPC e chamadas REST ao Google Calendar.
- Index.html: janela de ponte entre Alfred e google.script.run.
- appsscript.json: runtime V8, escopos OAuth explícitos e configuração do Web App.

## Configuração pelo proprietário do Alfred

1. Abra https://script.google.com/ e crie um projeto independente chamado **Alfred Google Calendar**.
2. No editor, ative **Project Settings → Show "appsscript.json" manifest file in editor**.
3. Substitua o conteúdo de Code.gs pelo arquivo deste diretório.
4. Crie um arquivo HTML chamado Index (sem extensão) e cole o conteúdo de Index.html.
5. Substitua o manifesto pelo appsscript.json deste diretório.
6. Salve o projeto.
7. Em **Deploy → New deployment → Web app**, configure:
   - Execute as: **User accessing the web app**.
   - Who has access: **Anyone** (usuários precisam entrar com uma Conta Google e autorizar o acesso).
8. Implante e copie a URL HTTPS terminada em /exec.
9. No repositório GitHub, abra **Settings → Secrets and variables → Actions → Variables** e crie VITE_GOOGLE_APPS_SCRIPT_URL com essa URL. Não coloque a URL em um secret nem em arquivo versionado.
10. Atualize/reexecute o workflow de Pages somente depois da autorização de merge e do planejamento de publicação.

O projeto pede apenas os escopos definidos no manifesto. Na primeira conexão, o Google exibirá a tela de consentimento. Se o Google mostrar um aviso de app não verificado, não ignore automaticamente: confirme que o script/proprietário e os escopos exibidos são os esperados. Não adicione usuários externos nem publique o script para terceiros sem revisar a verificação OAuth e as políticas aplicáveis.

## Como a ponte funciona

O Alfred abre a URL /exec?nonce=... em uma janela/aba por uma ação direta do usuário. O Apps Script responde a operações permitidas via google.script.run. O canal usa origem Alfred fixa, referência à janela e nonce aleatório. O token OAuth fica no servidor Apps Script e é usado para chamar a Google Calendar REST API via UrlFetchApp; nunca é enviado ao navegador.

A janela/aba do Apps Script precisa continuar aberta durante a conexão. Fechar a janela, perder o vínculo window.opener ou recarregar Alfred exige reconectar. A interface local não armazena bearer ou refresh token.

## Privacidade e limites

- O Apps Script deve executar como o usuário que acessa.
- Nenhum token, evento ou payload é persistido pelo script em propriedades, cache, planilhas ou logs.
- Os dados dos eventos transitam temporariamente pelo Apps Script durante a chamada à Google API.
- O IndexedDB do Alfred continua sendo a fonte local dos compromissos e cursores.
- Escritas remotas exigem confirmação individual no Alfred.
- ETag/If-Match protege contra sobrescrita concorrente; conflitos devem ser resolvidos pelo usuário.
- A desconexão fecha a ponte e limpa o estado em memória, mas não confirma revogação OAuth. Para revogar completamente, abra a Conta Google → Segurança → Suas conexões com apps e serviços de terceiros e remova o acesso do script.
- Safari pode suspender sincronização automática em segundo plano. O Apps Script também tem quotas e limites de execução/UrlFetch.

## Bloqueio conhecido — Safari

A comunicação depende de window.open, window.top.opener e postMessage. No iPhone, o Safari pode abrir uma nova aba, suspender a aba Apps Script em segundo plano ou alterar o comportamento de abertura. Se o opener não estiver disponível ou a ponte deixar de responder quando Alfred volta ao primeiro plano, o Alfred falha fechado e não envia dados. **Não considerar a integração pronta até validar abertura, troca de abas, retorno, suspensão e reconexão em Safari físico.**

O projeto não usa iframe, pois há relatos recentes de Apps Script Web Apps bloqueados em iframes mesmo com XFrameOptionsMode.ALLOWALL.

## Desenvolvimento e validação

O CI verifica o TypeScript da aplicação, os testes existentes, o build e a sintaxe básica do arquivo Code.gs. Isso não substitui implantação/teste no ambiente Apps Script nem validação no Safari real.
