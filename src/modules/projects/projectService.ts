import type { EntityRepository } from '../../storage/repositories';
import type { Project } from './types';
import { validateProjectName } from './projectRules';

export type CreateProjectInput = Pick<Project, 'name'> &
  Partial<Pick<Project, 'description'>>;

export type UpdateProjectInput = Partial<Pick<Project, 'name' | 'description' | 'status'>>;

export interface ProjectServiceOptions {
  createId?: () => string;
  now?: () => Date;
}

export function createProjectService(
  repository: EntityRepository<Project>,
  options: ProjectServiceOptions = {},
) {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date());

  return {
    async list(): Promise<Project[]> {
      return repository.getAll();
    },

    async get(id: string): Promise<Project | undefined> {
      return repository.getById(id);
    },

    async create(input: CreateProjectInput): Promise<Project> {
      const name = input.name.trim();
      const validationError = validateProjectName(name);
      if (validationError) throw new Error(validationError);

      const project: Project = {
        id: createId(),
        name,
        status: 'active',
        createdAt: now().toISOString(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
      };

      await repository.save(project);
      return project;
    },

    async update(id: string, changes: UpdateProjectInput): Promise<Project> {
      const current = await repository.getById(id);
      if (!current) throw new Error('Projeto não encontrado.');

      const name = changes.name === undefined ? current.name : changes.name.trim();
      const validationError = validateProjectName(name);
      if (validationError) throw new Error(validationError);

      const updated: Project = {
        ...current,
        ...changes,
        name,
        ...(changes.description !== undefined
          ? (changes.description.trim() ? { description: changes.description.trim() } : { description: undefined })
          : {}),
      };

      await repository.save(updated);
      return updated;
    },

    async archive(id: string): Promise<Project> {
      return this.update(id, { status: 'archived' });
    },

    async delete(id: string): Promise<void> {
      const current = await repository.getById(id);
      if (!current) throw new Error('Projeto não encontrado.');
      await repository.delete(id);
    },
  };
}
