import type { AIProvider, AssistantRequest, AssistantResponse } from './contracts';
import type { ReadToolData } from './readTools';
import { createReadOnlyTools } from './readTools';

function latestUserMessage(request: AssistantRequest): string {
  return [...request.messages].reverse().find((message) => message.role === 'user')?.content.trim() ?? '';
}

export class LocalAssistantProvider implements AIProvider {
  readonly id = 'local-rules';

  constructor(private readonly data: ReadToolData) {}

  async generate(request: AssistantRequest): Promise<AssistantResponse> {
    const prompt = latestUserMessage(request).toLocaleLowerCase('pt-BR');
    if (!prompt) return { message: 'Diga o que deseja consultar.', usedTools: [], warnings: [] };

    const tools = createReadOnlyTools(this.data);
    const query = prompt.match(/(?:sobre|de|para|chamada?)\s+(.+?)[?.!]*$/i)?.[1]?.trim();
    const selected = prompt.includes('agenda') || prompt.includes('compromisso')
      ? tools.find((tool) => tool.id === 'agenda.upcoming')
      : prompt.includes('estud') || prompt.includes('tópico') || prompt.includes('topico')
        ? tools.find((tool) => tool.id === 'studies.progress')
        : prompt.includes('tarefa') || prompt.includes('pendên') || prompt.includes('penden')
          ? tools.find((tool) => tool.id === 'tasks.list') : undefined;

    if (!selected) {
      return { message: 'Posso consultar suas tarefas pendentes, próximos compromissos e progresso dos estudos. Ainda não estou conectado a um modelo de IA; por enquanto, respondo por regras locais e não envio seus dados para serviços externos.', usedTools: [], warnings: ['Assistente local inicial: compreensão limitada a consultas reconhecidas.'] };
    }

    const result = await selected.execute({ query });
    return { message: `${result.summary}\n${result.items.length ? result.items.map((item) => `• ${item}`).join('\n') : 'Não há itens para mostrar.'}`, usedTools: [selected.id], warnings: ['Consulta somente leitura. Nenhum dado foi alterado.'] };
  }
}
