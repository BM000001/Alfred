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
