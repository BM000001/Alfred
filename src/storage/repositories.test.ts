import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { Project } from '../modules/projects/types';
import type { Task } from '../modules/tasks/types';
import { ALFRED_DATABASE_NAME } from './database';
import { projectRepository, taskRepository } from './repositories';

const task: Task = {
  id: 'task-1',
  title: 'Estudar IndexedDB',
  status: 'pending',
  priority: 'high',
  createdAt: '2026-11-02T10:00:00.000Z',
};

const project: Project = {
  id: 'project-1',
  name: 'Alfred',
  status: 'active',
  createdAt: '2026-11-02T10:00:00.000Z',
};

afterEach(() => {
  indexedDB.deleteDatabase(ALFRED_DATABASE_NAME);
});

describe('taskRepository', () => {
  it('saves and retrieves tasks', async () => {
    await taskRepository.save(task);
    expect(await taskRepository.getById(task.id)).toEqual(task);
    expect(await taskRepository.getAll()).toEqual([task]);
  });

  it('updates an existing task using its id', async () => {
    await taskRepository.save(task);
    const updated = { ...task, status: 'completed' as const };
    await taskRepository.save(updated);
    expect(await taskRepository.getById(task.id)).toEqual(updated);
  });

  it('deletes a task', async () => {
    await taskRepository.save(task);
    await taskRepository.delete(task.id);
    expect(await taskRepository.getById(task.id)).toBeUndefined();
    expect(await taskRepository.getAll()).toEqual([]);
  });
});

describe('projectRepository', () => {
  it('saves and retrieves projects', async () => {
    await projectRepository.save(project);
    expect(await projectRepository.getById(project.id)).toEqual(project);
    expect(await projectRepository.getAll()).toEqual([project]);
  });

  it('updates and deletes projects', async () => {
    await projectRepository.save(project);
    const updated = { ...project, status: 'archived' as const };
    await projectRepository.save(updated);
    expect(await projectRepository.getById(project.id)).toEqual(updated);

    await projectRepository.delete(project.id);
    expect(await projectRepository.getById(project.id)).toBeUndefined();
  });
});
