import { FaultSignal } from '../entities/FaultSignal';
import { SemanticLevel } from '../value-objects/SemanticLevel';

export type ModuleType = 'maintenance' | 'operation_control';

export interface IFaultPublisher {
  onStatusChange(callback: () => void): () => void;
  subscribe(module: ModuleType, callback: (signal: FaultSignal) => void): () => void;
  publish(signal: FaultSignal): Promise<void>;
  isSynced(signalId: string, module: ModuleType): boolean;
  getSyncStatus(module: ModuleType): { total: number; synced: number; syncing: number; };
}
