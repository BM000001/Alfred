import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualExportPanel } from './ManualExportPanel';
import {
  egressAuditRepository,
  egressSettingsRepository,
  memoryRepository,
  studyTopicRepository,
  taskRepository,
} from '../storage/repositories';
import type { Task } from './tasks/types';

const task: Task = {
  id: 'privacy-task-1',
  title: 'Preparar apresentação',
  status: 'pending',
  priority: 'medium',
  createdAt: '2026-11-03T10:00:00.000Z',
};

beforeEach(async () => {
  await Promise.all([
    egressAuditRepository.clear(),
    egressSettingsRepository.clear(),
    memoryRepository.clear(),
    studyTopicRepository.clear(),
    taskRepository.clear(),
  ]);
  await taskRepository.save(task);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ManualExportPanel', () => {
  it('exige revisão e consentimento, e audita apenas metadados após copiar', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(<ManualExportPanel />);

    await user.click(await screen.findByLabelText(/Tarefa · Preparar apresentação/));
    await user.click(screen.getByLabelText('Revisei este conteúdo: não contém dados sensíveis.'));
    await user.click(screen.getByLabelText('Autorizo incluir informações da categoria pessoal.'));
    await user.click(screen.getByRole('button', { name: 'Gerar prévia exata' }));

    const preview = await screen.findByLabelText('Texto exato que será copiado');
    expect((preview as HTMLTextAreaElement).value).toContain('Preparar apresentação');
    await user.click(screen.getByRole('button', { name: 'Copiar texto revisado' }));

    await waitFor(async () => {
      const entries = await egressAuditRepository.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        classes: ['personal'],
        itemCount: 1,
        action: 'copied_to_clipboard',
      });
      expect(JSON.stringify(entries[0])).not.toContain('Preparar apresentação');
    });
    expect(writeText).toHaveBeenCalledOnce();
    expect(await screen.findByText(/A ação foi registrada apenas com metadados/)).toBeInTheDocument();

    // A autorização é consumida: uma nova preparação exige consentimento novamente.
    await user.click(screen.getByLabelText(/Tarefa · Preparar apresentação/));
    await user.click(screen.getByLabelText('Revisei este conteúdo: não contém dados sensíveis.'));
    await user.click(screen.getByRole('button', { name: 'Gerar prévia exata' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Confirme o envio de informações da classe pessoal/);
  });

  it('permite bloquear novas preparações e persiste o bloqueio', async () => {
    const user = userEvent.setup();
    render(<ManualExportPanel />);
    await user.click(await screen.findByRole('button', { name: 'Desativar exportação' }));

    expect(await egressSettingsRepository.getById('global')).toEqual({
      id: 'global',
      enabled: false,
    });
    expect(screen.queryByRole('button', { name: 'Gerar prévia exata' })).not.toBeInTheDocument();
    expect(screen.getByText(/está desativada neste dispositivo/)).toBeInTheDocument();
  });

  it('permite reativar a preparação, sem reutilizar autorizações anteriores', async () => {
    await egressSettingsRepository.save({ id: 'global', enabled: false });
    const user = userEvent.setup();
    render(<ManualExportPanel />);
    await user.click(await screen.findByRole('button', { name: 'Reativar exportação' }));

    expect(await egressSettingsRepository.getById('global')).toEqual({
      id: 'global',
      enabled: true,
    });
    expect(await screen.findByRole('button', { name: 'Gerar prévia exata' })).toBeDisabled();
  });
});
