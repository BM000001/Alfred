import type { AssistantIntent, IntentClassification } from './intentTypes';

const rules: Array<{ intent: Exclude<AssistantIntent, 'unknown'>; terms: string[] }> = [
  { intent: 'memory', terms: ['memoria', 'memorias', 'lembra', 'lembranca', 'recorda'] },
  { intent: 'studies', terms: ['estudo', 'estudos', 'materia', 'disciplina', 'topico', 'revisao', 'progresso academico'] },
  { intent: 'agenda', terms: ['agenda', 'compromisso', 'evento', 'reuniao', 'consulta', 'calendario', 'horario'] },
  { intent: 'tasks', terms: ['tarefa', 'tarefas', 'pendencia', 'pendente', 'afazer', 'prioridade', 'entrega', 'prazo'] },
];

export function normalizeIntentText(value: string): string {
  return value.toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyIntent(message: string): IntentClassification {
  const normalized = normalizeIntentText(message);
  for (const rule of rules) {
    const matchedTerms = rule.terms.filter((term) => normalized.includes(term));
    if (matchedTerms.length) return { intent: rule.intent, confidence: 'high', matchedTerms };
  }
  return { intent: 'unknown', confidence: 'low', matchedTerms: [] };
}
