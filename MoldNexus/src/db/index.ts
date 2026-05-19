import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  Simulation,
  Snapshot,
  ParameterSet,
  Defect,
  MappingRule,
  Mold,
  Task,
  Comment,
  User,
} from '../types';

interface MoldNexusDB extends DBSchema {
  users: {
    key: string;
    value: User;
    indexes: { 'by-role': string };
  };
  molds: {
    key: string;
    value: Mold;
    indexes: { 'by-material': string; 'by-createdAt': number };
  };
  simulations: {
    key: string;
    value: Simulation;
    indexes: {
      'by-userId': string;
      'by-status': string;
      'by-createdAt': number;
      'by-moldId': string;
    };
  };
  parameter_sets: {
    key: string;
    value: ParameterSet;
    indexes: { 'by-simulationId': string; 'by-createdAt': number };
  };
  snapshots: {
    key: string;
    value: Snapshot;
    indexes: {
      'by-simulationId': string;
      'by-version': number;
      'by-createdAt': number;
      'by-step': number;
    };
  };
  defects: {
    key: string;
    value: Defect;
    indexes: { 'by-snapshotId': string; 'by-type': string; 'by-severity': number };
  };
  mapping_rules: {
    key: string;
    value: MappingRule;
    indexes: { 'by-systemType': string; 'by-isActive': number };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: {
      'by-status': string;
      'by-priority': string;
      'by-assigneeId': string;
      'by-simulationId': string;
    };
  };
  comments: {
    key: string;
    value: Comment;
    indexes: { 'by-simulationId': string; 'by-taskId': string; 'by-createdAt': number };
  };
}

const DB_NAME = 'moldnexus-db';
const DB_VERSION = 1;

let db: IDBPDatabase<MoldNexusDB> | null = null;

export async function initDatabase(): Promise<IDBPDatabase<MoldNexusDB>> {
  if (db) return db;

  db = await openDB<MoldNexusDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('users')) {
        const userStore = database.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-role', 'role');
      }

      if (!database.objectStoreNames.contains('molds')) {
        const moldStore = database.createObjectStore('molds', { keyPath: 'id' });
        moldStore.createIndex('by-material', 'material');
        moldStore.createIndex('by-createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains('simulations')) {
        const simStore = database.createObjectStore('simulations', { keyPath: 'id' });
        simStore.createIndex('by-userId', 'userId');
        simStore.createIndex('by-status', 'status');
        simStore.createIndex('by-createdAt', 'createdAt');
        simStore.createIndex('by-moldId', 'moldId');
      }

      if (!database.objectStoreNames.contains('parameter_sets')) {
        const paramStore = database.createObjectStore('parameter_sets', { keyPath: 'id' });
        paramStore.createIndex('by-simulationId', 'simulationId');
        paramStore.createIndex('by-createdAt', 'createdAt');
      }

      if (!database.objectStoreNames.contains('snapshots')) {
        const snapshotStore = database.createObjectStore('snapshots', { keyPath: 'id' });
        snapshotStore.createIndex('by-simulationId', 'simulationId');
        snapshotStore.createIndex('by-version', 'version');
        snapshotStore.createIndex('by-createdAt', 'createdAt');
        snapshotStore.createIndex('by-step', 'step');
      }

      if (!database.objectStoreNames.contains('defects')) {
        const defectStore = database.createObjectStore('defects', { keyPath: 'id' });
        defectStore.createIndex('by-snapshotId', 'snapshotId');
        defectStore.createIndex('by-type', 'type');
        defectStore.createIndex('by-severity', 'severity');
      }

      if (!database.objectStoreNames.contains('mapping_rules')) {
        const mappingStore = database.createObjectStore('mapping_rules', { keyPath: 'id' });
        mappingStore.createIndex('by-systemType', 'targetSystem');
        mappingStore.createIndex('by-isActive', 'isActive');
      }

      if (!database.objectStoreNames.contains('tasks')) {
        const taskStore = database.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('by-status', 'status');
        taskStore.createIndex('by-priority', 'priority');
        taskStore.createIndex('by-assigneeId', 'assigneeId');
        taskStore.createIndex('by-simulationId', 'simulationId');
      }

      if (!database.objectStoreNames.contains('comments')) {
        const commentStore = database.createObjectStore('comments', { keyPath: 'id' });
        commentStore.createIndex('by-simulationId', 'simulationId');
        commentStore.createIndex('by-taskId', 'taskId');
        commentStore.createIndex('by-createdAt', 'createdAt');
      }
    },
  });

  return db;
}

export function getDB(): IDBPDatabase<MoldNexusDB> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}

export async function clearAllData(): Promise<void> {
  if (!db) return;
  const stores = [
    'users',
    'molds',
    'simulations',
    'parameter_sets',
    'snapshots',
    'defects',
    'mapping_rules',
    'tasks',
    'comments',
  ] as const;
  for (const store of stores) {
    if (db.objectStoreNames.contains(store)) {
      await db.clear(store);
    }
  }
}
