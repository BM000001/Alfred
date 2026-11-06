import { openAlfredDatabase, STORE_NAMES } from '../../storage/database';
import type { Task } from '../tasks/types';
import type { Project } from '../projects/types';
import type { Appointment } from '../agenda/types';
import type { Discipline, StudyTopic } from '../studies/types';
import type { StudyFlashcard } from '../studies/flashcardTypes';
import type { StudyQuestion, StudyQuizAttempt } from '../studies/questionTypes';
import type { StoredFile, StoredTextExtraction } from '../files/types';
import type { FocusSession } from '../productivity/types';
import type { AssistantMemory } from '../memory/types';

const BACKUP_FORMAT = 'alfred-local-backup';
const LEGACY_BACKUP_VERSION = 1;
const BACKUP_VERSION = 2;

type BackupFile = Omit<StoredFile, 'blob'> & { contentBase64: string };
type LegacyBackupPayload = {
  format: typeof BACKUP_FORMAT;
  version: typeof LEGACY_BACKUP_VERSION;
  createdAt: string;
  data: {
    tasks: Task[];
    projects: Project[];
    appointments: Appointment[];
    disciplines: Discipline[];
    studyTopics: StudyTopic[];
    focusSessions?: FocusSession[];
    memories?: AssistantMemory[];
    files: Array<Omit<BackupFile, 'disciplineId' | 'extraction'>>;
  };
};
export type BackupPayload = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  data: {
    tasks: Task[];
    projects: Project[];
    appointments: Appointment[];
    disciplines: Discipline[];
    studyTopics: StudyTopic[];
    studyFlashcards: StudyFlashcard[];
    studyQuestions: StudyQuestion[];
    studyQuizAttempts: StudyQuizAttempt[];
    focusSessions: FocusSession[];
    memories: AssistantMemory[];
    files: BackupFile[];
  };
};
type AnyBackupPayload = LegacyBackupPayload | BackupPayload;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('Conteúdo Base64 inválido.');
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertEntities(value: unknown, label: string): asserts value is Array<Record<string, unknown> & { id: string }> {
  if (!Array.isArray(value) || !value.every((item) => isRecord(item) && typeof item.id === 'string' && item.id.trim().length > 0)) {
    throw new Error(`O backup contém dados inválidos em: ${label}.`);
  }
  const ids = (value as Array<{ id: string }>).map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error(`O backup contém identificadores duplicados em: ${label}.`);
}

function assertString(value: unknown, field: string, allowEmpty = false): asserts value is string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    throw new Error(`O backup contém um campo inválido: ${field}.`);
  }
}
function assertOptionalString(value: unknown, field: string): void {
  if (value !== undefined) assertString(value, field, true);
}
function assertNumber(value: unknown, field: string, minimum = 0): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new Error(`O backup contém um número inválido: ${field}.`);
  }
}
function assertDate(value: unknown, field: string): asserts value is string {
  assertString(value, field);
  if (Number.isNaN(Date.parse(value))) throw new Error(`O backup contém uma data inválida: ${field}.`);
}
function assertEnum(value: unknown, allowed: readonly string[], field: string): void {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new Error(`O backup contém um valor inválido: ${field}.`);
}
function assertOptionalDate(value: unknown, field: string): void {
  if (value !== undefined) assertDate(value, field);
}

function validateV2Entities(data: Record<string, unknown>): void {
  const arrays = ['tasks', 'projects', 'appointments', 'disciplines', 'studyTopics', 'studyFlashcards', 'studyQuestions', 'studyQuizAttempts', 'focusSessions', 'memories', 'files'];
  for (const name of arrays) assertEntities(data[name], name);

  for (const item of data.tasks as Record<string, unknown>[]) {
    assertString(item.title, 'tasks.title');
    assertEnum(item.status, ['pending', 'completed'], 'tasks.status');
    assertEnum(item.priority, ['low', 'medium', 'high'], 'tasks.priority');
    assertDate(item.createdAt, 'tasks.createdAt');
    assertOptionalString(item.description, 'tasks.description');
    assertOptionalString(item.dueDate, 'tasks.dueDate');
    assertOptionalString(item.projectId, 'tasks.projectId');
  }
  for (const item of data.projects as Record<string, unknown>[]) {
    assertString(item.name, 'projects.name');
    assertEnum(item.status, ['active', 'archived'], 'projects.status');
    assertDate(item.createdAt, 'projects.createdAt');
    assertOptionalString(item.description, 'projects.description');
  }
  for (const item of data.appointments as Record<string, unknown>[]) {
    assertString(item.title, 'appointments.title');
    assertEnum(item.type, ['class', 'exam', 'deadline', 'personal', 'other'], 'appointments.type');
    assertEnum(item.status, ['scheduled', 'completed', 'cancelled'], 'appointments.status');
    assertDate(item.startsAt, 'appointments.startsAt');
    assertDate(item.endsAt, 'appointments.endsAt');
    assertDate(item.createdAt, 'appointments.createdAt');
    for (const field of ['description', 'location', 'importedUid', 'importedStableUid', 'importedCalendarId', 'importedCalendarName']) assertOptionalString(item[field], `appointments.${field}`);
    for (const field of ['isAllDay', 'isRecurring']) if (item[field] !== undefined && typeof item[field] !== 'boolean') throw new Error(`O backup contém um campo inválido: appointments.${field}.`);
  }
  for (const item of data.disciplines as Record<string, unknown>[]) {
    assertString(item.name, 'disciplines.name'); assertDate(item.createdAt, 'disciplines.createdAt'); assertOptionalString(item.description, 'disciplines.description');
  }
  for (const item of data.studyTopics as Record<string, unknown>[]) {
    assertString(item.disciplineId, 'studyTopics.disciplineId'); assertString(item.title, 'studyTopics.title');
    assertEnum(item.status, ['pending', 'completed'], 'studyTopics.status'); assertDate(item.createdAt, 'studyTopics.createdAt');
    assertOptionalString(item.notes, 'studyTopics.notes');
  }
  for (const item of data.studyFlashcards as Record<string, unknown>[]) {
    assertString(item.disciplineId, 'studyFlashcards.disciplineId'); assertString(item.front, 'studyFlashcards.front'); assertString(item.back, 'studyFlashcards.back');
    assertDate(item.createdAt, 'studyFlashcards.createdAt'); assertDate(item.nextReviewAt, 'studyFlashcards.nextReviewAt');
    assertOptionalDate(item.lastReviewedAt, 'studyFlashcards.lastReviewedAt');
    assertNumber(item.intervalDays, 'studyFlashcards.intervalDays'); assertNumber(item.reviewCount, 'studyFlashcards.reviewCount');
    if (!Number.isInteger(item.intervalDays) || !Number.isInteger(item.reviewCount)) throw new Error('O backup contém intervalos ou contagens inválidos em studyFlashcards.');
  }
  for (const item of data.studyQuestions as Record<string, unknown>[]) {
    assertString(item.disciplineId, 'studyQuestions.disciplineId'); assertString(item.prompt, 'studyQuestions.prompt');
    if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > 6 || !item.options.every((option) => typeof option === 'string' && option.trim().length > 0)) throw new Error('O backup contém opções inválidas em studyQuestions.');
    assertNumber(item.correctOptionIndex, 'studyQuestions.correctOptionIndex');
    if (!Number.isInteger(item.correctOptionIndex) || item.correctOptionIndex >= item.options.length) throw new Error('O backup contém índice de resposta inválido em studyQuestions.');
    assertEnum(item.difficulty, ['easy', 'medium', 'hard'], 'studyQuestions.difficulty'); assertDate(item.createdAt, 'studyQuestions.createdAt');
    assertOptionalString(item.topicId, 'studyQuestions.topicId'); assertOptionalString(item.explanation, 'studyQuestions.explanation');
  }
  for (const item of data.studyQuizAttempts as Record<string, unknown>[]) {
    assertString(item.disciplineId, 'studyQuizAttempts.disciplineId'); assertDate(item.startedAt, 'studyQuizAttempts.startedAt'); assertDate(item.completedAt, 'studyQuizAttempts.completedAt');
    assertNumber(item.totalQuestions, 'studyQuizAttempts.totalQuestions', 1); assertNumber(item.correctAnswers, 'studyQuizAttempts.correctAnswers');
    if (!Number.isInteger(item.totalQuestions) || !Number.isInteger(item.correctAnswers) || item.correctAnswers > item.totalQuestions || !Array.isArray(item.answers) || item.answers.length !== item.totalQuestions) throw new Error('O backup contém uma tentativa de simulado inválida.');
    for (const answer of item.answers) {
      if (!isRecord(answer)) throw new Error('O backup contém uma resposta de simulado inválida.');
      assertString(answer.questionId, 'studyQuizAttempts.answers.questionId');
      if (answer.selectedOptionIndex !== null) { assertNumber(answer.selectedOptionIndex, 'studyQuizAttempts.answers.selectedOptionIndex'); if (!Number.isInteger(answer.selectedOptionIndex)) throw new Error('Índice de resposta inválido.'); }
      if (typeof answer.isCorrect !== 'boolean') throw new Error('O backup contém um resultado de resposta inválido.');
    }
  }
  for (const item of data.focusSessions as Record<string, unknown>[]) {
    assertDate(item.startedAt, 'focusSessions.startedAt'); assertDate(item.completedAt, 'focusSessions.completedAt');
    assertNumber(item.durationMinutes, 'focusSessions.durationMinutes', 1); assertEnum(item.kind, ['focus'], 'focusSessions.kind');
    assertOptionalString(item.taskId, 'focusSessions.taskId'); assertOptionalString(item.taskTitle, 'focusSessions.taskTitle');
  }
  const categories = ['preference', 'goal', 'project', 'routine', 'other'];
  for (const item of data.memories as Record<string, unknown>[]) {
    assertString(item.title, 'memories.title'); assertString(item.content, 'memories.content');
    if (item.title.length > 80 || item.content.length > 500) throw new Error('O backup contém memórias acima do limite permitido.');
    assertEnum(item.category, categories, 'memories.category'); assertDate(item.createdAt, 'memories.createdAt'); assertDate(item.updatedAt, 'memories.updatedAt');
  }
  for (const item of data.files as Record<string, unknown>[]) {
    assertString(item.name, 'files.name'); assertString(item.type, 'files.type', true); assertNumber(item.size, 'files.size');
    if (!Number.isSafeInteger(item.size)) throw new Error('O backup contém tamanho de arquivo inválido.');
    assertDate(item.createdAt, 'files.createdAt'); assertOptionalString(item.disciplineId, 'files.disciplineId');
    if (item.extraction !== undefined) validateExtraction(item.extraction);
    assertString(item.contentBase64, 'files.contentBase64', true);
    const bytes = fromBase64(item.contentBase64);
    if (bytes.byteLength !== item.size) throw new Error('O tamanho do conteúdo de um arquivo não corresponde aos metadados.');
  }
}

function validateExtraction(value: unknown): asserts value is StoredTextExtraction {
  if (!isRecord(value)) throw new Error('O backup contém extração de arquivo inválida.');
  assertEnum(value.format, ['txt', 'md', 'csv', 'json', 'pdf'], 'files.extraction.format');
  assertString(value.text, 'files.extraction.text', true);
  assertNumber(value.characterCount, 'files.extraction.characterCount');
  assertNumber(value.wordCount, 'files.extraction.wordCount');
  if (!Number.isInteger(value.characterCount) || !Number.isInteger(value.wordCount)) throw new Error('Contagem inválida na extração do arquivo.');
  assertDate(value.extractedAt, 'files.extraction.extractedAt');
  if (value.extractionMethod !== undefined) assertEnum(value.extractionMethod, ['text', 'ocr'], 'files.extraction.extractionMethod');
  assertOptionalString(value.language, 'files.extraction.language');
  if (value.pageCount !== undefined) {
    assertNumber(value.pageCount, 'files.extraction.pageCount');
    if (!Number.isInteger(value.pageCount)) throw new Error('Contagem de páginas inválida na extração do arquivo.');
  }
  if (value.pages !== undefined) {
    if (!Array.isArray(value.pages)) throw new Error('Páginas extraídas inválidas.');
    for (const page of value.pages) {
      if (!isRecord(page)) throw new Error('Página extraída inválida.');
      assertNumber(page.pageNumber, 'files.extraction.pages.pageNumber', 1);
      if (!Number.isInteger(page.pageNumber)) throw new Error('Número de página inválido.');
      assertString(page.text, 'files.extraction.pages.text', true);
      if (page.confidence !== undefined && page.confidence !== null) assertNumber(page.confidence, 'files.extraction.pages.confidence');
      if (page.method !== undefined) assertEnum(page.method, ['text', 'ocr'], 'files.extraction.pages.method');
    }
  }
}

function validateLegacyData(data: Record<string, unknown>): void {
  for (const name of ['tasks', 'projects', 'appointments', 'disciplines', 'studyTopics', 'files']) assertEntities(data[name], name);
  if (data.focusSessions !== undefined) assertEntities(data.focusSessions, 'focusSessions');
  if (data.memories !== undefined) {
    assertEntities(data.memories, 'memories');
    const validCategories = ['preference', 'goal', 'project', 'routine', 'other'];
    if (!(data.memories as unknown[]).every((item) => isRecord(item) && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 80 && typeof item.content === 'string' && item.content.trim().length > 0 && item.content.length <= 500 && validCategories.includes(String(item.category)) && typeof item.createdAt === 'string' && !Number.isNaN(Date.parse(item.createdAt)) && typeof item.updatedAt === 'string' && !Number.isNaN(Date.parse(item.updatedAt)))) {
      throw new Error('O backup contém memórias inválidas.');
    }
  }
  validateLegacyFiles(data.files as unknown[]);
}
function validateLegacyFiles(files: unknown[]): void {
  for (const file of files) {
    if (!isRecord(file) || typeof file.contentBase64 !== 'string' || typeof file.name !== 'string' || typeof file.type !== 'string'
      || !Number.isSafeInteger(file.size) || (file.size as number) < 0 || typeof file.createdAt !== 'string') throw new Error('O backup contém arquivos inválidos.');
    let bytes: Uint8Array;
    try { bytes = fromBase64(file.contentBase64); } catch { throw new Error('O backup contém arquivos com conteúdo Base64 inválido.'); }
    if (bytes.byteLength !== file.size) throw new Error('O tamanho do conteúdo de um arquivo não corresponde aos metadados.');
  }
}

function getCounts(data: Record<string, unknown>): Record<string, number> {
  const names = ['tasks', 'projects', 'appointments', 'disciplines', 'studyTopics', 'studyFlashcards', 'studyQuestions', 'studyQuizAttempts', 'focusSessions', 'memories', 'files'];
  return Object.fromEntries(names.map((name) => [name, Array.isArray(data[name]) ? (data[name] as unknown[]).length : 0]));
}

export async function createBackup(): Promise<string> {
  const database = await openAlfredDatabase();
  try {
    // Assistant messages and egress audit are intentionally excluded; local privacy
    // settings are never exported or overwritten on another device.
    const names = [
      STORE_NAMES.tasks, STORE_NAMES.projects, STORE_NAMES.appointments, STORE_NAMES.disciplines,
      STORE_NAMES.studyTopics, STORE_NAMES.studyFlashcards, STORE_NAMES.studyQuestions,
      STORE_NAMES.studyQuizAttempts, STORE_NAMES.files, STORE_NAMES.focusSessions, STORE_NAMES.memories,
    ];
    const transaction = database.transaction(names, 'readonly');
    const requests = names.map((name) => new Promise<unknown[]>((resolve, reject) => {
      const request = transaction.objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => reject(request.error ?? new Error('Falha ao ler os dados locais.'));
    }));
    const [tasks, projects, appointments, disciplines, studyTopics, studyFlashcards, studyQuestions, studyQuizAttempts, files, focusSessions, memories] = await Promise.all(requests);
    const filePayload: BackupFile[] = await Promise.all((files as StoredFile[]).map(async (file) => ({
      id: file.id, name: file.name, type: file.type, size: file.size, createdAt: file.createdAt,
      ...(file.disciplineId ? { disciplineId: file.disciplineId } : {}),
      ...(file.extraction ? { extraction: file.extraction } : {}),
      contentBase64: toBase64(new Uint8Array(await file.blob.arrayBuffer())),
    })));
    const payload: BackupPayload = {
      format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: new Date().toISOString(),
      data: {
        tasks: tasks as Task[], projects: projects as Project[], appointments: appointments as Appointment[],
        disciplines: disciplines as Discipline[], studyTopics: studyTopics as StudyTopic[],
        studyFlashcards: studyFlashcards as StudyFlashcard[], studyQuestions: studyQuestions as StudyQuestion[],
        studyQuizAttempts: studyQuizAttempts as StudyQuizAttempt[], focusSessions: focusSessions as FocusSession[],
        memories: memories as AssistantMemory[], files: filePayload,
      },
    };
    return JSON.stringify(payload);
  } finally { database.close(); }
}

export function inspectBackup(raw: string): { createdAt: string; version: 1 | 2; counts: Record<string, number>; payload: AnyBackupPayload } {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('O arquivo selecionado não contém um JSON válido.'); }
  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT || ![LEGACY_BACKUP_VERSION, BACKUP_VERSION].includes(parsed.version as number) || !isRecord(parsed.data)) {
    throw new Error('Formato de backup inválido ou versão não compatível.');
  }
  if (typeof parsed.createdAt !== 'string' || Number.isNaN(Date.parse(parsed.createdAt))) throw new Error('Data de criação do backup inválida.');
  const data = parsed.data;
  if (parsed.version === LEGACY_BACKUP_VERSION) validateLegacyData(data);
  else validateV2Entities(data);
  return {
    createdAt: parsed.createdAt, version: parsed.version as 1 | 2, counts: getCounts(data),
    payload: parsed as unknown as AnyBackupPayload,
  };
}

export async function restoreBackup(input: unknown): Promise<void> {
  // Revalidate at the service boundary, even when callers already displayed a preview.
  const serialized = JSON.stringify(input);
  if (typeof serialized !== 'string') throw new Error('Payload de backup inválido.');
  const payload = inspectBackup(serialized).payload;
  const isV2 = payload.version === BACKUP_VERSION;
  const data = payload.data;
  const restoredFiles = data.files.map((file) => {
    const bytes = fromBase64(file.contentBase64);
    const { contentBase64, ...metadata } = file;
    return { ...metadata, blob: new Blob([bytes], { type: file.type }) };
  });
  const database = await openAlfredDatabase();
  try {
    const rows: Record<string, unknown[]> = {
      [STORE_NAMES.tasks]: data.tasks,
      [STORE_NAMES.projects]: data.projects,
      [STORE_NAMES.appointments]: data.appointments,
      [STORE_NAMES.disciplines]: data.disciplines,
      [STORE_NAMES.studyTopics]: data.studyTopics,
      [STORE_NAMES.files]: restoredFiles,
    };
    if (isV2) {
      const v2 = payload as BackupPayload;
      rows[STORE_NAMES.focusSessions] = v2.data.focusSessions;
      rows[STORE_NAMES.memories] = v2.data.memories;
      rows[STORE_NAMES.studyFlashcards] = v2.data.studyFlashcards;
      rows[STORE_NAMES.studyQuestions] = v2.data.studyQuestions;
      rows[STORE_NAMES.studyQuizAttempts] = v2.data.studyQuizAttempts;
    } else {
      const legacy = payload as LegacyBackupPayload;
      // Optional fields absent from early v1 backups must remain untouched locally.
      if (legacy.data.focusSessions !== undefined) rows[STORE_NAMES.focusSessions] = legacy.data.focusSessions;
      if (legacy.data.memories !== undefined) rows[STORE_NAMES.memories] = legacy.data.memories;
    }
    const names = Object.keys(rows);
    const transaction = database.transaction(names, 'readwrite');
    const completion = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Não foi possível restaurar o backup.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('A restauração foi cancelada.'));
    });
    for (const name of names) {
      const store = transaction.objectStore(name);
      store.clear();
      for (const entity of rows[name]) store.put(entity);
    }
    await completion;
  } finally { database.close(); }
}
