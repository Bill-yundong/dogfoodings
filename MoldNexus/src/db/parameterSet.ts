import { getDB } from './index';
import type { ParameterSet } from '../types';

export async function createParameterSet(params: Omit<ParameterSet, 'id' | 'createdAt'>): Promise<ParameterSet> {
  const db = getDB();
  const newParams: ParameterSet = {
    ...params,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  await db.add('parameter_sets', newParams);
  return newParams;
}

export async function getParameterSet(id: string): Promise<ParameterSet | undefined> {
  const db = getDB();
  return db.get('parameter_sets', id);
}

export async function listParameterSets(simulationId: string): Promise<ParameterSet[]> {
  const db = getDB();
  const params = await db.getAllFromIndex('parameter_sets', 'by-simulationId', simulationId);
  return params.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateParameterSet(id: string, updates: Partial<ParameterSet>): Promise<void> {
  const db = getDB();
  const params = await db.get('parameter_sets', id);
  if (params) {
    await db.put('parameter_sets', { ...params, ...updates });
  }
}

export async function getLatestParameterSet(simulationId: string): Promise<ParameterSet | undefined> {
  const db = getDB();
  const params = await db.getAllFromIndex('parameter_sets', 'by-simulationId', simulationId);
  if (params.length === 0) return undefined;
  return params.reduce((latest, current) =>
    current.createdAt > latest.createdAt ? current : latest
  );
}
