import { describe, expect, it } from 'vitest';
import { createReadOnlyTools } from './readTools';
import type { StudyFlashcard } from '../studies/flashcardTypes';
import type { StudyQuestion, StudyQuizAttempt } from '../studies/questionTypes';
import type { StudyTopic } from '../studies/types';

const now = new Date('2026-11-06T12:00:00.000Z');
const topics: StudyTopic[] = [
  { id: 'topic-a', disciplineId: 'math', title: 'Limites', status: 'pending', createdAt: '2026-11-01T00:00:00.000Z' },
];
const flashcards: StudyFlashcard[] = [
  { id: 'card-due', disciplineId: 'math', front: 'Limite lateral?', back: 'Definição', createdAt: '2026-11-01T00:00:00.000Z', nextReviewAt: '2026-11-05T00:00:00.000Z', intervalDays: 1, reviewCount: 1 },
  { id: 'card-future', disciplineId: 'math', front: 'Continuidade?', back: 'Definição', createdAt: '2026-11-01T00:00:00.000Z', nextReviewAt: '2026-11-07T00:00:00.000Z', intervalDays: 2, reviewCount: 1 },
];
const questions: StudyQuestion[] = [
  { id: 'q1', disciplineId: 'math', topicId: 'topic-a', prompt: 'Defina limite', options: ['A', 'B'], correctOptionIndex: 1, difficulty: 'easy', createdAt: '2026-11-01T00:00:00.000Z' },
];
const quizAttempts: StudyQuizAttempt[] = [
  { id: 'attempt-1', disciplineId: 'math', startedAt: '2026-11-05T12:00:00.000Z', completedAt: '2026-11-05T12:05:00.000Z', totalQuestions: 1, correctAnswers: 0, answers: [{ questionId: 'q1', selectedOptionIndex: 0, isCorrect: false }] },
];

describe('studies.progress read tool', () => {
  it('reports due flashcards, question bank, attempts and topic accuracy', async () => {
    const tool = createReadOnlyTools({
      tasks: [], appointments: [], topics, flashcards, questions, quizAttempts, now,
    }).find(item => item.id === 'studies.progress');

    const result = await tool!.execute({});

    expect(result.summary).toContain('0 de 1 tópico(s)');
    expect(result.items).toContain('1 flashcard(s) vencido(s) de 2 cadastrado(s).');
    expect(result.items).toContain('1 questão(ões) disponível(is); 1 tentativa(s) de simulado relacionada(s).');
    expect(result.items).toContain('Desempenho nas questões: 0% de acerto em 1 resposta(s).');
    expect(result.items).toContain('Limites: 0% de acerto (0/1); 1 erro(s).');
  });

  it('remains compatible when optional study collections are not supplied', async () => {
    const tool = createReadOnlyTools({ tasks: [], appointments: [], topics, now })
      .find(item => item.id === 'studies.progress');

    const result = await tool!.execute({});

    expect(result.items).toContain('0 flashcard(s) vencido(s) de 0 cadastrado(s).');
    expect(result.items).toContain('0 questão(ões) disponível(is); 0 tentativa(s) de simulado relacionada(s).');
  });
});
