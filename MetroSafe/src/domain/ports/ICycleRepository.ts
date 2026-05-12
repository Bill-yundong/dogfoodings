import { CycleData, CycleStats } from '../entities/Cycle';

export interface ICycleRepository {
  init(): Promise<void>;
  isReady(): boolean;
  addCycle(cycle: Omit<CycleData, 'id'>): Promise<number>;
  addCycles(cycles: Array<Omit<CycleData, 'id'>>): Promise<void>;
  getCycle(id: number): Promise<CycleData | null>;
  getCyclesByDoorId(doorId: string, limit?: number): Promise<CycleData[]>;
  getRecentCycles(limit?: number): Promise<CycleData[]>;
  getFailedCycles(limit?: number): Promise<CycleData[]>;
  getStats(): Promise<CycleStats>;
  deleteCycle(id: number): Promise<void>;
  clearAll(): Promise<void>;
  generateSampleData(count?: number): Promise<void>;
}
