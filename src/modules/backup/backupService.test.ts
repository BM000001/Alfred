import { describe, expect, it } from 'vitest';
import { inspectBackup } from './backupService';

const validBackup = {
  format: 'alfred-local-backup',
  version: 1,
  createdAt: '2026-11-02T12:00:00.000Z',
  data: { tasks: [], projects: [], appointments: [], disciplines: [], studyTopics: [], files: [] },
};

describe('backupService', () => {
  it('inspeciona um backup válido e contabiliza os dados', () => {
    const result = inspectBackup(JSON.stringify(validBackup));
    expect(result.createdAt).toBe(validBackup.createdAt);
    expect(result.counts).toEqual({ tasks: 0, projects: 0, appointments: 0, disciplines: 0, studyTopics: 0, files: 0 });
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
    const valid = { ...validBackup, data: { ...validBackup.data, files: [{ id: 'f1', name: 'vazio.txt', type: 'text/plain', size: 0, createdAt: validBackup.createdAt, contentBase64: '' }] } };
    expect(inspectBackup(JSON.stringify(valid)).counts.files).toBe(1);
  });
});
