import type { EntityRepository } from '../../storage/repositories';
import type { Task } from './types';
import { validateTaskTitle } from './taskRules';

export type CreateTaskInput = Pick<Task, 'title' | 'priority'> &
  Partial<Pick<Task, 'description' | 'dueDate' | 'projectId'>>;

export type UpdateTaskInput = Partial<Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'projectId'>>;

export interface TaskServiceOptions {
  createId?: () => string;
  now?: () => Date;
}

export function createTaskService(
  repository: EntityRepository<Task>,
  options: TaskServiceOptions = {},
) {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date());

  return {
    async list(): Promise<Task[]> {
      return repository.getAll();
    },

    async get(id: string): Promise<Task | undefined> {
      return repository.getById(id);
    },

    async create(input: CreateTaskInput): Promise<Task> {
      const title = input.title.trim();
      const validationError = validateTaskTitle(title);
      if (validationError) throw new Error(validationError);

      const task: Task = {
        id: createId(),
        title,
        status: 'pending',
        priority: input.priority,
        createdAt: now().toISOString(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        ...(input.dueDate ? { dueDate: input.dueDate } : {}),
        ...(input.projectId ? { projectId: input.projectId } : {}),
      };

      await repository.save(task);
      return task;
    },

    async update(id: string, changes: UpdateTaskInput): Promise<Task> {
      const current = await repository.getById(id);
      if (!current) throw new Error('Tarefa não encontrada.');

      const title = changes.title === undefined ? current.title : changes.title.trim();
      const validationError = validateTaskTitle(title);
      if (validationError) throw new Error(validationError);

      const updated: Task = {
        ...current,
        ...changes,
        title,
        ...(changes.description !== undefined
          ? (changes.description.trim() ? { description: changes.description.trim() } : { description: undefined })
          : {}),
      };

      await repository.save(updated);
      return updated;
    },

    async complete(id: string): Promise<Task> {
      return this.update(id, { status: 'completed' } as UpdateTaskInput);
    },

    async delete(id: string): Promise<void> {
      const current = await repository.getById(id);
      if (!current) throw new Error('Tarefa não encontrada.');
      await repository.delete(id);
    },
  };
}
