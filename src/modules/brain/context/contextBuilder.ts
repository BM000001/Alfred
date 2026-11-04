import type { AssistantContext, AssistantMessage, AssistantRequest } from '../../assistant/contracts';

export function buildAssistantRequest(
  messages: readonly AssistantMessage[],
  context: AssistantContext,
): AssistantRequest {
  return {
    messages: messages.filter((message) => message.content.trim().length > 0),
    context: { ...context },
  };
}
