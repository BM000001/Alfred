import { describe, expect, it } from 'vitest';
import { LocalAssistantProvider } from './localAssistant';
import type { AssistantRequest } from './contracts';

const request = (content: string, intent: AssistantRequest['intent']): AssistantRequest => ({
  messages: [{ id: '1', role: 'user', content, createdAt: '2026-11-02T12:00:00.000Z' }],
  context: { locale: 'pt-BR', now: '2026-11-02T12:00:00.000Z', timezone: 'America/Sao_Paulo' },
  intent,
});

describe('LocalAssistantProvider', () => {
  it('recupera memórias quando recebe a intenção classificada pelo Brain', async () => {
    const provider = new LocalAssistantProvider({ tasks: [], appointments: [], topics: [] }, [
      { id: 'm1', title: 'Preferência', content: 'Prefiro respostas objetivas.', category: 'preference', createdAt: '', updatedAt: '' },
    ]);
    const result = await provider.generate(request('O que você lembra sobre mim?', 'memory'));
    expect(result.message).toContain('Prefiro respostas objetivas.');
    expect(result.usedTools).toEqual(['memory.retrieve']);
  });

  it('recupera somente memórias relacionadas ao assunto solicitado', async () => {
    const provider = new LocalAssistantProvider({ tasks: [], appointments: [], topics: [] }, [
      { id: 'm1', title: 'Projeto Alfred', content: 'Assistente pessoal local.', category: 'project', createdAt: '', updatedAt: '2026-11-03' },
      { id: 'm2', title: 'Rotina de estudos', content: 'Matemática à noite.', category: 'routine', createdAt: '', updatedAt: '2026-11-02' },
    ]);
    const result = await provider.generate(request('O que você lembra sobre estudos?', 'memory'));
    expect(result.message).toContain('Matemática à noite.');
    expect(result.message).not.toContain('Assistente pessoal local.');
  });

  it('não classifica novamente o prompt quando a intenção é desconhecida', async () => {
    const provider = new LocalAssistantProvider({ tasks: [], appointments: [], topics: [] });
    const result = await provider.generate(request('Quais tarefas estão pendentes?', 'unknown'));
    expect(result.usedTools).toEqual([]);
    expect(result.message).toContain('classificação e o roteamento são responsabilidade do Brain');
  });

  it('não tenta interpretar o pedido quando a intenção não foi fornecida', async () => {
    const provider = new LocalAssistantProvider({ tasks: [], appointments: [], topics: [] });
    const result = await provider.generate(request('Olá Alfred', undefined));
    expect(result.usedTools).toEqual([]);
    expect(result.message).toContain('regras locais');
  });
});
