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

function matchesTerm(normalized: string, words: ReadonlySet<string>, term: string): boolean {
  // Single words must match a complete token; multi-word terms match a phrase.
  return term.includes(' ')
    ? (' ' + normalized + ' ').includes(' ' + term + ' ')
    : words.has(term);
}

export function classifyIntent(message: string): IntentClassification {
  const normalized = normalizeIntentText(message);
  const words = new Set(normalized.split(' ').filter(Boolean));
  const matches = rules
    .map((rule) => ({ intent: rule.intent, matchedTerms: rule.terms.filter((term) => matchesTerm(normalized, words, term)) }))
    .filter((rule) => rule.matchedTerms.length > 0);

  if (matches.length === 0) return { intent: 'unknown', confidence: 'low', matchedTerms: [] };

  // Preserve deterministic precedence, but surface ambiguity instead of claiming certainty.
  const selected = matches[0];
  return {
    intent: selected.intent,
    confidence: matches.length === 1 ? 'high' : 'low',
    matchedTerms: selected.matchedTerms,
  };
}
