import type { SemanticParameter, OperationParameters } from '$lib/types';

export class SemanticSynchronizer {
  private parameters: Map<string, SemanticParameter> = new Map();
  private syncCallbacks: Array<(params: SemanticParameter[]) => void> = [];

  constructor() {
    this.initializeDefaultParameters();
  }

  private initializeDefaultParameters(): void {
    const defaultParams: SemanticParameter[] = [
      {
        id: 'pump-power',
        name: 'Pump Power',
        engineeringValue: 75,
        engineeringUnit: 'kW',
        environmentalValue: 75,
        environmentalUnit: 'Environmental Impact Score',
        isSynced: true,
        lastSyncTime: Date.now(),
        stakeholder: 'both'
      },
      {
        id: 'mining-depth',
        name: 'Mining Depth',
        engineeringValue: 4000,
        engineeringUnit: 'm',
        environmentalValue: 4000,
        environmentalUnit: 'Depth Class',
        isSynced: true,
        lastSyncTime: Date.now(),
        stakeholder: 'both'
      },
      {
        id: 'sediment-rate',
        name: 'Sediment Release Rate',
        engineeringValue: 10,
        engineeringUnit: 'kg/s',
        environmentalValue: 10,
        environmentalUnit: 'Suspended Sediment Concentration',
        isSynced: true,
        lastSyncTime: Date.now(),
        stakeholder: 'both'
      },
      {
        id: 'current-speed',
        name: 'Current Speed',
        engineeringValue: 0.5,
        engineeringUnit: 'm/s',
        environmentalValue: 0.5,
        environmentalUnit: 'Dispersion Rate Factor',
        isSynced: true,
        lastSyncTime: Date.now(),
        stakeholder: 'both'
      },
      {
        id: 'env-threshold',
        name: 'Environmental Threshold',
        engineeringValue: 0.5,
        engineeringUnit: 'kg/m³',
        environmentalValue: 0.5,
        environmentalUnit: 'Ecological Safety Level',
        isSynced: true,
        lastSyncTime: Date.now(),
        stakeholder: 'both'
      }
    ];

    defaultParams.forEach(param => this.parameters.set(param.id, param));
  }

  setEngineeringValue(paramId: string, value: number): void {
    const param = this.parameters.get(paramId);
    if (!param) return;

    param.engineeringValue = value;
    param.lastSyncTime = Date.now();
    
    const convertedValue = this.convertEngineeringToEnvironmental(paramId, value);
    param.environmentalValue = convertedValue;
    param.isSynced = true;

    this.notifySync();
  }

  setEnvironmentalValue(paramId: string, value: number): void {
    const param = this.parameters.get(paramId);
    if (!param) return;

    param.environmentalValue = value;
    param.lastSyncTime = Date.now();
    
    const convertedValue = this.convertEnvironmentalToEngineering(paramId, value);
    param.engineeringValue = convertedValue;
    param.isSynced = true;

    this.notifySync();
  }

  private convertEngineeringToEnvironmental(paramId: string, value: number): number {
    switch (paramId) {
      case 'pump-power':
        return value * 1.2;
      case 'mining-depth':
        return value > 3000 ? value / 1000 : value / 500;
      case 'sediment-rate':
        return value * 0.8;
      case 'current-speed':
        return value * 2;
      case 'env-threshold':
        return value * 100;
      default:
        return value;
    }
  }

  private convertEnvironmentalToEngineering(paramId: string, value: number): number {
    switch (paramId) {
      case 'pump-power':
        return value / 1.2;
      case 'mining-depth':
        return value * 1000;
      case 'sediment-rate':
        return value / 0.8;
      case 'current-speed':
        return value / 2;
      case 'env-threshold':
        return value / 100;
      default:
        return value;
    }
  }

  getParameter(paramId: string): SemanticParameter | undefined {
    return this.parameters.get(paramId);
  }

  getAllParameters(): SemanticParameter[] {
    return Array.from(this.parameters.values());
  }

  getEngineeringParameters(): OperationParameters {
    return {
      pumpPower: this.parameters.get('pump-power')?.engineeringValue || 75,
      miningDepth: this.parameters.get('mining-depth')?.engineeringValue || 4000,
      sedimentReleaseRate: this.parameters.get('sediment-rate')?.engineeringValue || 10,
      currentSpeed: this.parameters.get('current-speed')?.engineeringValue || 0.5,
      environmentalThreshold: this.parameters.get('env-threshold')?.engineeringValue || 0.5
    };
  }

  validateSync(paramId: string): boolean {
    const param = this.parameters.get(paramId);
    if (!param) return false;

    const expectedEnvValue = this.convertEngineeringToEnvironmental(paramId, param.engineeringValue);
    const tolerance = 0.01;
    
    return Math.abs(param.environmentalValue - expectedEnvValue) < tolerance;
  }

  validateAllSync(): { [key: string]: boolean } {
    const results: { [key: string]: boolean } = {};
    this.parameters.forEach((param, id) => {
      results[id] = this.validateSync(id);
    });
    return results;
  }

  forceSync(paramId: string): void {
    const param = this.parameters.get(paramId);
    if (!param) return;

    const convertedValue = this.convertEngineeringToEnvironmental(paramId, param.engineeringValue);
    param.environmentalValue = convertedValue;
    param.isSynced = true;
    param.lastSyncTime = Date.now();

    this.notifySync();
  }

  forceSyncAll(): void {
    this.parameters.forEach((_, id) => this.forceSync(id));
  }

  onSync(callback: (params: SemanticParameter[]) => void): void {
    this.syncCallbacks.push(callback);
  }

  private notifySync(): void {
    const params = this.getAllParameters();
    this.syncCallbacks.forEach(callback => callback(params));
  }

  getStakeholderParameters(stakeholder: 'engineering' | 'environmental' | 'both'): SemanticParameter[] {
    return this.getAllParameters().filter(p => p.stakeholder === stakeholder);
  }

  getSyncStatus(): { total: number; synced: number; unsynced: number } {
    const params = this.getAllParameters();
    const synced = params.filter(p => p.isSynced).length;
    
    return {
      total: params.length,
      synced,
      unsynced: params.length - synced
    };
  }

  reset(): void {
    this.parameters.clear();
    this.initializeDefaultParameters();
    this.notifySync();
  }

  exportSemanticMapping(): any {
    const mapping: any = {};
    this.parameters.forEach((param, id) => {
      mapping[id] = {
        name: param.name,
        engineering: { unit: param.engineeringUnit },
        environmental: { unit: param.environmentalUnit },
        stakeholder: param.stakeholder
      };
    });
    return mapping;
  }
}
