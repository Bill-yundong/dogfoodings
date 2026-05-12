import {
  Door,
  FaultSignal,
  CycleStats,
  ChainState,
  ModuleType
} from '../../domain';

export interface AppViewModel {
  doors: Door[];
  faults: FaultSignal[];
  cycleStats: CycleStats;
  chainStates: ChainState[];
  isSimulating: boolean;
  isDbReady: boolean;
  maintenanceSyncStatus: { total: number; synced: number; syncing: number };
  operationSyncStatus: { total: number; synced: number; syncing: number };
}

export const createInitialViewModel = (): AppViewModel => ({
  doors: [],
  faults: [],
  cycleStats: {
    totalCycles: 0,
    successfulCycles: 0,
    failedCycles: 0,
    avgDuration: 0,
    avgMotorCurrent: 0,
    obstacleRate: 0
  },
  chainStates: [],
  isSimulating: false,
  isDbReady: false,
  maintenanceSyncStatus: { total: 0, synced: 0, syncing: 0 },
  operationSyncStatus: { total: 0, synced: 0, syncing: 0 }
});

export const isFaultSynced = (
  faultId: string,
  module: ModuleType,
  checkFn: (id: string, mod: ModuleType) => boolean
): boolean => {
  return checkFn(faultId, module);
};
