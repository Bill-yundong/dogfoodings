import { getDB } from './index';
import type { Simulation } from '../types';

type SimulationStatus = Simulation['status'];

export async function createSimulation(simulation: Omit<Simulation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Simulation> {
  const db = getDB();
  const now = Date.now();
  const newSimulation: Simulation = {
    ...simulation,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('simulations', newSimulation);
  return newSimulation;
}

export async function getSimulation(id: string): Promise<Simulation | undefined> {
  const db = getDB();
  return db.get('simulations', id);
}

export async function updateSimulation(id: string, updates: Partial<Simulation>): Promise<void> {
  const db = getDB();
  const simulation = await db.get('simulations', id);
  if (simulation) {
    const updated: Simulation = {
      ...simulation,
      ...updates,
      updatedAt: Date.now(),
    };
    await db.put('simulations', updated);
  }
}

export async function deleteSimulation(id: string): Promise<void> {
  const db = getDB();
  await db.delete('simulations', id);
}

export async function listSimulations(options?: {
  userId?: string;
  status?: SimulationStatus;
  moldId?: string;
  limit?: number;
  offset?: number;
}): Promise<Simulation[]> {
  const db = getDB();
  let simulations: Simulation[];

  if (options?.userId) {
    simulations = await db.getAllFromIndex('simulations', 'by-userId', options.userId);
  } else if (options?.status) {
    simulations = await db.getAllFromIndex('simulations', 'by-status', options.status);
  } else if (options?.moldId) {
    simulations = await db.getAllFromIndex('simulations', 'by-moldId', options.moldId);
  } else {
    simulations = await db.getAll('simulations');
  }

  simulations.sort((a, b) => b.createdAt - a.createdAt);

  if (options?.offset) {
    simulations = simulations.slice(options.offset);
  }
  if (options?.limit) {
    simulations = simulations.slice(0, options.limit);
  }

  return simulations;
}

export async function countSimulations(): Promise<number> {
  const db = getDB();
  return db.count('simulations');
}
