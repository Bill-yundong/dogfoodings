import { FaultType } from '../value-objects/FaultType';
import { SemanticLevel } from '../value-objects/SemanticLevel';

export type FaultSource = 'sensor' | 'maintenance' | 'operation_control' | 'manual';

export interface FaultSignal {
  readonly id: string;
  readonly faultType: FaultType;
  readonly source: FaultSource;
  readonly semanticLevel: SemanticLevel;
  readonly doorId: string;
  readonly description: string;
  readonly timestamp: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
}

export const createFaultSignal = (
  faultType: FaultType,
  source: FaultSource,
  semanticLevel: SemanticLevel,
  doorId: string,
  description: string
): FaultSignal => ({
  id: `fault-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  faultType,
  source,
  semanticLevel,
  doorId,
  description,
  timestamp: Date.now(),
  acknowledged: false
});

export const acknowledgeFault = (fault: FaultSignal): FaultSignal => ({
  ...fault,
  acknowledged: true,
  acknowledgedAt: Date.now()
});
