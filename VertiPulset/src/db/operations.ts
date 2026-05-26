import { getDB } from './index';
import type { BatterySnapshot, Flight, RunwayAllocation, ChargeSession, GridSignal } from '@/types';

export const dbOperations = {
  async addBatterySnapshot(snapshot: BatterySnapshot): Promise<void> {
    const db = await getDB();
    await db.add('battery_snapshots', snapshot);
  },

  async addBatterySnapshotsBulk(snapshots: BatterySnapshot[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('battery_snapshots', 'readwrite');
    await Promise.all(snapshots.map(s => tx.store.add(s)));
    await tx.done;
  },

  async getBatterySnapshotsByBattery(
    batteryId: string,
    limit: number = 1000,
    offset: number = 0
  ): Promise<BatterySnapshot[]> {
    const db = await getDB();
    const index = db.transaction('battery_snapshots').store.index('by-battery');
    const result: BatterySnapshot[] = [];
    let count = 0;
    
    for await (const cursor of index.iterate(batteryId, 'prev')) {
      if (count >= offset && count < offset + limit) {
        result.push(cursor.value);
      }
      count++;
      if (count >= offset + limit) break;
    }
    
    return result;
  },

  async getBatterySnapshotsByTimeRange(
    startTime: Date,
    endTime: Date,
    limit: number = 10000
  ): Promise<BatterySnapshot[]> {
    const db = await getDB();
    const index = db.transaction('battery_snapshots').store.index('by-timestamp');
    const range = IDBKeyRange.bound(startTime, endTime);
    const result: BatterySnapshot[] = [];
    
    for await (const cursor of index.iterate(range)) {
      result.push(cursor.value);
      if (result.length >= limit) break;
    }
    
    return result;
  },

  async getBatterySnapshotsBySOHRange(
    minSOH: number,
    maxSOH: number,
    limit: number = 1000
  ): Promise<BatterySnapshot[]> {
    const db = await getDB();
    const index = db.transaction('battery_snapshots').store.index('by-soh');
    const range = IDBKeyRange.bound(minSOH, maxSOH);
    const result: BatterySnapshot[] = [];
    
    for await (const cursor of index.iterate(range, 'prev')) {
      result.push(cursor.value);
      if (result.length >= limit) break;
    }
    
    return result;
  },

  async addFlight(flight: Flight): Promise<void> {
    const db = await getDB();
    await db.put('flights', flight);
  },

  async addFlightsBulk(flights: Flight[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('flights', 'readwrite');
    await Promise.all(flights.map(f => tx.store.put(f)));
    await tx.done;
  },

  async getFlightsByStatus(status: string, limit: number = 100): Promise<Flight[]> {
    const db = await getDB();
    const index = db.transaction('flights').store.index('by-status');
    const result: Flight[] = [];
    
    for await (const cursor of index.iterate(status)) {
      result.push(cursor.value);
      if (result.length >= limit) break;
    }
    
    return result;
  },

  async getUpcomingFlights(hours: number = 24): Promise<Flight[]> {
    const db = await getDB();
    const now = new Date();
    const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const index = db.transaction('flights').store.index('by-departure');
    const range = IDBKeyRange.bound(now, endTime);
    const result: Flight[] = [];
    
    for await (const cursor of index.iterate(range)) {
      result.push(cursor.value);
    }
    
    return result;
  },

  async addRunwayAllocation(allocation: RunwayAllocation): Promise<void> {
    const db = await getDB();
    await db.put('runway_allocations', allocation);
  },

  async addRunwayAllocationsBulk(allocations: RunwayAllocation[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('runway_allocations', 'readwrite');
    await Promise.all(allocations.map(a => tx.store.put(a)));
    await tx.done;
  },

  async getRunwayAllocations(
    runwayId: string,
    startTime: Date,
    endTime: Date
  ): Promise<RunwayAllocation[]> {
    const db = await getDB();
    const index = db.transaction('runway_allocations').store.index('by-runway');
    const result: RunwayAllocation[] = [];
    
    for await (const cursor of index.iterate(runwayId)) {
      if (cursor.value.startTime >= startTime && cursor.value.endTime <= endTime) {
        result.push(cursor.value);
      }
    }
    
    return result.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  },

  async addChargeSession(session: ChargeSession): Promise<void> {
    const db = await getDB();
    await db.put('charge_sessions', session);
  },

  async addChargeSessionsBulk(sessions: ChargeSession[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('charge_sessions', 'readwrite');
    await Promise.all(sessions.map(s => tx.store.put(s)));
    await tx.done;
  },

  async getChargeSessionsByBattery(
    batteryId: string,
    limit: number = 100
  ): Promise<ChargeSession[]> {
    const db = await getDB();
    const index = db.transaction('charge_sessions').store.index('by-battery');
    const result: ChargeSession[] = [];
    
    for await (const cursor of index.iterate(batteryId, 'prev')) {
      result.push(cursor.value);
      if (result.length >= limit) break;
    }
    
    return result;
  },

  async addGridSignal(signal: GridSignal): Promise<void> {
    const db = await getDB();
    await db.add('grid_signals', signal);
  },

  async addGridSignalsBulk(signals: GridSignal[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('grid_signals', 'readwrite');
    await Promise.all(signals.map(s => tx.store.add(s)));
    await tx.done;
  },

  async getGridSignals(hours: number = 24): Promise<GridSignal[]> {
    const db = await getDB();
    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const index = db.transaction('grid_signals').store.index('by-timestamp');
    const range = IDBKeyRange.lowerBound(startTime);
    const result: GridSignal[] = [];
    
    for await (const cursor of index.iterate(range)) {
      result.push(cursor.value);
    }
    
    return result;
  },

  async addSystemLog(
    level: 'info' | 'warn' | 'error' | 'debug',
    module: string,
    message: string,
    data?: any
  ): Promise<void> {
    const db = await getDB();
    await db.add('system_logs', {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      module,
      message,
      data
    });
  },

  async getSystemLogs(
    level?: string,
    limit: number = 100
  ): Promise<Array<{
    id: string;
    timestamp: Date;
    level: string;
    module: string;
    message: string;
    data?: any;
  }>> {
    const db = await getDB();
    const store = db.transaction('system_logs').store;
    const index = level ? store.index('by-level') : store;
    const query = level || null;
    const result: any[] = [];
    
    for await (const cursor of index.iterate(query, 'prev')) {
      result.push(cursor.value);
      if (result.length >= limit) break;
    }
    
    return result;
  }
};
