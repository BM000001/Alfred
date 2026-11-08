# Equipe de Design — Alfred

## Missão
Redesenhar a arquitetura de navegação, abas e experiência visual do Alfred sem quebrar funcionalidades, dados locais ou fluxos existentes. O resultado deve ser autoral, não um dashboard genérico de IA.

## Papéis (agentes lógicos; não são processos autônomos já em execução)
1. **UX Research / Arquitetura da Informação** — inventariar rotas, abas, jornadas e tarefas; mapear problemas e propor navegação responsiva e adaptativa para telefones, tablets e computadores.
2. **Direção de Arte / Marca** — explorar identidades próprias com referências conceituais em Alfred Pennyworth, Donna (Suits), JARVIS e interfaces experimentais, sem copiar ativos protegidos.
3. **UI / Motion / Acessibilidade** — criar componentes, estados, transições leves e acessíveis, incluindo redução de movimento e contraste.
4. **Auditoria / QA** — verificar consistência, desempenho em Android, iOS e navegadores desktop, responsividade, legibilidade e regressões funcionais.

## Experiência adaptativa
- **Cotidiano:** discreta, agenda e tarefas.
- **Trabalho e Estudos:** foco, projetos, materiais e ferramentas.
- **Tático:** urgências, prioridades e ações rápidas.
- Identidade e personalidade coerentes; alternância manual sempre disponível; mudanças automáticas apenas como sugestões inicialmente.

## Entregáveis da equipe
1. Inventário das telas, abas, dependências e jornadas existentes, com problemas observáveis.
2. Três direções conceituais: **Gentleman**, **Intelligence** e **Companion**, com comparação fundamentada.
3. Proposta de arquitetura de navegação para telefones Android/iOS, tablets e computadores, incluindo fluxo de voz, tarefas, calendário, projetos, arquivos e configurações.
4. Protótipos navegáveis ou mockups com estados vazios, erros, carregamento, acessibilidade e interação.
5. Plano incremental de implementação, testes e reversão.

## Regras de execução
- **Não alterar a interface de produção antes da escolha explícita do usuário.**
- Trabalho em branch própria e PR; não realizar merge automático.
- Preservar IndexedDB, backups, privacidade local-first, portão de envio de dados para IA, PWA e comportamento offline.
- Preferir soluções gratuitas e open source; avaliar licenças e custo de manutenção.
- Evitar gradientes, cartões e barras laterais padronizadas sem justificativa de uso.
- Nenhum elemento visual apenas decorativo pode prejudicar a tarefa principal.
- Validar no iPhone real e desktop antes de liberar.
- O usuário escolhe a direção final.

## Primeira tarefa
Auditar as telas e navegação existentes antes de produzir propostas. Registrar o mapa atual, três problemas prioritários e alternativas para cada um. Nenhuma implementação visual deve começar antes da auditoria.

## Escopo multiplataforma aprovado
- Projetar a experiência como um único produto responsivo e adaptativo, sem restringir o design ao iPhone.
- Cobrir celulares Android e iOS, tablets e computadores (mouse, teclado e toque).
- Definir pontos de adaptação pelo espaço disponível e pela tarefa, não por marca ou modelo.
- Validar navegação por toque e teclado, leitores de tela, orientações retrato/paisagem, diferentes tamanhos de tela e desempenho.
- Priorizar consistência de funções entre dispositivos, com apresentações específicas quando fizer sentido.

## Autonomia autorizada pelo usuário (08/11/2026)
- A equipe pode pesquisar referências, auditar a interface, elaborar protótipos e preparar alterações em branches isoladas e PRs em rascunho.
- Não fazer merge de mudanças visuais, substituir a interface principal ou publicar um novo design sem aprovação explícita do usuário.
- Trabalhar de forma incremental, com testes e revisão antes de solicitar decisão.
- Esta autorização define escopo de trabalho; não implica que agentes autônomos estejam ativos ou que tarefas sejam executadas continuamente em segundo plano.
