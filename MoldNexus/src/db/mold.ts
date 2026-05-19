import { getDB } from './index';
import type { Mold } from '../types';

export async function createMold(mold: Omit<Mold, 'id' | 'createdAt' | 'updatedAt'>): Promise<Mold> {
  const db = getDB();
  const now = Date.now();
  const newMold: Mold = {
    ...mold,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('molds', newMold);
  return newMold;
}

export async function getMold(id: string): Promise<Mold | undefined> {
  const db = getDB();
  return db.get('molds', id);
}

export async function listMolds(): Promise<Mold[]> {
  const db = getDB();
  const molds = await db.getAll('molds');
  return molds.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateMold(id: string, updates: Partial<Mold>): Promise<void> {
  const db = getDB();
  const mold = await db.get('molds', id);
  if (mold) {
    const updated: Mold = {
      ...mold,
      ...updates,
      updatedAt: Date.now(),
    };
    await db.put('molds', updated);
  }
}

export async function deleteMold(id: string): Promise<void> {
  const db = getDB();
  await db.delete('molds', id);
}
