import { TrafficIndex, SyncState, AlignmentMessage } from '../types/traffic';

export class TrafficAlignment {
  private syncState: SyncState;
  private messageQueue: AlignmentMessage[] = [];
  private syncIntervalId: NodeJS.Timeout | null = null;
  private onAlignmentUpdate: ((state: SyncState) => void) | null = null;

  constructor(initialSyncInterval: number = 2000) {
    this.syncState = {
      commandCenter: null,
      mobileDevice: null,
      lastSyncTime: 0,
      syncInterval: initialSyncInterval,
      isAligned: false,
    };
  }

  setAlignmentCallback(callback: ((state: SyncState) => void) | null): void {
    this.onAlignmentUpdate = callback;
  }

  updateCommandCenterIndex(index: TrafficIndex): void {
    this.syncState.commandCenter = index;
    this.checkAlignment();
  }

  updateMobileDeviceIndex(index: TrafficIndex): void {
    this.syncState.mobileDevice = index;
    this.checkAlignment();
  }

  private checkAlignment(): void {
    if (!this.syncState.commandCenter || !this.syncState.mobileDevice) {
      this.syncState.isAligned = false;
      return;
    }

    const tolerance = this.calculateTolerance();
    const overallDiff = Math.abs(
      this.syncState.commandCenter.overall - this.syncState.mobileDevice.overall
    );

    const hotspotsAligned = this.compareHotspots(
      this.syncState.commandCenter.hotspots,
      this.syncState.mobileDevice.hotspots,
      tolerance
    );

    this.syncState.isAligned = overallDiff <= tolerance && hotspotsAligned;
    this.syncState.lastSyncTime = Date.now();

    if (this.onAlignmentUpdate) {
      this.onAlignmentUpdate(this.syncState);
    }
  }

  private calculateTolerance(): number {
    const timeDiff = Math.abs(
      (this.syncState.commandCenter?.timestamp || 0) - 
      (this.syncState.mobileDevice?.timestamp || 0)
    );
    
    const maxAge = 30 * 1000;
    const ageFactor = Math.min(timeDiff / maxAge, 1);
    const baseTolerance = 5;
    
    return baseTolerance + ageFactor * 10;
  }

  private compareHotspots(
    h1: Array<{ x: number; y: number; level: number }>,
    h2: Array<{ x: number; y: number; level: number }>,
    tolerance: number
  ): boolean {
    if (h1.length !== h2.length) {
      const diffRatio = Math.abs(h1.length - h2.length) / Math.max(h1.length, h2.length);
      if (diffRatio > 0.3) {
        return false;
      }
    }

    const matchThreshold = Math.max(1, Math.floor(Math.min(h1.length, h2.length) * 0.7));
    let matches = 0;

    for (const hotspot1 of h1) {
      for (const hotspot2 of h2) {
        if (
          Math.abs(hotspot1.x - hotspot2.x) <= 2 &&
          Math.abs(hotspot1.y - hotspot2.y) <= 2 &&
          Math.abs(hotspot1.level - hotspot2.level) <= 1
        ) {
          matches++;
          break;
        }
      }
    }

    return matches >= matchThreshold;
  }

  createSyncMessage(
    source: 'command-center' | 'mobile',
    trafficIndex: TrafficIndex,
    type: 'request' | 'response' | 'update' = 'update'
  ): AlignmentMessage {
    return {
      type,
      trafficIndex,
      timestamp: Date.now(),
      source,
      syncId: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  async processMessage(message: AlignmentMessage): Promise<void> {
    this.messageQueue.push(message);

    switch (message.type) {
      case 'request':
        await this.handleSyncRequest(message);
        break;
      case 'response':
        await this.handleSyncResponse(message);
        break;
      case 'update':
        await this.handleSyncUpdate(message);
        break;
    }

    this.messageQueue = this.messageQueue.filter(m => m.syncId !== message.syncId);
  }

  private async handleSyncRequest(message: AlignmentMessage): Promise<void> {
    if (message.source === 'command-center') {
      this.updateMobileDeviceIndex(message.trafficIndex);
    } else {
      this.updateCommandCenterIndex(message.trafficIndex);
    }
  }

  private async handleSyncResponse(message: AlignmentMessage): Promise<void> {
    if (message.source === 'command-center') {
      this.updateMobileDeviceIndex(message.trafficIndex);
    } else {
      this.updateCommandCenterIndex(message.trafficIndex);
    }
  }

  private async handleSyncUpdate(message: AlignmentMessage): Promise<void> {
    if (message.source === 'command-center') {
      this.updateMobileDeviceIndex(message.trafficIndex);
    } else {
      this.updateCommandCenterIndex(message.trafficIndex);
    }
  }

  mergeTrafficIndices(
    index1: TrafficIndex,
    index2: TrafficIndex,
    weight1: number = 0.5,
    weight2: number = 0.5
  ): TrafficIndex {
    const mergedOverall = Math.round(
      index1.overall * weight1 + index2.overall * weight2
    );

    const gridData: number[][] = [];
    const maxRows = Math.max(index1.gridData.length, index2.gridData.length);
    
    for (let y = 0; y < maxRows; y++) {
      gridData[y] = [];
      const row1 = index1.gridData[y] || [];
      const row2 = index2.gridData[y] || [];
      const maxCols = Math.max(row1.length, row2.length);
      
      for (let x = 0; x < maxCols; x++) {
        const val1 = row1[x] ?? 0;
        const val2 = row2[x] ?? 0;
        gridData[y][x] = Math.round(val1 * weight1 + val2 * weight2);
      }
    }

    const allHotspots = [
      ...index1.hotspots.map(h => ({ ...h, source: 1 })),
      ...index2.hotspots.map(h => ({ ...h, source: 2 })),
    ];

    const mergedHotspots = this.deduplicateHotspots(allHotspots);

    return {
      timestamp: Date.now(),
      overall: mergedOverall,
      gridData,
      hotspots: mergedHotspots,
    };
  }

  private deduplicateHotspots(
    hotspots: Array<{ x: number; y: number; level: number; source?: number }>
  ): Array<{ x: number; y: number; level: number }> {
    const result: Array<{ x: number; y: number; level: number }> = [];
    const used = new Set<string>();

    for (const hotspot of hotspots) {
      const key = `${hotspot.x},${hotspot.y}`;
      
      if (used.has(key)) {
        continue;
      }

      let shouldAdd = true;
      
      for (let i = 0; i < result.length; i++) {
        const existing = result[i];
        const distance = Math.sqrt(
          Math.pow(hotspot.x - existing.x, 2) + 
          Math.pow(hotspot.y - existing.y, 2)
        );

        if (distance <= 2) {
          result[i].level = Math.max(existing.level, hotspot.level);
          shouldAdd = false;
          break;
        }
      }

      if (shouldAdd) {
        result.push({
          x: hotspot.x,
          y: hotspot.y,
          level: hotspot.level,
        });
      }

      used.add(key);
    }

    return result;
  }

  startAutoSync(
    getCommandCenterIndex: () => TrafficIndex | null,
    getMobileIndex: () => TrafficIndex | null
  ): void {
    if (this.syncIntervalId) {
      this.stopAutoSync();
    }

    this.syncIntervalId = setInterval(() => {
      const ccIndex = getCommandCenterIndex();
      const mobileIndex = getMobileIndex();

      if (ccIndex) {
        this.updateCommandCenterIndex(ccIndex);
      }
      if (mobileIndex) {
        this.updateMobileDeviceIndex(mobileIndex);
      }
    }, this.syncState.syncInterval);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  setSyncInterval(interval: number): void {
    this.syncState.syncInterval = interval;
  }

  reset(): void {
    this.stopAutoSync();
    this.syncState = {
      commandCenter: null,
      mobileDevice: null,
      lastSyncTime: 0,
      syncInterval: this.syncState.syncInterval,
      isAligned: false,
    };
    this.messageQueue = [];
  }
}

export const trafficAlignment = new TrafficAlignment();