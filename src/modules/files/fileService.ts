import type { EntityRepository } from '../../storage/repositories';
import type { StoredFile, FileSummary } from './types';
import { MAX_FILE_SIZE } from './types';

type IdFactory = () => string;
export function createFileService(repository: EntityRepository<StoredFile>, createId: IdFactory = () => crypto.randomUUID(), now: () => Date = () => new Date()) {
  return {
    async list(): Promise<FileSummary[]> {
      const files = await repository.getAll();
      return files.map(({ id, name, type, size, createdAt, disciplineId }) => ({
        id, name, type, size, createdAt, ...(disciplineId ? { disciplineId } : {}),
      })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async add(file: File, disciplineId?: string): Promise<FileSummary> {
      const name = file.name.trim();
      if (!name) throw new Error('Escolha um arquivo válido.');
      if (file.size <= 0) throw new Error('O arquivo está vazio.');
      if (file.size > MAX_FILE_SIZE) throw new Error('O arquivo deve ter no máximo 10 MB.');
      const stored: StoredFile = {
        id: createId(), name, type: file.type || 'application/octet-stream',
        size: file.size, createdAt: now().toISOString(),
        ...(disciplineId ? { disciplineId } : {}), blob: file,
      };
      await repository.save(stored);
      return {
        id: stored.id, name: stored.name, type: stored.type, size: stored.size,
        createdAt: stored.createdAt, ...(stored.disciplineId ? { disciplineId: stored.disciplineId } : {}),
      };
    },
    async get(id: string): Promise<StoredFile | undefined> { return repository.getById(id); },
    async delete(id: string): Promise<void> { await repository.delete(id); },
  };
}
