import { describe, expect, it, vi } from 'vitest';
import { executeApprovedProposal } from './proposalExecutor';
import type { ActionProposal, ApprovalDecision } from './contracts';
import type { Task } from '../tasks/types';
const task: Task = { id: 'task-1', title: 'Entregar projeto', status: 'pending', priority: 'high', createdAt: '2026-11-01T12:00:00.000Z' };
const proposal: ActionProposal = {
  id: 'proposal-1', title: 'Concluir tarefa', explanation: 'Marcar tarefa como concluída.',
  affectedRecords: ['task-1'], operations: [{ toolId: 'tasks.complete', input: { taskId: 'task-1' } }],
  createdAt: '2026-11-02T12:00:00.000Z',
};
const approved: ApprovalDecision = { proposalId: proposal.id, approved: true, decidedAt: '2026-11-02T12:01:00.000Z' };
describe('executeApprovedProposal', () => {
  it('altera a tarefa somente após aprovação correspondente', async () => {
    const repository = { getById: vi.fn().mockResolvedValue(task), save: vi.fn().mockResolvedValue(undefined) };
    const result = await executeApprovedProposal(proposal, approved, repository);
    expect(result.status).toBe('completed'); expect(repository.save).toHaveBeenCalledWith({ ...task, status: 'completed' });
  });
  it('não altera dados quando a proposta é recusada', async () => {
    const repository = { getById: vi.fn(), save: vi.fn() };
    const rejected: ApprovalDecision = { proposalId: proposal.id, approved: false, decidedAt: '2026-11-02T12:01:00.000Z' };
    await expect(executeApprovedProposal(proposal, rejected, repository)).rejects.toThrow('Ação não aprovada');
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('rejeita operações não permitidas', async () => {
    const repository = { getById: vi.fn(), save: vi.fn() };
    const invalid = { ...proposal, operations: [{ toolId: 'tasks.delete', input: { taskId: 'task-1' } }] };
    await expect(executeApprovedProposal(invalid, approved, repository)).rejects.toThrow('Ação não permitida');
    expect(repository.save).not.toHaveBeenCalled();
  });
  it('rejeita proposta que aponta para registro diferente', async () => {
    const repository = { getById: vi.fn().mockResolvedValue(task), save: vi.fn() };
    const tampered = { ...proposal, affectedRecords: ['other-task'] };
    await expect(executeApprovedProposal(tampered, approved, repository)).rejects.toThrow('Registro afetado');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
