# Auditoria inicial de navegação — leitura estática do código

Data: 2026-11-08. Fonte: `src/app/App.tsx` na branch `main`. Esta é uma auditoria de código, **não** um teste de usabilidade executado em dispositivos.

## Inventário confirmado
9 seções: Início, Alfred, Tarefas, Projetos, Agenda, Estudos, Arquivos, Produtividade e Configurações.
Desktop: navegação lateral em grupos PRINCIPAL, ORGANIZAÇÃO, CONHECIMENTO; Produtividade e Configurações ao final.
Celular: barra inferior com Início, Alfred, Tarefas, Agenda e Mais. O menu Mais abriga Projetos, Estudos, Arquivos, Produtividade e Configurações.
As seções são selecionadas por estado React `activeSection`; o componente principal alterna módulos sem rotas de URL por seção.

## Hipóteses de problemas a validar
1. **Descoberta de áreas:** 5 das 9 seções ficam em Mais no celular, inclusive Estudos e Projetos. Verificar frequência real de acesso antes de reordenar.
2. **Contexto e histórico:** seleção por estado local não evidencia URL específica para abrir uma seção diretamente ou usar histórico do navegador; verificar comportamento e necessidade de deep links.
3. **Mudança de modo:** Cotidiano/Trabalho e Estudos/Tático ainda não aparecem como modos na navegação do `App.tsx`; desenhar modelo sem adicionar complexidade excessiva.

## Próxima rodada
- Mapear fluxos de tarefas, agenda, estudos, projetos, arquivos e assistente.
- Prototipar 3 alternativas: navegação contextual por atividade; navegação por áreas; navegação centrada no assistente.
- Testar tarefas típicas em Android, iOS, tablet e desktop; medir número de ações, descoberta e retorno à seção anterior.
- Registrar escolha do usuário antes de qualquer implementação visual na main.

## Limites
Não foram executados testes de navegador, acessibilidade ou desempenho. Não modificar a produção nesta etapa.
