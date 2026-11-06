import type { AIProvider, AssistantRequest, AssistantResponse } from './contracts';
import type { ReadToolData } from './readTools';
import { createReadOnlyTools } from './readTools';
import type { AssistantMemory } from '../memory/types';
import { retrieveRelevantMemories } from '../memory/memoryService';

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

export class LocalAssistantProvider implements AIProvider {
  readonly id = 'local-rules';
  readonly tools: ReturnType<typeof createReadOnlyTools>;

  constructor(data: ReadToolData, private readonly memories: AssistantMemory[] = []) {
    this.tools = createReadOnlyTools(data);
  }

  async generate(request: AssistantRequest): Promise<AssistantResponse> {
    const rawPrompt = latestUserMessage(request);
    if (!rawPrompt) return { message: 'Diga o que deseja consultar.', usedTools: [], warnings: [] };

    // Intent is supplied by Brain. This provider deliberately does not classify prompts.
    if (request.intent === 'memory') {
      const normalizedPrompt = normalizePrompt(rawPrompt);
      const broadRequest = /\b(sobre mim|tudo que voce sabe|todas as memorias|quais memorias|listar memorias|o que voce lembra|o que voce recorda|o que voce sabe)\b/.test(normalizedPrompt);
      const topicMatch = rawPrompt.match(/\bsobre\s+(?!mim\b)(.+)$/i);
      const topic = topicMatch?.[1]?.replace(/[?.!]+$/, '').trim();
      const matches = topic
        ? retrieveRelevantMemories(this.memories, topic, 3)
        : broadRequest
          ? this.memories.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 10).map(memory => ({ memory, matchedTerms: [], score: 0 }))
          : retrieveRelevantMemories(this.memories, rawPrompt, 3);
      const message = matches.length
        ? 'Encontrei estas memórias locais relevantes:\n' + matches.map(({ memory, matchedTerms }) =>
            '• ' + memory.title + ' (' + memory.category + '): ' + memory.content +
            (matchedTerms.length ? ' — relação: ' + matchedTerms.join(', ') : ' — listada a pedido geral')
          ).join('\n')
        : this.memories.length
          ? 'Não encontrei uma memória relacionada a esse assunto. Não vou listar informações sem relação com o pedido. Se desejar, tente outro termo ou consulte todas as memórias salvas.'
          : 'Ainda não há memórias salvas. Você pode adicionar preferências, objetivos, rotinas ou informações de projetos no painel “Memórias do Alfred”. Não salvo informações automaticamente.';
      return {
        message,
        usedTools: ['memory.retrieve'],
        warnings: ['Memórias cadastradas manualmente e armazenadas somente neste dispositivo. A relação exibida é baseada em correspondência textual, não em compreensão semântica.'],
      };
    }

    if (request.intent === 'unknown') {
      return {
        message: 'Não consegui identificar com segurança a área do pedido. A classificação e o roteamento são responsabilidade do Brain; reformule a solicitação com um assunto mais específico.',
        usedTools: [],
        warnings: ['Nenhuma ferramenta foi executada porque a intenção não foi reconhecida.'],
      };
    }

    return {
      message: 'Posso ajudar com tarefas, compromissos, progresso dos estudos e memórias locais. Ainda não utilizo um modelo de IA generativa; esta versão interpreta os pedidos por regras locais.',
      usedTools: [],
      warnings: ['Intenção não fornecida pelo Brain; nenhuma ferramenta foi executada.'],
    };
  }
}
