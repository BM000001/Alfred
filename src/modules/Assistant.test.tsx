import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Assistant } from './Assistant';
import { taskRepository } from '../storage/repositories';
import type { Task } from './tasks/types';

const task: Task = {
  id: 'assistant-approval-task',
  title: 'Preparar apresentação',
  status: 'pending',
  priority: 'medium',
  createdAt: '2026-11-01T10:00:00.000Z',
};

beforeEach(async () => {
  vi.stubGlobal('crypto', { ...crypto, randomUUID: () => 'assistant-test-message-id' });
  const existing = await taskRepository.getAll();
  await Promise.all(existing.map((item) => taskRepository.delete(item.id)));
  await taskRepository.save(task);
});

describe('Assistant task approval UI', () => {
  it('não altera a tarefa quando uma proposta é preparada ou cancelada', async () => {
    const user = userEvent.setup();
    render(<Assistant />);
    await user.type(screen.getByLabelText('Mensagem para Alfred'), 'concluir tarefa Preparar apresentação');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));

    await screen.findByRole('button', { name: 'Confirmar alteração' });
    expect(await taskRepository.getById(task.id)).toMatchObject({ status: 'pending' });
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await taskRepository.getById(task.id)).toMatchObject({ status: 'pending' });
    expect(screen.queryByRole('button', { name: 'Confirmar alteração' })).not.toBeInTheDocument();
  });

  it('só conclui a tarefa depois do clique explícito de confirmação', async () => {
    const user = userEvent.setup();
    render(<Assistant />);
    await user.type(screen.getByLabelText('Mensagem para Alfred'), 'marcar tarefa Preparar apresentação como concluída');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    await user.click(await screen.findByRole('button', { name: 'Confirmar alteração' }));

    await waitFor(async () => {
      expect(await taskRepository.getById(task.id)).toMatchObject({ status: 'completed' });
    });
    expect(await screen.findByText('Confirmado. A tarefa “Preparar apresentação” foi marcada como concluída.')).toBeInTheDocument();
  });

  it('não propõe alteração se o título da tarefa não corresponder exatamente', async () => {
    const user = userEvent.setup();
    render(<Assistant />);
    await user.type(screen.getByLabelText('Mensagem para Alfred'), 'concluir tarefa Apresentação');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText(/Não encontrei uma tarefa com o título exato/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar alteração' })).not.toBeInTheDocument();
    expect(await taskRepository.getById(task.id)).toMatchObject({ status: 'pending' });
  });
});
