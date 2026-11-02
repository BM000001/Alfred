# Roteiro de testes manuais no iPhone

Estes testes exigem dispositivo real e não são executados por testes automatizados. Registre o resultado de cada item na tabela ao final.

**Pré-requisitos:** iPhone com iOS atualizado; Safari; o endereço HTTPS publicado do Alfred (ver pendência P6); um backup de teste (exportado no computador ou no próprio iPhone).

## T1. Acesso por HTTPS

1. Abra o endereço do Alfred no Safari.
2. Esperado: a página carrega sem alerta de certificado, com a tela de tarefas.

## T2. Instalação na tela de início

1. Toque em Compartilhar → Adicionar à Tela de Início.
2. Esperado: o ícone "A" aparece na tela de início, com fundo azul e sem borda transparente.
3. Abra o app pelo ícone.
4. Esperado: abre em tela cheia, sem barra do Safari, e o título é "Alfred".

## T3. Layout e responsividade

1. Em modo retrato, percorra as abas Tarefas, Disciplinas, Notas, IA manual e Backup.
2. Esperado: abas rolam horizontalmente sem cortar o conteúdo; formulários ocupam a largura da tela; nenhum campo fica escondido sob o entalhe ou a barra inferior.
3. Gire para paisagem e repita.
4. Esperado: o conteúdo se reorganiza sem rolagem horizontal da página.

## T4. Funcionamento offline

1. Com o app já aberto uma vez com conexão, ative o modo avião.
2. Feche o app completamente (deslize para cima no alternador de apps) e reabra pelo ícone.
3. Esperado: o app abre e as tarefas criadas anteriormente aparecem. Aparece o aviso "Sem conexão".

## T5. Persistência após fechar o app

1. Crie uma tarefa "Teste persistência", uma disciplina e uma nota.
2. Feche o app, aguarde 5 minutos e reabra.
3. Esperado: os três registros permanecem.
4. Repita após 2 dias sem abrir o app (registre a data).
5. Esperado: os registros permanecem. **Se apagados, anote: é o caso de risco descrito em docs/status-etapa-1.md, seção "Limitações".**

## T6. Exportação de backup

1. Na aba Backup, toque em Exportar backup, sem senha.
2. Esperado: o iOS mostra a folha de compartilhamento ou abre o arquivo `alfred-backup-AAAA-MM-DD.json`.
3. Salve o arquivo em Arquivos.

## T7. Exportação cifrada

1. Digite uma senha com 8 ou mais caracteres e exporte.
2. Esperado: o arquivo se chama `alfred-backup-AAAA-MM-DD.cifrado.json`. Abra-o em um editor de texto: não deve aparecer nenhum título digitado.

## T8. Importação e recuperação

1. Apague a tarefa "Teste persistência" (Remover).
2. Na aba Backup, escolha o arquivo sem senha e importe.
3. Esperado: o relatório mostra 1 registro restaurado (ou atualizado, conforme a exclusão).
4. Repita com o arquivo cifrado, primeiro sem senha (esperado: mensagem pedindo a senha), depois com senha errada (esperado: mensagem de falha, nada gravado), depois com a senha correta.

## T9. Cópia da IA manual

1. Na aba IA manual, selecione uma tarefa, marque a confirmação da classe pessoal, escolha "Resumir" e toque em Gerar texto.
2. Esperado: aparece o texto para copiar.
3. Toque em Copiar texto. Cole em qualquer campo de texto (por exemplo, Notas).
4. Esperado: o texto foi copiado.
5. Gere um texto sem marcar a confirmação.
6. Esperado: aparece "Envio não autorizado" com o motivo, e o registro de envio mostra "Bloqueado".

## T10. Modo escuro

1. Ative o modo escuro do iOS e abra o app.
2. Esperado: fundo escuro, texto legível, botões visíveis.

## T11. Teclado e campos

1. Ao focar um campo de texto, o teclado não deve cobrir o botão de envio do formulário.
2. Esperado: é possível rolar até o botão enquanto o teclado está aberto.

## Registro de resultados

| Teste | Resultado (OK / Falhou / Não testado) | iOS | Observações |
|---|---|---|---|
| T1 | | | |
| T2 | | | |
| T3 | | | |
| T4 | | | |
| T5 | | | |
| T6 | | | |
| T7 | | | |
| T8 | | | |
| T9 | | | |
| T10 | | | |
| T11 | | | |
