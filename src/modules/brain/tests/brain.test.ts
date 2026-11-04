import { describe, expect, it, vi } from 'vitest';
import type { AIProvider, AssistantContext, AssistantMessage } from '../../assistant/contracts';
import { Brain, classifyIntent, ToolRegistry } from '../index';

const context: AssistantContext = { locale: 'pt-BR', now: '2026-11-04T12:00:00.000Z', timezone: 'America/Sao_Paulo' };
const message: AssistantMessage = { id: 'm1', role: 'user', content: 'Quais tarefas estão pendentes?', createdAt: context.now };

describe('Brain foundation', () => {
  it('classifies supported local domains and unknown requests', () => {
    expect(classifyIntent('Como estão meus estudos?').intent).toBe('studies');
    expect(classifyIntent('Quais são meus compromissos?').intent).toBe('agenda');
    expect(classifyIntent('O que você lembra sobre mim?').intent).toBe('memory');
    expect(classifyIntent('Conte uma piada').intent).toBe('unknown');
  });

  it('matches complete words instead of substrings inside unrelated words', () => {
    expect(classifyIntent('Sou independente e estou agendando algo').intent).toBe('unknown');
    expect(classifyIntent('Tenho uma tarefa pendente').intent).toBe('tasks');
  });

  it('marks messages that mention multiple domains as ambiguous', () => {
    const result = classifyIntent('Confira minha agenda e minhas tarefas');
    expect(result.intent).toBe('agenda');
    expect(result.confidence).toBe('low');
  });

  it('recognizes normalized multi-word phrases with accents', () => {
    expect(classifyIntent('Como está meu progresso acadêmico?').intent).toBe('studies');
  });

  it('delegates generation to the configured provider and returns classification metadata', async () => {
    const provider: AIProvider = {
      id: 'test-provider',
      generate: vi.fn(async () => ({ message: 'Há duas tarefas.', usedTools: ['tasks.list'], warnings: [] })),
    };
    const brain = new Brain({ provider });
    const result = await brain.process([message], context);
    expect(result.message).toBe('Há duas tarefas.');
    expect(result.intent).toBe('tasks');
    expect(result.providerId).toBe('test-provider');
    expect(provider.generate).toHaveBeenCalledOnce();
  });

  it('registers tools exposed by its provider', () => {
    const tool = { id: 'tasks.list', description: 'Read tasks', risk: 'read' as const, approval: 'never' as const, execute: async () => [] };
    const provider: AIProvider = {
      id: 'provider-with-tools',
      tools: [tool],
      generate: vi.fn(async () => ({ message: 'ok', usedTools: [], warnings: [] })),
    };
    const brain = new Brain({ provider });
    expect(brain.tools.get('tasks.list')).toBeDefined();
  });

  it('rejects duplicate tool identifiers', () => {
    const registry = new ToolRegistry();
    const tool = { id: 'tasks.list', description: 'Read tasks', risk: 'read' as const, approval: 'never' as const, execute: async () => [] };
    registry.register(tool);
    expect(() => registry.register(tool)).toThrow('Ferramenta já registrada');
  });
});
