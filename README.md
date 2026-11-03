# Alfred

Assistente pessoal de produtividade e estudos, com foco em **privacidade** e **funcionamento local**.

> Status: **Etapa 1** (base técnica do MVP). Ainda não é uma versão de uso diário.

## O que o Alfred faz nesta etapa

- Tarefas, disciplinas e notas, armazenadas **no próprio aparelho** (IndexedDB).
- Exportação e importação de backup (arquivo JSON, opcionalmente criptografado com senha).
- Adaptador **Manual** para IA: o Alfred gera um texto que você copia para o serviço de IA de sua escolha e, depois, cola a resposta de volta como nota.
- Interface responsiva, instalável como PWA, para computador e iPhone, servida por HTTPS.

## O que o Alfred não faz (ainda)

- A API serverless de autenticação e chat está em preparação, mas ainda não foi publicada nem conectada à interface. A URL do GitHub Pages continua sendo apenas a versão estática.

- Não envia dados a nenhum serviço de IA automaticamente.
- Não integra com o Canvas LMS (planejado, aguardando verificação das políticas institucionais).
- Não sincroniza entre dispositivos (planejado para etapa futura, com a estrutura de dados já preparada).
- Não usa modelo local nem voz.
- Não exige nenhuma assinatura ou API paga.

## Princípios

1. **Dados pessoais ficam no aparelho.** Nenhum dado do usuário passa pela hospedagem do site, que entrega apenas arquivos públicos.
2. **Nada sai sem ação explícita.** Qualquer envio a serviço externo exige confirmação do usuário, categoria por categoria, e é registrado (sem o conteúdo).
3. **Sem dependência obrigatória de serviço pago.**
4. **Arquitetura independente de provedor de IA.** O núcleo não importa SDK de nenhum serviço.

## Desenvolvimento

Requisitos: Node.js 20 ou superior.

```
npm install
npm test       # compila e executa os testes automatizados
npm run build  # gera o site estático em site/
```

Para testar localmente, sirva a pasta `site/` por qualquer servidor estático. Para instalar no iPhone, é preciso HTTPS (ver `docs/testes-manuais-iphone.md`).

## Documentação

- `docs/decisoes.md`: decisões registradas e seus motivos.
- `docs/arquitetura.md`: camadas, formato de backup e regras de privacidade.
- `docs/status-etapa-1.md`: o que foi feito, testes executados e limitações conhecidas.
- `docs/backend-ia-seguro.md`: arquitetura, configuração e bloqueios antes de ativar o backend de IA.
- `docs/testes-manuais-iphone.md`: roteiro de testes que exigem dispositivo real.
- `NOTICE.md` e `THIRD_PARTY.md`: atribuições e licenças de dependências.

## Licença

**Pendente de decisão.** Veja `docs/decisoes.md`.
