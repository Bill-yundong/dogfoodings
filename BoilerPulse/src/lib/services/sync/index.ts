import type { StandardizedData, OxygenData, EfficiencyData, FanControl, SyncStatus, DataSource } from '$lib/types';

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function standardizeOxygenData(data: OxygenData): StandardizedData {
  return {
    uuid: generateUUID(),
    semanticTag: 'boiler.oxygen.level',
    value: data.value,
    unit: '%',
    timestamp: data.timestamp,
    provenance: {
      source: data.source,
      originalId: `${data.deviceId}-${data.timestamp}`,
      receivedAt: Date.now()
    }
  };
}

export function standardizeEfficiencyData(data: EfficiencyData): StandardizedData {
  return {
    uuid: generateUUID(),
    semanticTag: 'boiler.efficiency.value',
    value: data.value,
    unit: '%',
    timestamp: data.timestamp,
    provenance: {
      source: 'DCS',
      originalId: `eff-${data.timestamp}`,
      receivedAt: Date.now()
    }
  };
}

export function standardizeFanControl(data: FanControl): StandardizedData[] {
  const now = Date.now();
  return [
    {
      uuid: generateUUID(),
      semanticTag: 'fan.forcedDraft.speed',
      value: data.forcedDraftSpeed,
      unit: '%',
      timestamp: data.timestamp,
      provenance: { source: 'FSSS', originalId: `fd-${data.timestamp}`, receivedAt: now }
    },
    {
      uuid: generateUUID(),
      semanticTag: 'fan.inducedDraft.speed',
      value: data.inducedDraftSpeed,
      unit: '%',
      timestamp: data.timestamp,
      provenance: { source: 'FSSS', originalId: `id-${data.timestamp}`, receivedAt: now }
    },
    {
      uuid: generateUUID(),
      semanticTag: 'fan.damper.opening',
      value: data.damperOpening,
      unit: '%',
      timestamp: data.timestamp,
      provenance: { source: 'FSSS', originalId: `damper-${data.timestamp}`, receivedAt: now }
    },
    {
      uuid: generateUUID(),
      semanticTag: 'boiler.oxygen.setpoint',
      value: data.oxygenSetpoint,
      unit: '%',
      timestamp: data.timestamp,
      provenance: { source: 'FSSS', originalId: `sp-${data.timestamp}`, receivedAt: now }
    }
  ];
}

export class SemanticSyncEngine {
  private syncStatus: Map<DataSource, SyncStatus> = new Map();
  private onDataCallback?: (data: StandardizedData[]) => void;

  constructor() {
    this.syncStatus.set('DCS', {
      source: 'DCS',
      lastSync: 0,
      status: 'offline',
      latency: 0,
      dataPoints: 0
    });
    this.syncStatus.set('FSSS', {
      source: 'FSSS',
      lastSync: 0,
      status: 'offline',
      latency: 0,
      dataPoints: 0
    });
  }

  setOnDataCallback(callback: (data: StandardizedData[]) => void): void {
    this.onDataCallback = callback;
  }

  processOxygenData(data: OxygenData): StandardizedData {
    const standardized = standardizeOxygenData(data);
    this.updateSyncStatus(data.source, standardized.timestamp);
    this.onDataCallback?.([standardized]);
    return standardized;
  }

  processEfficiencyData(data: EfficiencyData): StandardizedData {
    const standardized = standardizeEfficiencyData(data);
    this.updateSyncStatus('DCS', standardized.timestamp);
    this.onDataCallback?.([standardized]);
    return standardized;
  }

  processFanControl(data: FanControl): StandardizedData[] {
    const standardized = standardizeFanControl(data);
    this.updateSyncStatus('FSSS', data.timestamp);
    this.onDataCallback?.(standardized);
    return standardized;
  }

  private updateSyncStatus(source: DataSource, timestamp: number): void {
    const status = this.syncStatus.get(source);
    if (status) {
      const now = Date.now();
      status.lastSync = now;
      status.latency = now - timestamp;
      status.dataPoints++;
      status.status = 'running';
    }
  }

  getSyncStatus(source: DataSource): SyncStatus | undefined {
    return this.syncStatus.get(source);
  }

  getAllSyncStatus(): SyncStatus[] {
    return Array.from(this.syncStatus.values());
  }

  setSourceOffline(source: DataSource): void {
    const status = this.syncStatus.get(source);
    if (status) {
      status.status = 'offline';
    }
  }

  reset(): void {
    this.syncStatus.forEach((status) => {
      status.lastSync = 0;
      status.status = 'offline';
      status.latency = 0;
      status.dataPoints = 0;
    });
  }
}

export const syncEngine = new SemanticSyncEngine();
