import { describe, expect, it } from 'vitest';
import type { EntityRepository } from '../../storage/repositories';
import type { StoredFile } from './types';
import { createFileService } from './fileService';

function memoryRepository(): EntityRepository<StoredFile> {
  const items = new Map<string, StoredFile>();
  return {
    async getAll() { return [...items.values()]; },
    async getById(id) { return items.get(id); },
    async save(item) { items.set(item.id, item); },
    async delete(id) { items.delete(id); },
    async clear() { items.clear(); },
  };
}
describe('fileService', () => {
  it('armazena arquivo e lista somente metadados', async () => {
    const service = createFileService(memoryRepository(), () => 'file-1', () => new Date('2026-11-02T10:00:00Z'));
    const file = new File(['conteúdo'], 'anotacoes.txt', { type: 'text/plain' });
    const added = await service.add(file);
    expect(added.name).toBe('anotacoes.txt');
    expect(added.size).toBe(9);
    expect(await service.get('file-1')).toBeDefined();
    expect(await service.list()).toEqual([expect.objectContaining({ id: 'file-1', name: 'anotacoes.txt' })]);
  });
  it('associa arquivos a uma disciplina sem exigir migração de registros antigos', async () => {
    const repository = memoryRepository();
    const service = createFileService(repository, () => 'file-linked');
    const added = await service.add(new File(['material'], 'aula.pdf'), 'discipline-1');
    expect(added.disciplineId).toBe('discipline-1');
    expect((await service.get('file-linked'))?.disciplineId).toBe('discipline-1');
    expect((await service.list())[0].disciplineId).toBe('discipline-1');

    await repository.save({
      id: 'legacy-file', name: 'antigo.pdf', type: 'application/pdf',
      size: 1, createdAt: '2026-01-01T00:00:00.000Z', blob: new Blob(['x']),
    });
    expect((await service.list()).find((item) => item.id === 'legacy-file')).not.toHaveProperty('disciplineId');
  });
  it('rejeita arquivos vazios e acima do limite', async () => {
    const service = createFileService(memoryRepository());
    await expect(service.add(new File([], 'vazio.txt'))).rejects.toThrow(/vazio/);
    const large = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.bin');
    await expect(service.add(large)).rejects.toThrow(/10 MB/);
  });
  it('exclui um arquivo', async () => {
    const service = createFileService(memoryRepository(), () => 'file-2');
    await service.add(new File(['x'], 'x.txt'));
    await service.delete('file-2');
    expect(await service.get('file-2')).toBeUndefined();
  });
});
