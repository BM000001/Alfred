import { describe, expect, it } from 'vitest';
import { LocalAssistantProvider } from './localAssistant';
import type { AssistantRequest } from './contracts';
import type { Task } from '../tasks/types';

const request = (content: string): AssistantRequest => ({
  messages: [{ id: '1', role: 'user', content, createdAt: '2026-11-02T12:00:00.000Z' }],
  context: { locale: 'pt-BR', now: '2026-11-02T12:00:00.000Z', timezone: 'America/Sao_Paulo' },
});
const tasks: Task[] = [
  { id: '1', title: 'Entregar projeto', status: 'pending', priority: 'high', createdAt: '2026-11-01T12:00:00.000Z' },
  { id: '2', title: 'Tarefa concluída', status: 'completed', priority: 'low', createdAt: '2026-11-01T12:00:00.000Z' },
];

describe('LocalAssistantProvider', () => {
  it('consulta tarefas pendentes sem incluir concluídas', async () => {
    const provider = new LocalAssistantProvider({ tasks, appointments: [], topics: [], now: new Date('2026-11-02T12:00:00.000Z') });
    const result = await provider.generate(request('Quais tarefas estão pendentes?'));
    expect(result.message).toContain('Entregar projeto');
    expect(result.message).not.toContain('Tarefa concluída');
    expect(result.usedTools).toEqual(['tasks.list']);
    expect(result.warnings[0]).toContain('somente leitura');
  });

  it('não executa ferramentas quando o pedido não é reconhecido', async () => {
    const provider = new LocalAssistantProvider({ tasks, appointments: [], topics: [] });
    const result = await provider.generate(request('Olá Alfred'));
    expect(result.usedTools).toEqual([]);
    expect(result.message).toContain('modelo de IA');
  });
});
