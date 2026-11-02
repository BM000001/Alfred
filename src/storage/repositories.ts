import type { Project } from '../modules/projects/types';
import type { Appointment } from '../modules/agenda/types';
import type { Task } from '../modules/tasks/types';
import { openAlfredDatabase, runStoreRequest, STORE_NAMES } from './database';

export interface EntityRepository<T extends { id: string }> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}

function createRepository<T extends { id: string }>(storeName: string): EntityRepository<T> {
  async function withDatabase<R>(operation: (database: IDBDatabase) => Promise<R>): Promise<R> {
    const database = await openAlfredDatabase();
    try {
      return await operation(database);
    } finally {
      database.close();
    }
  }

  return {
    getAll: () => withDatabase((database) =>
      runStoreRequest<T[]>(database, storeName, 'readonly', (store) => store.getAll()),
    ),
    getById: (id) => withDatabase((database) =>
      runStoreRequest<T | undefined>(database, storeName, 'readonly', (store) => store.get(id)),
    ),
    save: (entity) => withDatabase(async (database) => {
      await runStoreRequest<IDBValidKey>(database, storeName, 'readwrite', (store) => store.put(entity));
    }),
    delete: (id) => withDatabase(async (database) => {
      await runStoreRequest<undefined>(database, storeName, 'readwrite', (store) => store.delete(id));
    }),
  };
}

export const taskRepository = createRepository<Task>(STORE_NAMES.tasks);
export const projectRepository = createRepository<Project>(STORE_NAMES.projects);
export const appointmentRepository = createRepository<Appointment>(STORE_NAMES.appointments);
