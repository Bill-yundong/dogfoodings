import { createStore, produce } from 'solid-js/store';
import { createEffect, onMount } from 'solid-js';
import { AppViewModel, createInitialViewModel } from '../viewmodels/AppViewModel';
import { appPresenter } from '../presenters/AppPresenter';
import { DoorState } from '../../domain';

export const [appState, setAppState] = createStore<AppViewModel>(createInitialViewModel());

export const actions = {
  async initialize(): Promise<void> {
    await appPresenter.initialize();
    this.refreshState();
  },

  refreshState(): void {
    setAppState({
      doors: appPresenter.getDoors(),
      faults: appPresenter.getFaults(),
      cycleStats: appPresenter.getCycleStats(),
      chainStates: appPresenter.getChainStates(),
      isSimulating: appPresenter.isSimulating(),
      isDbReady: appPresenter.getIsDbReady(),
      maintenanceSyncStatus: appPresenter.getMaintenanceSyncStatus(),
      operationSyncStatus: appPresenter.getOperationSyncStatus()
    });
  },

  updateDoorState(doorId: string, state: DoorState): void {
    appPresenter.updateDoorState(doorId, state);
    this.refreshState();
  },

  acknowledgeFault(faultId: string): void {
    appPresenter.acknowledgeFault(faultId);
    this.refreshState();
  },

  clearFaults(): void {
    appPresenter.clearFaults();
    this.refreshState();
  },

  startSimulation(): void {
    appPresenter.startSimulation();
    this.refreshState();
  },

  stopSimulation(): void {
    appPresenter.stopSimulation();
    this.refreshState();
  },

  toggleSimulation(): void {
    appPresenter.toggleSimulation();
    this.refreshState();
  },

  triggerFault(chainId: string, gateId: string): void {
    appPresenter.triggerFault(chainId, gateId);
    this.refreshState();
  },

  triggerRandomFault(): void {
    appPresenter.triggerRandomFault();
    this.refreshState();
  },

  resetAllChains(): void {
    appPresenter.resetAllChains();
    this.refreshState();
  },

  async refreshCycleStats(): Promise<void> {
    await appPresenter.refreshCycleStats();
    this.refreshState();
  },

  isFaultSynced(faultId: string, module: 'maintenance' | 'operation_control'): boolean {
    return appPresenter.isFaultSynced(faultId, module);
  },

  getDoorArray() {
    return appPresenter.getDoors();
  }
};
