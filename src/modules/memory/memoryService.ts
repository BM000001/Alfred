import type { EntityRepository } from '../../storage/repositories';
import type { AssistantMemory, MemoryCategory } from './types';
export interface MemoryInput { title: string; content: string; category: MemoryCategory; }
const CATEGORIES: MemoryCategory[] = ['preference', 'goal', 'project', 'routine', 'other'];
function validate(input: MemoryInput): MemoryInput {
  const title = input.title.trim(); const content = input.content.trim();
  if (!title) throw new Error('Informe um título para a memória.');
  if (title.length > 80) throw new Error('O título deve ter no máximo 80 caracteres.');
  if (!content) throw new Error('Informe o conteúdo que deseja lembrar.');
  if (content.length > 500) throw new Error('O conteúdo deve ter no máximo 500 caracteres.');
  if (!CATEGORIES.includes(input.category)) throw new Error('Categoria de memória inválida.');
  return { title, content, category: input.category };
}
export async function createMemory(repository: EntityRepository<AssistantMemory>, input: MemoryInput, options: { createId?: () => string; now?: () => Date } = {}): Promise<AssistantMemory> {
  const normalized = validate(input); const now = (options.now ?? (() => new Date()))().toISOString();
  const memory: AssistantMemory = { id: (options.createId ?? (() => crypto.randomUUID()))(), ...normalized, createdAt: now, updatedAt: now };
  await repository.save(memory); return memory;
}
export async function updateMemory(repository: EntityRepository<AssistantMemory>, id: string, input: MemoryInput, now: () => Date = () => new Date()): Promise<AssistantMemory> {
  const current = await repository.getById(id); if (!current) throw new Error('Memória não encontrada.');
  const updated = { ...current, ...validate(input), updatedAt: now().toISOString() }; await repository.save(updated); return updated;
}
export async function deleteMemory(repository: EntityRepository<AssistantMemory>, id: string): Promise<void> {
  if (!await repository.getById(id)) throw new Error('Memória não encontrada.'); await repository.delete(id);
}
export async function listMemories(repository: EntityRepository<AssistantMemory>): Promise<AssistantMemory[]> {
  return (await repository.getAll()).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
export function searchMemories(memories: AssistantMemory[], query: string): AssistantMemory[] {
  const normalized = query.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const terms = normalized.split(/[^a-z0-9]+/).filter(term => term.length > 1); if (!terms.length) return [];
  return memories.map(memory => {
    const text = `${memory.title} ${memory.content} ${memory.category}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return { memory, score: terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0) };
  }).filter(item => item.score > 0).sort((a,b) => b.score-a.score || b.memory.updatedAt.localeCompare(a.memory.updatedAt)).map(item => item.memory);
}
