# Instruções de desenvolvimento — Alfred

## Missão
Desenvolver o Alfred, um assistente pessoal inteligente, elegante e proativo, que centraliza estudos, agenda, tarefas, projetos, arquivos e produtividade.

## Antes de começar qualquer sessão
1. Leia este arquivo.
2. Leia `README.md`.
3. Leia `CONTINUIDADE.md`.
4. Consulte os documentos relevantes em `docs/`.
5. Verifique o estado do Git e o que já existe antes de alterar arquivos.

## Princípios obrigatórios
- Preserve a visão do produto e as decisões documentadas.
- Prefira soluções simples, modulares, testáveis e acessíveis.
- Explique decisões técnicas relevantes em linguagem clara.
- Não invente funcionalidades como se já estivessem implementadas.
- Não apague nem substitua trabalho existente sem necessidade e autorização.
- Não exponha dados pessoais em logs, exemplos, commits ou documentação.
- Não envie dados pessoais para serviços externos sem consentimento explícito.
- Não adicione dependências sem justificar sua necessidade.
- Não use segredos, tokens ou chaves de API no código ou no Git.
- Mantenha a interface responsiva, com prioridade para dispositivos móveis.

## Autonomia e segurança
O Alfred pode analisar, recomendar e preparar ações. Não pode criar, editar, excluir, concluir ou adiar tarefas e compromissos do usuário sem aprovação explícita.
Antes de uma ação externa ou irreversível, apresente o que será feito e peça confirmação.
Nunca simule que uma integração ou ação foi concluída.

## Desenvolvimento
- Use TypeScript com tipagem explícita sempre que possível.
- Mantenha componentes de interface separados das regras de negócio e do armazenamento.
- Centralize acesso a dados em serviços/repositórios próprios.
- Prefira armazenamento local-first.
- Trate estados de carregamento, vazio e erro.
- Considere acessibilidade: semântica, foco, contraste e áreas de toque.
- Escreva testes para regras de negócio e comportamentos importantes.
- Não considere uma tarefa concluída sem executar os testes e verificações aplicáveis.

## Fluxo de trabalho
1. Escolha uma tarefa pequena e verificável.
2. Inspecione os arquivos envolvidos.
3. Implemente apenas o escopo necessário.
4. Execute testes, lint e build disponíveis.
5. Revise o diff e preserve alterações não relacionadas.
6. Atualize `CONTINUIDADE.md` com o que mudou, testes e próximo passo.
7. Faça commit com mensagem objetiva quando autorizado e quando o ambiente permitir.

## Comunicação de progresso
Ao finalizar, informe:
- O que foi implementado.
- Quais arquivos foram alterados.
- Testes executados e resultados reais.
- Limitações ou pendências.
- Próxima tarefa recomendada.

Se não conseguir executar um teste, declare isso claramente.