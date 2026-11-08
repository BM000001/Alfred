# Plano de execução autônoma controlada — Alfred

Estado: proposta técnica; **não representa agentes de IA já executando**.

## Resultado esperado
Durante a noite, três frentes trabalham em tarefas aprovadas, deixam artefatos e evidências no GitHub, e não alteram `main` sem revisão.

## Restrições
- Custo inicial zero; não presumir acesso gratuito a inferência de modelos ou execução ilimitada de Actions.
- Sem credenciais em issues, logs, comentários ou prompts.
- Sem execução de comandos extraídos de issues ou conteúdo externo.
- Sem acesso a dados pessoais do Alfred; testes com dados sintéticos.
- Permissões mínimas por job, timeout e limite de concorrência.
- Branches por tarefa, PRs em rascunho, nenhuma publicação automática.
- Cada tarefa deve ter escopo, critérios de aceite, teto de tempo e caminho de reversão.

## Etapas
1. **E0 — observação:** manter radar estático existente e confirmar uma execução bem-sucedida do Actions e comentários nas issues #109/#110.
2. **E1 — trabalho noturno determinístico:** tarefas repetíveis sem modelo (inventário, testes, compatibilidade e relatórios). Execução noturna com limites, logs e resumo.
3. **E2 — agentes de IA com provedor autorizado:** adaptar runner a um provedor gratuito efetivamente disponível, sem exigir assinatura. Credenciais em GitHub Secrets; quotas verificadas; jamais assumir que custo zero é garantido.
4. **E3 — execução por equipes:** Desenvolvimento propõe patches e PRs; Design produz especificações e protótipos; Pesquisa produz avaliações comparativas. Uma tarefa por execução, revisão cruzada, sem merge automático.

## Critérios de ativação
- E0 validado em execução real.
- Job sem acesso a segredos além dos estritamente necessários.
- Geração de evidências reproduzíveis e tratamento de falhas.
- Limites de gasto, requisições, tempo e número de tarefas.
- Aprovação explícita antes de habilitar qualquer provedor externo que processe dados.

## O que não fazer
Não chamar um cron de “agente inteligente”. Não usar um runner de terceiros com permissão irrestrita de escrita. Não liberar merge automático nem instalar bibliotecas não auditadas.

## Próxima entrega
Protótipo E1 de rotina noturna segura, com relatório e testes, em PR separado; validar manualmente antes de habilitar agendamento.
