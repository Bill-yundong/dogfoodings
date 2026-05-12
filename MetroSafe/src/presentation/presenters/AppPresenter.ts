import {
  Door,
  FaultSignal,
  CycleStats,
  ChainState,
  DoorState,
  ModuleType,
  FaultType,
  SemanticLevel
} from '../../domain';

import {
  InitializeSystemUseCase,
  UpdateDoorStateUseCase,
  AddFaultSignalUseCase,
  AcknowledgeFaultUseCase,
  GetCycleStatsUseCase,
  FaultChainSimulator,
  SemanticSynchronizer
} from '../../application';

import { cycleRepository } from '../../infrastructure';

export class AppPresenter {
  private initializeUseCase: InitializeSystemUseCase;
  private updateDoorStateUseCase: UpdateDoorStateUseCase;
  private addFaultSignalUseCase: AddFaultSignalUseCase;
  private acknowledgeFaultUseCase: AcknowledgeFaultUseCase;
  private getCycleStatsUseCase: GetCycleStatsUseCase;
  private faultChainSimulator: FaultChainSimulator;
  private semanticSynchronizer: SemanticSynchronizer;

  private stateChangeCallback: (() => void) | null = null;

  private doors: Door[] = [];
  private faults: FaultSignal[] = [];
  private cycleStats: CycleStats = {
    totalCycles: 0,
    successfulCycles: 0,
    failedCycles: 0,
    avgDuration: 0,
    avgMotorCurrent: 0,
    obstacleRate: 0
  };
  private isDbReady: boolean = false;

  constructor() {
    this.initializeUseCase = new InitializeSystemUseCase(cycleRepository);
    this.updateDoorStateUseCase = new UpdateDoorStateUseCase();
    this.semanticSynchronizer = new SemanticSynchronizer();
    this.addFaultSignalUseCase = new AddFaultSignalUseCase(this.semanticSynchronizer);
    this.acknowledgeFaultUseCase = new AcknowledgeFaultUseCase();
    this.getCycleStatsUseCase = new GetCycleStatsUseCase(cycleRepository);
    this.faultChainSimulator = new FaultChainSimulator();

    this.faultChainSimulator.setFaultCallback(async (fault) => {
      await this.addFault(
        fault.faultType,
        fault.semanticLevel,
        fault.doorId,
        fault.description
      );
    });

    this.semanticSynchronizer.onStatusChange(() => {
      this.notifyStateChange();
    });
  }

  onStateChange(callback: () => void): () => void {
    this.stateChangeCallback = callback;
    return () => {
      this.stateChangeCallback = null;
    };
  }

  private notifyStateChange(): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback();
    }
  }

  async initialize(): Promise<void> {
    const result = await this.initializeUseCase.execute();
    this.doors = result.doors;
    this.isDbReady = result.isDbReady;

    if (this.isDbReady) {
      this.cycleStats = await this.getCycleStatsUseCase.execute();
    }

    this.notifyStateChange();
  }

  updateDoorState(doorId: string, state: DoorState): void {
    this.doors = this.updateDoorStateUseCase.execute(this.doors, doorId, state);
    this.notifyStateChange();
  }

  private async addFault(
    faultType: FaultType,
    semanticLevel: SemanticLevel,
    doorId: string,
    description: string
  ): Promise<void> {
    const fault = await this.addFaultSignalUseCase.execute({
      faultType,
      source: 'sensor',
      semanticLevel,
      doorId,
      description
    });
    this.faults = [fault, ...this.faults].slice(0, 50);
    this.notifyStateChange();
  }

  acknowledgeFault(faultId: string): void {
    this.faults = this.acknowledgeFaultUseCase.execute(this.faults, faultId);
    this.notifyStateChange();
  }

  clearFaults(): void {
    this.faults = [];
    this.notifyStateChange();
  }

  startSimulation(): void {
    this.faultChainSimulator.startSimulation();
    this.notifyStateChange();
  }

  stopSimulation(): void {
    this.faultChainSimulator.stopSimulation();
    this.notifyStateChange();
  }

  toggleSimulation(): void {
    if (this.faultChainSimulator.isSimulating()) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  triggerFault(chainId: string, gateId: string): void {
    this.faultChainSimulator.triggerFault(chainId, gateId);
    this.notifyStateChange();
  }

  triggerRandomFault(): void {
    this.faultChainSimulator.triggerRandomFault();
    this.notifyStateChange();
  }

  resetAllChains(): void {
    this.faultChainSimulator.resetAll();
    this.notifyStateChange();
  }

  async refreshCycleStats(): Promise<void> {
    if (this.isDbReady) {
      this.cycleStats = await this.getCycleStatsUseCase.execute();
      this.notifyStateChange();
    }
  }

  getDoors(): Door[] {
    return [...this.doors];
  }

  getFaults(): FaultSignal[] {
    return [...this.faults];
  }

  getCycleStats(): CycleStats {
    return { ...this.cycleStats };
  }

  getChainStates(): ChainState[] {
    return this.faultChainSimulator.getAllChainStates();
  }

  isSimulating(): boolean {
    return this.faultChainSimulator.isSimulating();
  }

  getIsDbReady(): boolean {
    return this.isDbReady;
  }

  isFaultSynced(faultId: string, module: ModuleType): boolean {
    return this.semanticSynchronizer.isSynced(faultId, module);
  }

  getMaintenanceSyncStatus() {
    return this.semanticSynchronizer.getSyncStatus('maintenance');
  }

  getOperationSyncStatus() {
    return this.semanticSynchronizer.getSyncStatus('operation_control');
  }
}

export const appPresenter = new AppPresenter();
