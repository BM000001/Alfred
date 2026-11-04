import type { AIProvider, AssistantMessage, AssistantResponse, AssistantContext, ToolDefinition } from '../../assistant/contracts';
import { buildAssistantRequest } from '../context/contextBuilder';
import { classifyIntent } from '../intent/intentEngine';
import type { AssistantIntent } from '../intent/intentTypes';
import { ToolRegistry } from '../tools/toolRegistry';

export interface BrainResult extends AssistantResponse {
  intent: AssistantIntent;
  providerId: string;
}

export interface BrainOptions {
  provider: AIProvider;
  tools?: ToolRegistry;
}

export class Brain {
  readonly tools: ToolRegistry;
  private readonly provider: AIProvider;

  constructor(options: BrainOptions) {
    this.provider = options.provider;
    this.tools = options.tools ?? new ToolRegistry();
    for (const tool of options.provider.tools ?? []) {
      if (!this.tools.get(tool.id)) this.tools.register(tool as ToolDefinition<unknown, unknown>);
    }
  }

  async process(messages: readonly AssistantMessage[], context: AssistantContext): Promise<BrainResult> {
    const request = buildAssistantRequest(messages, context);
    const latestUserMessage = [...request.messages].reverse().find((message) => message.role === 'user');
    const classification = classifyIntent(latestUserMessage?.content ?? '');
    const response = await this.provider.generate(request);
    return { ...response, intent: classification.intent, providerId: this.provider.id };
  }
}
