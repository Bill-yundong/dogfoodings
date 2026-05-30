import Dexie, { Table } from 'dexie';
import type {
  User,
  EncryptionKey,
  Category,
  Account,
  Transaction,
  Investment,
  TaxRecord,
  SimulationParams,
  Budget,
} from '@/types';
import { DB_NAME, DB_VERSION } from '@/constants';

export class FinanceNexusDB extends Dexie {
  users!: Table<User, string>;
  encryptionKeys!: Table<EncryptionKey, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  transactions!: Table<Transaction, string>;
  investments!: Table<Investment, string>;
  taxRecords!: Table<TaxRecord, string>;
  simulationParams!: Table<SimulationParams, string>;
  budgets!: Table<Budget, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      users: 'id, email, createdAt',
      encryptionKeys: 'id, userId, version, createdAt',
      categories: 'id, userId, type, sortOrder',
      accounts: 'id, userId, type, createdAt',
      transactions: 'id, userId, date, type, categoryId, accountId, createdAt',
      investments: 'id, userId, accountId, type, purchaseDate',
      taxRecords: 'id, userId, year, month, createdAt',
      simulationParams: 'id, userId, scenario',
      budgets: 'id, categoryId, period, year, month',
    });
  }
}

export const db = new FinanceNexusDB();

export const getDatabase = (): FinanceNexusDB => {
  return db;
};

export const deleteDatabase = async (): Promise<void> => {
  await db.delete();
};

export const clearDatabase = async (): Promise<void> => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
};

export const exportDatabase = async (): Promise<Record<string, unknown[]>> => {
  const result: Record<string, unknown[]> = {};

  for (const table of db.tables) {
    result[table.name] = await table.toArray();
  }

  return result;
};

export const importDatabase = async (
  data: Record<string, unknown[]>
): Promise<void> => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      if (data[table.name] && Array.isArray(data[table.name])) {
        await table.bulkPut(data[table.name] as never[]);
      }
    }
  });
};

export const databaseExists = async (): Promise<boolean> => {
  try {
    const userCount = await db.users.count();
    return userCount > 0;
  } catch {
    return false;
  }
};

export const checkDatabaseHealth = async (): Promise<{
  healthy: boolean;
  details: Record<string, number>;
}> => {
  const details: Record<string, number> = {};
  let healthy = true;

  try {
    for (const table of db.tables) {
      const count = await table.count();
      details[table.name] = count;
    }
  } catch (error) {
    healthy = false;
    console.error('Database health check failed:', error);
  }

  return { healthy, details };
};

export const getDatabaseStats = async (): Promise<{
  totalRecords: number;
  storageSize?: number;
  tables: { name: string; count: number }[];
}> => {
  const tables: { name: string; count: number }[] = [];
  let totalRecords = 0;

  for (const table of db.tables) {
    const count = await table.count();
    tables.push({ name: table.name, count });
    totalRecords += count;
  }

  return {
    totalRecords,
    tables,
  };
};
