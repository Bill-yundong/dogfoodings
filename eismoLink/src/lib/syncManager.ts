import { SeismicDataPoint, WavePrediction, BuildingSafetyStatus, SyncMessage, WaveformSlice } from '../types/seismic';
import { seismicDB } from './indexedDB';

class SyncManager {
  private channels: Map<string, BroadcastChannel> = new Map();
  private subscribers: Map<string, Set<(message: SyncMessage) => void>> = new Map();
  private buffer: Map<string, SyncMessage[]> = new Map();
  private flushInterval: number = 100;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.initChannels();
    this.startFlushLoop();
  }

  private initChannels(): void {
    const channelNames = ['seismic', 'prediction', 'alert', 'building'];
    channelNames.forEach(name => {
      const channel = new BroadcastChannel(`eismolink_${name}`);
      channel.onmessage = (event) => this.handleIncomingMessage(name, event.data);
      this.channels.set(name, channel);
      this.buffer.set(name, []);
      this.subscribers.set(name, new Set());
    });
  }

  private startFlushLoop(): void {
    this.intervalId = setInterval(() => this.flushBuffer(), this.flushInterval);
  }

  private handleIncomingMessage(channel: string, message: SyncMessage): void {
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      subscribers.forEach(callback => callback(message));
    }
  }

  private async flushBuffer(): Promise<void> {
    for (const [channel, messages] of this.buffer.entries()) {
      if (messages.length > 0) {
        const broadcastChannel = this.channels.get(channel);
        if (broadcastChannel) {
          messages.forEach(msg => broadcastChannel.postMessage(msg));
        }
        this.buffer.set(channel, []);
      }
    }
  }

  subscribe(channel: string, callback: (message: SyncMessage) => void): () => void {
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      subscribers.add(callback);
    }
    return () => subscribers?.delete(callback);
  }

  private queueMessage(channel: string, message: SyncMessage): void {
    const buffer = this.buffer.get(channel);
    if (buffer) {
      buffer.push(message);
    }
  }

  async broadcastSeismicData(stationId: string, data: SeismicDataPoint[]): Promise<void> {
    const message: SyncMessage = {
      type: 'seismic_data',
      payload: { stationId, data },
      timestamp: Date.now(),
      source: 'station_' + stationId
    };
    this.queueMessage('seismic', message);

    const slice: WaveformSlice = {
      id: `${stationId}_${Date.now()}`,
      stationId,
      startTime: data[0]?.timestamp || Date.now(),
      endTime: data[data.length - 1]?.timestamp || Date.now(),
      sampleRate: 100,
      data: data.map(d => d.magnitude),
      createdAt: Date.now()
    };
    await seismicDB.saveWaveformSlice(slice);
  }

  async broadcastPrediction(stationId: string, prediction: WavePrediction): Promise<void> {
    const message: SyncMessage = {
      type: 'prediction',
      payload: { stationId, prediction },
      timestamp: Date.now(),
      source: 'prediction_engine'
    };
    this.queueMessage('prediction', message);
  }

  async broadcastAlert(alert: { type: 'warning' | 'danger' | 'info'; message: string }): Promise<void> {
    const alertMessage = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alert,
      timestamp: Date.now()
    };

    const message: SyncMessage = {
      type: 'alert',
      payload: alertMessage,
      timestamp: Date.now(),
      source: 'monitoring_system'
    };
    this.queueMessage('alert', message);
    await seismicDB.saveAlert(alertMessage);
  }

  async broadcastBuildingStatus(status: BuildingSafetyStatus): Promise<void> {
    const message: SyncMessage = {
      type: 'status',
      payload: status,
      timestamp: Date.now(),
      source: 'building_' + status.buildingId
    };
    this.queueMessage('building', message);
    await seismicDB.saveBuildingStatus(status);
  }

  async syncBuildingStatus(status: BuildingSafetyStatus): Promise<void> {
    await seismicDB.saveBuildingStatus(status);
    await seismicDB.logSync({
      id: `sync_${Date.now()}`,
      type: 'building_status',
      success: true,
      timestamp: Date.now()
    });
  }

  getLatency(channel: string): number {
    const start = performance.now();
    const testChannel = this.channels.get(channel);
    if (testChannel) {
      testChannel.postMessage({ type: 'ping', timestamp: start });
    }
    return performance.now() - start;
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.channels.forEach(channel => channel.close());
    this.channels.clear();
    this.subscribers.clear();
    this.buffer.clear();
  }
}

export const syncManager = new SyncManager();
export default SyncManager;
