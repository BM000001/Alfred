import type { AIProvider, AssistantRequest, AssistantResponse } from './contracts';
import type { ReadToolData } from './readTools';
import { createReadOnlyTools } from './readTools';

type Intent = 'tasks' | 'agenda' | 'studies' | 'unknown';

function latestUserMessage(request: AssistantRequest): string {
  return [...request.messages].reverse().find((message) => message.role === 'user')?.content.trim() ?? '';
}

function normalizePrompt(value: string): string {
  return value.toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(prompt: string): Intent {
  const value = normalizePrompt(prompt);
  const has = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(value));

  if (has([/\b(estud|materia|disciplina|topico|aprend|revis|conteudo|progresso academico)\w*/])) return 'studies';
  if (has([/\b(agenda|compromisso|evento|reuniao|consulta|encontro|horario|calendario)\w*/]) ||
      /\b(quando|que dia|qual dia|o que tenho)\b/.test(value) && /\b(marcad|agendad|programad)\w*/.test(value)) return 'agenda';
  if (has([/\b(tarefa|pendencia|pendente|afazer|to do|prioridade|entrega|prazo)\w*/]) ||
      /\b(o que|quais|qual) (preciso|devo|tenho que) fazer\b/.test(value) ||
      /\b(minhas coisas|meus afazeres)\b/.test(value)) return 'tasks';
  return 'unknown';
}

function extractTopicQuery(prompt: string): string | undefined {
  const normalized = prompt.trim().replace(/[?.!]+$/, '').trim();
  const match = normalized.match(/(?:sobre|de|para|na disciplina|na materia|em)\s+(.+)$/i);
  const query = match?.[1]?.trim();
  return query && query.length > 1 ? query : undefined;
}

export class LocalAssistantProvider implements AIProvider {
  readonly id = 'local-rules';

  constructor(private readonly data: ReadToolData) {}

  async generate(request: AssistantRequest): Promise<AssistantResponse> {
    const rawPrompt = latestUserMessage(request);
    if (!rawPrompt) return { message: 'Diga o que deseja consultar.', usedTools: [], warnings: [] };

    const intent = detectIntent(rawPrompt);
    const tools = createReadOnlyTools(this.data);
    const selectedId = intent === 'agenda' ? 'agenda.upcoming'
      : intent === 'studies' ? 'studies.progress'
        : intent === 'tasks' ? 'tasks.list' : undefined;
    const selected = tools.find((tool) => tool.id === selectedId);

    if (!selected) {
      return {
        message: 'Posso ajudar com três áreas: tarefas e pendências, compromissos da agenda e progresso dos estudos. Experimente perguntar, por exemplo: “O que preciso fazer?”, “Tenho algo marcado esta semana?” ou “Como estão meus estudos?”.',
        usedTools: [],
        warnings: ['Assistente local: a compreensão é feita por regras e não por um modelo de IA.'],
      };
    }

    const query = intent === 'studies' ? extractTopicQuery(rawPrompt) : undefined;
    const result = await selected.execute({ query });
    return {
      message: `${result.summary}\n${result.items.length ? result.items.map((item) => `• ${item}`).join('\n') : 'Não há itens para mostrar.'}`,
      usedTools: [selected.id],
      warnings: ['Consulta somente leitura. Nenhum dado foi alterado.'],
    };
  }
}
