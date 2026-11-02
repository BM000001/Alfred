import type { ActionProposal, ApprovalDecision } from './contracts';
import type { EntityRepository } from '../../storage/repositories';
import type { Task } from '../tasks/types';
type TaskWriteRepository = Pick<EntityRepository<Task>, 'getById' | 'save'>;

/** Executes only the fixed, allowlisted task-completion operation after matching explicit approval. */
export async function executeApprovedProposal(
  proposal: ActionProposal, decision: ApprovalDecision, repository: TaskWriteRepository,
): Promise<Task> {
  if (!decision.approved || decision.proposalId !== proposal.id) throw new Error('Ação não aprovada.');
  if (proposal.operations.length !== 1 || proposal.operations[0].toolId !== 'tasks.complete') {
    throw new Error('Ação não permitida.');
  }
  const input = proposal.operations[0].input;
  if (!input || typeof input !== 'object' || !('taskId' in input) || typeof input.taskId !== 'string') {
    throw new Error('Dados da ação inválidos.');
  }
  const taskId = input.taskId;
  if (!proposal.affectedRecords.includes(taskId)) throw new Error('Registro afetado não corresponde à proposta.');
  const task = await repository.getById(taskId);
  if (!task) throw new Error('A tarefa não existe mais.');
  if (task.status !== 'pending') throw new Error('A tarefa já não está pendente.');
  const updated: Task = { ...task, status: 'completed' };
  await repository.save(updated);
  return updated;
}
