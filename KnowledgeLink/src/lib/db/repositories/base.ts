import { getDb } from '../index';

type StoreNames = 'books' | 'readingProgress' | 'notes' | 'knowledgeNodes' | 'knowledgeEdges' | 'reviewCards' | 'reviewLogs' | 'searchIndex' | 'syncEvents';

export class BaseRepository<T> {
  constructor(private storeName: StoreNames) {}

  async getAll(): Promise<T[]> {
    const db = await getDb();
    return db.getAll(this.storeName) as Promise<T[]>;
  }

  async getById(id: string): Promise<T | undefined> {
    const db = await getDb();
    return db.get(this.storeName, id) as Promise<T | undefined>;
  }

  async add(item: T): Promise<string> {
    const db = await getDb();
    return db.add(this.storeName, item as any) as Promise<string>;
  }

  async put(item: T): Promise<string> {
    const db = await getDb();
    return db.put(this.storeName, item as any) as Promise<string>;
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(this.storeName, id);
  }

  async count(): Promise<number> {
    const db = await getDb();
    return db.count(this.storeName);
  }
}
