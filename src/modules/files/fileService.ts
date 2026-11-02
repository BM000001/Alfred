import type { EntityRepository } from '../../storage/repositories';
import type { StoredFile, FileSummary } from './types';
import { MAX_FILE_SIZE } from './types';

type IdFactory = () => string;
export function createFileService(repository: EntityRepository<StoredFile>, createId: IdFactory = () => crypto.randomUUID(), now: () => Date = () => new Date()) {
  return {
    async list(): Promise<FileSummary[]> {
      const files = await repository.getAll();
      return files.map(({ id, name, type, size, createdAt }) => ({ id, name, type, size, createdAt }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async add(file: File): Promise<FileSummary> {
      const name = file.name.trim();
      if (!name) throw new Error('Escolha um arquivo válido.');
      if (file.size <= 0) throw new Error('O arquivo está vazio.');
      if (file.size > MAX_FILE_SIZE) throw new Error('O arquivo deve ter no máximo 10 MB.');
      const stored: StoredFile = { id: createId(), name, type: file.type || 'application/octet-stream', size: file.size, createdAt: now().toISOString(), blob: file };
      await repository.save(stored);
      const { blob: _blob, ...summary } = stored;
      return summary;
    },
    async get(id: string): Promise<StoredFile | undefined> { return repository.getById(id); },
    async delete(id: string): Promise<void> { await repository.delete(id); },
  };
}
