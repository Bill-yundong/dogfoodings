import { HeatLoadDistribution, Rack, PrecisionAC, PowerSnapshot } from '../types/datacenter';
import { calculatePUE } from '../utils/pueCalculator';

export type SyncMessage = {
  type: 'heat_load_update' | 'ac_control' | 'risk_alert' | 'snapshot_request';
  payload: unknown;
  timestamp: number;
};

export class HeatLoadSyncManager {
  private listeners: Map<string, ((data: unknown) => void)[]> = new Map();
  private isConnected: boolean = false;
  private simulationInterval: NodeJS.Timeout | null = null;
  private lastDistribution: HeatLoadDistribution | null = null;

  constructor() {
    this.connect();
  }

  connect(): void {
    this.isConnected = true;
    this.emit('connection', { status: 'connected' });
  }

  disconnect(): void {
    this.isConnected = false;
    this.stopSimulation();
    this.emit('connection', { status: 'disconnected' });
  }

  on<T>(event: string, callback: (data: T) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback as (data: unknown) => void);
  }

  off(event: string, callback: (data: unknown) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  startRealTimeSimulation(racks: Rack[], acs: PrecisionAC[]): void {
    this.stopSimulation();
    
    this.simulationInterval = setInterval(() => {
      const distribution = this.generateHeatLoadDistribution(racks);
      this.lastDistribution = distribution;
      this.emit('heat_load_update', distribution);

      racks.forEach(rack => {
        rack.servers.forEach(server => {
          server.cpuUtilization = Math.max(10, Math.min(95, server.cpuUtilization + (Math.random() - 0.5) * 10));
          server.powerConsumption = 200 + server.cpuUtilization * 6;
          server.outletTemperature = 32 + server.cpuUtilization * 0.2 + Math.random() * 2;
        });
        rack.currentPower = rack.servers.reduce((sum, s) => sum + s.powerConsumption, 0);
        rack.outletTemperature = rack.servers.reduce((sum, s) => sum + s.outletTemperature, 0) / rack.servers.length;
      });

      acs.forEach(ac => {
        const heatLoad = racks.reduce((sum, r) => sum + r.currentPower, 0);
        ac.currentCooling = heatLoad * 0.4 + Math.random() * 2000;
        ac.returnTemperature = 26 + Math.random() * 4;
      });

    }, 2000);
  }

  stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  private generateHeatLoadDistribution(racks: Rack[]): HeatLoadDistribution {
    const rackHeatLoads = racks.map(rack => ({
      rackId: rack.id,
      heatLoad: rack.currentPower,
      temperature: rack.outletTemperature
    }));

    return {
      timestamp: Date.now(),
      racks: rackHeatLoads,
      totalHeatLoad: rackHeatLoads.reduce((sum, r) => sum + r.heatLoad, 0),
      maxTemperature: Math.max(...rackHeatLoads.map(r => r.temperature)),
      minTemperature: Math.min(...rackHeatLoads.map(r => r.temperature))
    };
  }

  generatePowerSnapshot(racks: Rack[], acs: PrecisionAC[]): PowerSnapshot {
    const totalITPower = racks.reduce((sum, r) => sum + r.currentPower, 0);
    const totalCoolingPower = acs.reduce((sum, a) => sum + a.currentCooling, 0);

    return {
      id: `snapshot-${Date.now()}`,
      timestamp: Date.now(),
      totalITPower,
      totalCoolingPower,
      totalPower: totalITPower + totalCoolingPower,
      pue: calculatePUE(totalITPower, totalCoolingPower),
      rackPowers: racks.map(r => ({ rackId: r.id, power: r.currentPower })),
      acPowers: acs.map(a => ({ acId: a.id, power: a.currentCooling }))
    };
  }

  sendACControlCommand(acId: string, command: { setPoint?: number; fanSpeed?: number }): void {
    if (!this.isConnected) return;
    
    this.emit('ac_control', {
      acId,
      command,
      timestamp: Date.now()
    });
  }

  getLastDistribution(): HeatLoadDistribution | null {
    return this.lastDistribution;
  }

  isSyncConnected(): boolean {
    return this.isConnected;
  }
}

export const heatLoadSyncManager = new HeatLoadSyncManager();
