
import type {
  EnergyReading,
  DeviceReading,
  Device,
  EnergySnapshot,
  LoadFeature,
  EnergySuggestion,
  SyncLog,
} from '@/lib/types/energy';
import { eventBus } from '@/lib/bus/eventBus';
import { dbService } from '@/lib/db/indexedDB';
import { dataCollector } from '@/lib/engine/dataCollector';
import { standbyTracker } from '@/lib/engine/standbyTracker';
import { loadRecognizer } from '@/lib/engine/loadRecognizer';
import { suggestionEngine } from '@/lib/engine/suggestionEngine';
import { initializeMockData } from '@/lib/utils/mockData';
import { throttle } from '@/lib/utils/formatters';

class EnergyStore {
  devices = $state<Device[]>([]);
  currentReading = $state<EnergyReading | null>(null);
  readingsHistory = $state<EnergyReading[]>([]);
  snapshots = $state<EnergySnapshot[]>([]);
  wastePoints = $state<LoadFeature[]>([]);
  suggestions = $state<EnergySuggestion[]>([]);
  syncLogs = $state<SyncLog[]>([]);
  currentRoute = $state<string>('/');
  isInitialized = $state(false);
  isLoading = $state(true);
  error = $state<string | null>(null);
  selectedDeviceId = $state<string | null>(null);
  engineStatus = $state<Record<string, string>>({});
  accumulatorData = $state<{
    totalConsumption: number;
    standbyConsumption: number;
    elapsedTime: number;
  } | null>(null);

  readonly latestSnapshot = $derived(() => 
    this.snapshots.length > 0 ? this.snapshots[0] : null
  );

  readonly totalPower = $derived(() => 
    this.currentReading?.totalPower ?? 0
  );

  readonly standbyPower = $derived(() => 
    this.currentReading?.standbyPower ?? 0
  );

  readonly activeDevicesCount = $derived(() => 
    this.currentReading?.devices.filter((d: DeviceReading) => d.isOn).length ?? 0
  );

  readonly standbyDevicesCount = $derived(() => 
    this.currentReading?.devices.filter((d: DeviceReading) => d.isStandby).length ?? 0
  );

  readonly todayConsumption = $derived(() => {
    if (!this.accumulatorData) return 0;
    return this.accumulatorData.totalConsumption;
  });

  readonly estimatedCost = $derived(() => {
    return this.todayConsumption() * 0.56 * 30;
  });

  readonly efficiencyScore = $derived(() => {
    if (this.latestSnapshot()) {
      return this.latestSnapshot()!.efficiencyScore;
    }
    const standbyRatio = this.standbyPower() / Math.max(this.totalPower(), 1);
    return Math.max(0, 100 - standbyRatio * 200);
  });

  readonly activeWasteCount = $derived(() => 
    this.wastePoints.filter((w: LoadFeature) => w.isWaste && !w.resolved).length
  );

  readonly highPrioritySuggestions = $derived(() => 
    this.suggestions.filter((s: EnergySuggestion) => s.priority === 'high' && !s.implemented)
  );

  readonly energyTrend = $derived(() => 
    this.readingsHistory.map((r: EnergyReading) => ({
      timestamp: r.timestamp,
      total: r.totalPower,
      standby: r.standbyPower,
    }))
  );

  private throttledUpdateReading = throttle((reading: EnergyReading) => {
    this.currentReading = reading;
    if (this.readingsHistory.length >= 100) {
      this.readingsHistory.shift();
    }
    this.readingsHistory.push(reading);
  }, 100);

  async init(): Promise<void> {
    try {
      this.isLoading = true;
      
      await dbService.init();
      
      const isInitialized = await dbService.getMetadata<boolean>('initialized');
      if (!isInitialized) {
        await initializeMockData();
      }

      this.devices = await dbService.getDevices();
      this.snapshots = await dbService.getSnapshots(24);
      this.wastePoints = await dbService.getLoadFeatures({ isWaste: true, limit: 20 });
      
      await dataCollector.init(this.devices);
      await standbyTracker.init(this.devices);
      await loadRecognizer.init(this.devices);
      await suggestionEngine.init();

      this.suggestions = suggestionEngine.getSuggestions({ implemented: false });
      this.setupEventListeners();

      this.isInitialized = true;
      this.isLoading = false;
    } catch (err) {
      this.error = err instanceof Error ? err.message : '初始化失败';
      this.isLoading = false;
      console.error('[EnergyStore] Initialization error:', err);
    }
  }

  private setupEventListeners(): void {
    eventBus.subscribe('energy:reading', (event) => {
      const reading = event.payload as EnergyReading;
      this.throttledUpdateReading(reading);
      this.accumulatorData = dataCollector.getAccumulatorData();
    });

    eventBus.subscribe('waste:detected', async () => {
      this.wastePoints = await dbService.getLoadFeatures({ isWaste: true, limit: 20 });
    });

    eventBus.subscribe('suggestion:generated', () => {
      this.suggestions = suggestionEngine.getSuggestions({ implemented: false });
    });

    eventBus.subscribe('snapshot:created', async () => {
      this.snapshots = await dbService.getSnapshots(24);
    });

    eventBus.subscribe('device:state-change', async () => {
      this.devices = await dbService.getDevices();
    });

    eventBus.subscribe('engine:status', (event) => {
      const payload = event.payload as { engine: string; status: string };
      this.engineStatus[payload.engine] = payload.status;
    });

    eventBus.subscribe('ui:navigate', (event) => {
      this.currentRoute = event.payload as string;
    });
  }

  toggleDevice(deviceId: string, isOn: boolean): void {
    dataCollector.toggleDevice(deviceId, isOn);
  }

  navigate(route: string): void {
    this.currentRoute = route;
    eventBus.send('ui:navigate', route, 'dashboard');
  }

  async implementSuggestion(id: string): Promise<void> {
    await suggestionEngine.implementSuggestion(id);
    this.suggestions = suggestionEngine.getSuggestions({ implemented: false });
  }

  async dismissSuggestion(id: string): Promise<void> {
    await suggestionEngine.dismissSuggestion(id);
    this.suggestions = suggestionEngine.getSuggestions({ implemented: false });
  }

  async resolveWastePoint(id: string): Promise<void> {
    await dbService.updateLoadFeature(id, { resolved: true });
    this.wastePoints = this.wastePoints.map((w: LoadFeature) => 
      w.id === id ? { ...w, resolved: true } : w
    );
  }

  async loadMoreSnapshots(limit: number = 24): Promise<void> {
    const existingCount = this.snapshots.length;
    const more = await dbService.getSnapshots(limit, existingCount);
    this.snapshots = [...this.snapshots, ...more];
  }

  async exportData(): Promise<string> {
    return dbService.exportData();
  }

  getDeviceById(deviceId: string): Device | undefined {
    return this.devices.find((d: Device) => d.id === deviceId);
  }

  getDeviceReading(deviceId: string): DeviceReading | undefined {
    return this.currentReading?.devices.find((d: DeviceReading) => d.deviceId === deviceId);
  }

  selectDevice(deviceId: string | null): void {
    this.selectedDeviceId = deviceId;
  }

  async resetAllData(): Promise<void> {
    dataCollector.destroy();
    standbyTracker.destroy();
    loadRecognizer.destroy();
    suggestionEngine.destroy();
    
    await dbService.clearAllData();
    await initializeMockData();
    
    this.devices = await dbService.getDevices();
    this.snapshots = await dbService.getSnapshots(24);
    this.wastePoints = await dbService.getLoadFeatures({ isWaste: true, limit: 20 });
    
    await dataCollector.init(this.devices);
    await standbyTracker.init(this.devices);
    await loadRecognizer.init(this.devices);
    await suggestionEngine.init();
  }

  destroy(): void {
    dataCollector.destroy();
    standbyTracker.destroy();
    loadRecognizer.destroy();
    suggestionEngine.destroy();
  }
}

export const energyStore = new EnergyStore();

export function useEnergyStore() {
  return energyStore;
}
