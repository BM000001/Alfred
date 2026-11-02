import type { AIProvider, ActionProposal, AssistantRequest, AssistantResponse } from './contracts';
import type { ReadToolData } from './readTools';
import { createReadOnlyTools } from './readTools';

function latestUserMessage(request: AssistantRequest): string {
  return [...request.messages].reverse().find((message) => message.role === 'user')?.content.trim() ?? '';
}
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}
function completionTarget(prompt: string): string | undefined {
  const patterns = [
    /(?:concluir|finalizar)\\s+(?:a\\s+)?tarefa\\s+(.+)$/i,
    /(?:marcar|marque)\\s+(?:a\\s+)?tarefa\\s+(.+?)\\s+como\\s+conclu[ií]da?$/i,
    /tarefa\\s+(.+?)\\s+(?:como\\s+)?conclu[ií]da?$/i,
  ];
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, '').replace(/[?.!]+$/, '').trim();
  }
  return undefined;
}
export class LocalAssistantProvider implements AIProvider {
  readonly id = 'local-rules';
  constructor(private readonly data: ReadToolData) {}
  async generate(request: AssistantRequest): Promise<AssistantResponse> {
    const rawPrompt = latestUserMessage(request);
    const prompt = normalize(rawPrompt);
    if (!prompt) return { message: 'Diga o que deseja consultar.', usedTools: [], warnings: [] };
    const target = completionTarget(rawPrompt);
    if (target) {
      const task = this.data.tasks.find((item) => normalize(item.title) === normalize(target));
      if (!task) return {
        message: 'Não encontrei uma tarefa com esse nome exato. Confira o título na sua lista e tente novamente.',
        usedTools: [], warnings: ['Nenhum dado foi alterado.'],
      };
      if (task.status === 'completed') return {
        message: 'Essa tarefa já está concluída. Nenhuma alteração foi necessária.', usedTools: [], warnings: [],
      };
      const proposal: ActionProposal = {
        id: crypto.randomUUID(), title: 'Concluir tarefa',
        explanation: 'O Alfred pode marcar "' + task.title + '" como concluída. Essa alteração só será feita depois da sua confirmação.',
        affectedRecords: [task.id],
        operations: [{ toolId: 'tasks.complete', input: { taskId: task.id } }],
        createdAt: request.context.now,
      };
      return {
        message: 'Preparei uma ação para você. ' + proposal.explanation,
        usedTools: [], warnings: ['Ação aguardando aprovação explícita. Nenhum dado foi alterado.'], proposal,
      };
    }
    const tools = createReadOnlyTools(this.data);
    const query = rawPrompt.match(/(?:sobre|de|para|chamada?)\\s+(.+?)[?.!]*$/i)?.[1]?.trim();
    const selected = prompt.includes('agenda') || prompt.includes('compromisso')
      ? tools.find((tool) => tool.id === 'agenda.upcoming')
      : prompt.includes('estud') || prompt.includes('topico')
        ? tools.find((tool) => tool.id === 'studies.progress')
        : prompt.includes('tarefa') || prompt.includes('penden')
          ? tools.find((tool) => tool.id === 'tasks.list') : undefined;
    if (!selected) return {
      message: 'Posso consultar tarefas pendentes, próximos compromissos e progresso dos estudos. Também posso preparar a conclusão de uma tarefa para sua aprovação. Ainda não estou conectado a um modelo de IA; respondo por regras locais e não envio seus dados para serviços externos.',
      usedTools: [], warnings: ['Assistente local inicial: compreensão limitada a consultas reconhecidas.'],
    };
    const result = await selected.execute({ query });
    return {
      message: result.summary + '\\n' + (result.items.length ? result.items.map((item) => '• ' + item).join('\\n') : 'Não há itens para mostrar.'),
      usedTools: [selected.id], warnings: ['Consulta somente leitura. Nenhum dado foi alterado.'],
    };
  }
}
