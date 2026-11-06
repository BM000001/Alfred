import { describe, expect, it } from 'vitest';
import { Brain } from './Brain';
import { LocalAssistantProvider } from '../../assistant/localAssistant';

describe('Brain', () => {
  it('routes memory requests using the Brain classification', async () => {
    const provider = new LocalAssistantProvider({ tasks: [], appointments: [], topics: [] }, [
      { id: 'm1', title: 'Preference', content: 'Objective answers.', category: 'preference', createdAt: '', updatedAt: '' },
    ]);
    const brain = new Brain({ provider });
    const result = await brain.process([{ id: 'u1', role: 'user', content: 'O que você lembra sobre mim?', createdAt: '' }], {
      locale: 'pt-BR', now: '2026-11-06T12:00:00.000Z', timezone: 'America/Sao_Paulo',
    });
    expect(result.intent).toBe('memory');
    expect(result.usedTools).toEqual(['memory.retrieve']);
    expect(result.message).toContain('Objective answers.');
  });

  it('does not execute tools when the Brain finds multiple intents', async () => {
    const provider = new LocalAssistantProvider({ tasks: [
      { id: 't1', title: 'Relatório', status: 'pending', priority: 'high', createdAt: '' },
    ], appointments: [], topics: [] });
    const brain = new Brain({ provider });
    const result = await brain.process([{ id: 'u2', role: 'user', content: 'Confira minha agenda e minhas tarefas.', createdAt: '' }], {
      locale: 'pt-BR', now: '2026-11-06T12:00:00.000Z', timezone: 'America/Sao_Paulo',
    });
    expect(result.usedTools).toEqual([]);
    expect(result.warnings).toContain('Pedido ambíguo: nenhuma ferramenta foi executada.');
  });

  it('routes task reads through the Brain tool registry', async () => {
    const provider = new LocalAssistantProvider({ tasks: [
      { id: 't1', title: 'Relatório', status: 'pending', priority: 'high', createdAt: '' },
    ], appointments: [], topics: [] });
    const brain = new Brain({ provider });
    const result = await brain.process([{ id: 'u3', role: 'user', content: 'Quais tarefas estão pendentes?', createdAt: '' }], {
      locale: 'pt-BR', now: '2026-11-06T12:00:00.000Z', timezone: 'America/Sao_Paulo',
    });
    expect(result.usedTools).toEqual(['tasks.list']);
    expect(result.message).toContain('Relatório');
  });
});