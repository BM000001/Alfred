import { describe, expect, it } from 'vitest';

// jsdom's Blob is not preserved as a Blob by fake-indexeddb's structured clone.
// Load Node's Blob without requiring @types/node in this browser-focused project.
const nodeBufferModuleName: string = 'node:buffer';
const { Blob: NodeBlob } = await import(/* @vite-ignore */ nodeBufferModuleName);
Object.defineProperty(globalThis, 'Blob', { configurable: true, writable: true, value: NodeBlob });
import { createBackup, inspectBackup, restoreBackup } from './backupService';
import {
  egressSettingsRepository, fileRepository, focusSessionRepository, memoryRepository, studyFlashcardRepository,
  studyQuestionRepository, studyQuizAttemptRepository,
} from '../../storage/repositories';
import type { AssistantMemory } from '../memory/types';
import type { FocusSession } from '../productivity/types';
import type { StudyFlashcard } from '../studies/flashcardTypes';
import type { StudyQuestion, StudyQuizAttempt } from '../studies/questionTypes';
import type { StoredFile } from '../files/types';

const validBackup = {
  format: 'alfred-local-backup',
  version: 1,
  createdAt: '2026-11-02T12:00:00.000Z',
  data: { tasks: [], projects: [], appointments: [], disciplines: [], studyTopics: [], focusSessions: [], memories: [], files: [] },
};
const validV2 = {
  ...validBackup,
  version: 2,
  data: { ...validBackup.data, studyFlashcards: [], studyQuestions: [], studyQuizAttempts: [] },
};

describe('backupService', () => {
  it('inspeciona um backup v1 válido e contabiliza os dados sem inventar categorias', () => {
    const result = inspectBackup(JSON.stringify(validBackup));
    expect(result.createdAt).toBe(validBackup.createdAt);
    expect(result.version).toBe(1);
    expect(result.counts).toMatchObject({ tasks: 0, projects: 0, appointments: 0, disciplines: 0, studyTopics: 0, focusSessions: 0, memories: 0, files: 0 });
  });

  it('continua lendo backups antigos sem histórico de foco', () => {
    const { memories: _memories, focusSessions: _focusSessions, ...legacyData } = validBackup.data;
    const legacy = { ...validBackup, data: { ...legacyData, files: [] } };
    expect(inspectBackup(JSON.stringify(legacy)).counts.focusSessions).toBe(0);
  });

  it('inspeciona a estrutura v2 e contabiliza as novas categorias de estudo', () => {
    const result = inspectBackup(JSON.stringify(validV2));
    expect(result.version).toBe(2);
    expect(result.counts).toMatchObject({ studyFlashcards: 0, studyQuestions: 0, studyQuizAttempts: 0 });
  });

  it('inclui flashcards, questões, tentativas e metadados de arquivo no backup v2', async () => {
    const suffix = 'backup-v2-export-test';
    const flashcard: StudyFlashcard = {
      id: `${suffix}-card`, disciplineId: 'discipline-1', front: 'Frente', back: 'Verso',
      createdAt: '2026-11-02T10:00:00.000Z', nextReviewAt: '2026-11-03T10:00:00.000Z', intervalDays: 1, reviewCount: 0,
    };
    const question: StudyQuestion = {
      id: `${suffix}-question`, disciplineId: 'discipline-1', prompt: 'Pergunta?',
      options: ['A', 'B'], correctOptionIndex: 1, difficulty: 'easy', createdAt: '2026-11-02T10:00:00.000Z',
    };
    const attempt: StudyQuizAttempt = {
      id: `${suffix}-attempt`, disciplineId: 'discipline-1', startedAt: '2026-11-02T10:00:00.000Z',
      completedAt: '2026-11-02T10:05:00.000Z', totalQuestions: 1, correctAnswers: 1,
      answers: [{ questionId: question.id, selectedOptionIndex: 1, isCorrect: true }],
    };
    const extraction = {
      format: 'txt' as const, text: 'Texto extraído', characterCount: 14, wordCount: 2,
      extractedAt: '2026-11-02T10:00:00.000Z', extractionMethod: 'text' as const,
    };
    const file: StoredFile = {
      id: `${suffix}-file`, name: 'material.txt', type: 'text/plain', size: 4,
      createdAt: '2026-11-02T10:00:00.000Z', disciplineId: 'discipline-1', extraction,
      blob: new Blob(['data'], { type: 'text/plain' }),
    };
    try {
      await studyFlashcardRepository.save(flashcard);
      await studyQuestionRepository.save(question);
      await studyQuizAttemptRepository.save(attempt);
      await fileRepository.save(file);
      const inspected = inspectBackup(await createBackup());
      expect(inspected.version).toBe(2);
      expect(inspected.payload.version).toBe(2);
      if (inspected.payload.version !== 2) throw new Error('Esperada versão 2.');
      expect(inspected.payload.data.studyFlashcards).toContainEqual(flashcard);
      expect(Object.keys(inspected.payload.data)).not.toContain('assistantMessages');
      expect(Object.keys(inspected.payload.data)).not.toContain('egressAudit');
      expect(inspected.payload.data.studyQuestions).toContainEqual(question);
      expect(inspected.payload.data.studyQuizAttempts).toContainEqual(attempt);
      expect(inspected.payload.data.files).toContainEqual(expect.objectContaining({
        id: file.id, disciplineId: file.disciplineId, extraction, contentBase64: 'ZGF0YQ==',
      }));
    } finally {
      await studyFlashcardRepository.delete(flashcard.id);
      await studyQuestionRepository.delete(question.id);
      await studyQuizAttemptRepository.delete(attempt.id);
      await fileRepository.delete(file.id);
    }
  });

  it('restaura as categorias de estudo e preserva vínculo e extração dos arquivos', async () => {
    const flashcard: StudyFlashcard = {
      id: 'backup-v2-restore-card', disciplineId: 'discipline-restore', front: 'F', back: 'V',
      createdAt: '2026-11-02T10:00:00.000Z', nextReviewAt: '2026-11-03T10:00:00.000Z', intervalDays: 1, reviewCount: 2,
    };
    const question: StudyQuestion = {
      id: 'backup-v2-restore-question', disciplineId: 'discipline-restore', prompt: 'P?',
      options: ['A', 'B'], correctOptionIndex: 0, difficulty: 'medium', createdAt: '2026-11-02T10:00:00.000Z',
    };
    const attempt: StudyQuizAttempt = {
      id: 'backup-v2-restore-attempt', disciplineId: 'discipline-restore', startedAt: '2026-11-02T10:00:00.000Z',
      completedAt: '2026-11-02T10:05:00.000Z', totalQuestions: 1, correctAnswers: 0,
      answers: [{ questionId: question.id, selectedOptionIndex: null, isCorrect: false }],
    };
    const file: StoredFile = {
      id: 'backup-v2-restore-file', name: 'restaurado.txt', type: 'text/plain', size: 3,
      createdAt: '2026-11-02T10:00:00.000Z', disciplineId: 'discipline-restore',
      extraction: { format: 'txt', text: 'abc', characterCount: 3, wordCount: 1, extractedAt: '2026-11-02T10:00:00.000Z' },
      blob: new Blob(['abc'], { type: 'text/plain' }),
    };
    const staleFlashcard: StudyFlashcard = {
      id: 'backup-v2-stale-card', disciplineId: 'old-discipline', front: 'Antigo', back: 'Remover',
      createdAt: '2026-11-01T10:00:00.000Z', nextReviewAt: '2026-11-02T10:00:00.000Z', intervalDays: 1, reviewCount: 1,
    };
    const payload = {
      ...validV2,
      data: {
        ...validV2.data, studyFlashcards: [flashcard], studyQuestions: [question],
        studyQuizAttempts: [attempt],
        files: [{ id: file.id, name: file.name, type: file.type, size: file.size, createdAt: file.createdAt,
          disciplineId: file.disciplineId, extraction: file.extraction, contentBase64: 'YWJj' }],
      },
    };
    try {
      await studyFlashcardRepository.save(staleFlashcard);
      await restoreBackup(payload);
      expect(await studyFlashcardRepository.getById(flashcard.id)).toEqual(flashcard);
      expect(await studyFlashcardRepository.getById(staleFlashcard.id)).toBeUndefined();
      expect(await studyQuestionRepository.getById(question.id)).toEqual(question);
      expect(await studyQuizAttemptRepository.getById(attempt.id)).toEqual(attempt);
      const restoredFile = await fileRepository.getById(file.id);
      expect(restoredFile?.disciplineId).toBe(file.disciplineId);
      expect(restoredFile?.extraction).toEqual(file.extraction);
      expect(await restoredFile?.blob.text()).toBe('abc');
    } finally {
      await studyFlashcardRepository.delete(flashcard.id);
      await studyFlashcardRepository.delete(staleFlashcard.id);
      await studyQuestionRepository.delete(question.id);
      await studyQuizAttemptRepository.delete(attempt.id);
      await fileRepository.delete(file.id);
    }
  });

  it('preserva categorias ausentes em backups v1 antigos', async () => {
    const flashcard: StudyFlashcard = {
      id: 'backup-v1-preserve-card', disciplineId: 'd1', front: 'F', back: 'V',
      createdAt: '2026-11-02T10:00:00.000Z', nextReviewAt: '2026-11-03T10:00:00.000Z', intervalDays: 1, reviewCount: 0,
    };
    const session: FocusSession = {
      id: 'backup-v1-preserve-session', startedAt: '2026-11-02T10:00:00.000Z',
      completedAt: '2026-11-02T10:25:00.000Z', durationMinutes: 25, kind: 'focus',
    };
    const memory: AssistantMemory = {
      id: 'backup-v1-preserve-memory', title: 'Meta', content: 'Preservar dado local.',
      category: 'goal', createdAt: '2026-11-02T10:00:00.000Z', updatedAt: '2026-11-02T10:00:00.000Z',
    };
    const { focusSessions: _focusSessions, memories: _memories, ...legacyData } = validBackup.data;
    const legacyWithoutOptionalCategories = { ...validBackup, data: legacyData };
    try {
      await studyFlashcardRepository.save(flashcard);
      await focusSessionRepository.save(session);
      await memoryRepository.save(memory);
      await restoreBackup(legacyWithoutOptionalCategories);
      expect(await studyFlashcardRepository.getById(flashcard.id)).toEqual(flashcard);
      expect(await focusSessionRepository.getById(session.id)).toEqual(session);
      expect(await memoryRepository.getById(memory.id)).toEqual(memory);
    } finally {
      await studyFlashcardRepository.delete(flashcard.id);
      await focusSessionRepository.delete(session.id);
      await memoryRepository.delete(memory.id);
    }
  });

  it('preserva as configurações locais de privacidade ao restaurar um backup v2', async () => {
    const original = await egressSettingsRepository.getById('global');
    try {
      await egressSettingsRepository.save({ id: 'global', enabled: false });
      await restoreBackup(validV2);
      expect(await egressSettingsRepository.getById('global')).toEqual({ id: 'global', enabled: false });
    } finally {
      if (original) await egressSettingsRepository.save(original);
      else await egressSettingsRepository.delete('global');
    }
  });

  it('rejeita IDs duplicados em uma categoria v2', () => {
    const duplicate = { ...validV2, data: { ...validV2.data, studyFlashcards: [
      { id: 'same', disciplineId: 'd1', front: 'F', back: 'B', createdAt: '2026-11-02T10:00:00.000Z', nextReviewAt: '2026-11-03T10:00:00.000Z', intervalDays: 1, reviewCount: 0 },
      { id: 'same', disciplineId: 'd1', front: 'F2', back: 'B2', createdAt: '2026-11-02T10:00:00.000Z', nextReviewAt: '2026-11-03T10:00:00.000Z', intervalDays: 1, reviewCount: 0 },
    ] } };
    expect(() => inspectBackup(JSON.stringify(duplicate))).toThrow('identificadores duplicados');
  });

  it('rejeita payload v2 inválido na própria fronteira de restauração', async () => {
    const invalid = { ...validV2, data: { ...validV2.data, studyQuestions: [{ id: 'q1', prompt: 'Pergunta sem opções' }] } };
    await expect(restoreBackup(invalid)).rejects.toThrow('studyQuestions');
  });

  it('inclui o histórico Pomodoro no backup exportado', async () => {
    const id = 'backup-focus-session-test';
    const session: FocusSession = { id, startedAt: '2026-11-02T10:00:00.000Z', completedAt: '2026-11-02T10:25:00.000Z', durationMinutes: 25, kind: 'focus' };
    try {
      await focusSessionRepository.save(session);
      expect(inspectBackup(await createBackup()).counts.focusSessions).toBe(1);
    } finally { await focusSessionRepository.delete(id); }
  });

  it('inclui memórias explícitas no backup', async () => {
    const memory: AssistantMemory = { id: 'memory-backup-test', title: 'Preferência', content: 'Prefiro planos objetivos.', category: 'preference', createdAt: '2026-11-03T10:00:00.000Z', updatedAt: '2026-11-03T10:00:00.000Z' };
    try {
      await memoryRepository.save(memory);
      expect(inspectBackup(await createBackup()).counts.memories).toBe(1);
    } finally { await memoryRepository.delete(memory.id); }
  });

  it('restaura memórias do backup para o IndexedDB', async () => {
    const memory: AssistantMemory = { id: 'memory-restore-test', title: 'Objetivo', content: 'Concluir o projeto.', category: 'goal', createdAt: '2026-11-03T10:00:00.000Z', updatedAt: '2026-11-03T10:00:00.000Z' };
    try {
      await memoryRepository.save(memory);
      const preview = inspectBackup(await createBackup());
      await memoryRepository.delete(memory.id);
      await restoreBackup(preview.payload);
      expect(await memoryRepository.getById(memory.id)).toEqual(memory);
    } finally { await memoryRepository.delete(memory.id); }
  });

  it('rejeita memórias inválidas no backup', () => {
    const invalid = { ...validBackup, data: { ...validBackup.data, memories: [{ id: 'm1', title: '', content: 'x', category: 'unknown', createdAt: 'invalid', updatedAt: 'invalid' }] } };
    expect(() => inspectBackup(JSON.stringify(invalid))).toThrow('memórias inválidas');
  });

  it('rejeita JSON inválido', () => {
    expect(() => inspectBackup('{')).toThrow('JSON válido');
  });

  it('rejeita formato e versão incompatíveis', () => {
    expect(() => inspectBackup(JSON.stringify({ ...validBackup, version: 99 }))).toThrow('não compatível');
  });

  it('rejeita entidades sem identificador', () => {
    const invalid = { ...validBackup, data: { ...validBackup.data, tasks: [{ title: 'Sem id' }] } };
    expect(() => inspectBackup(JSON.stringify(invalid))).toThrow('tasks');
  });

  it('rejeita arquivo sem metadados e conteúdo Base64', () => {
    const invalid = { ...validBackup, data: { ...validBackup.data, files: [{ id: 'f1', name: 'a.txt', type: 'text/plain', size: 1, createdAt: validBackup.createdAt }] } };
    expect(() => inspectBackup(JSON.stringify(invalid))).toThrow('arquivos inválidos');
  });

  it('rejeita conteúdo Base64 malformado', () => {
    const invalid = { ...validBackup, data: { ...validBackup.data, files: [{ id: 'f1', name: 'a.txt', type: 'text/plain', size: 1, createdAt: validBackup.createdAt, contentBase64: '!!!' }] } };
    expect(() => inspectBackup(JSON.stringify(invalid))).toThrow('Base64 inválido');
  });

  it('rejeita divergência entre tamanho declarado e conteúdo', () => {
    const invalid = { ...validBackup, data: { ...validBackup.data, files: [{ id: 'f1', name: 'a.txt', type: 'text/plain', size: 2, createdAt: validBackup.createdAt, contentBase64: 'YQ==' }] } };
    expect(() => inspectBackup(JSON.stringify(invalid))).toThrow('não corresponde');
  });

  it('aceita arquivo vazio com tamanho zero', () => {
    const invalid = { ...validBackup, data: { ...validBackup.data, files: [{ id: 'f1', name: 'vazio.txt', type: 'text/plain', size: 0, createdAt: validBackup.createdAt, contentBase64: '' }] } };
    expect(inspectBackup(JSON.stringify(invalid)).counts.files).toBe(1);
  });
});
