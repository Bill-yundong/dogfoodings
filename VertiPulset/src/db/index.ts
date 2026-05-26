import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type { BatterySnapshot, Flight, RunwayAllocation, ChargeSession, GridSignal } from '@/types';

interface VertiPulsetDB extends DBSchema {
  battery_snapshots: {
    key: string;
    value: BatterySnapshot;
    indexes: {
      'by-battery': string;
      'by-timestamp': Date;
      'by-flight': string;
      'by-soh': number;
    };
  };
  flights: {
    key: string;
    value: Flight;
    indexes: {
      'by-aircraft': string;
      'by-status': string;
      'by-departure': Date;
    };
  };
  runway_allocations: {
    key: string;
    value: RunwayAllocation;
    indexes: {
      'by-runway': string;
      'by-start-time': Date;
      'by-flight': string;
    };
  };
  charge_sessions: {
    key: string;
    value: ChargeSession;
    indexes: {
      'by-battery': string;
      'by-start-time': Date;
      'by-grid-signal': string;
    };
  };
  grid_signals: {
    key: string;
    value: GridSignal;
    indexes: {
      'by-timestamp': Date;
      'by-signal-type': string;
    };
  };
  system_logs: {
    key: string;
    value: {
      id: string;
      timestamp: Date;
      level: 'info' | 'warn' | 'error' | 'debug';
      module: string;
      message: string;
      data?: any;
    };
    indexes: {
      'by-timestamp': Date;
      'by-level': string;
      'by-module': string;
    };
  };
}

const DB_NAME = 'vertipulset_db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<VertiPulsetDB> | null = null;

export async function initDB(): Promise<IDBPDatabase<VertiPulsetDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<VertiPulsetDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('battery_snapshots')) {
        const batteryStore = db.createObjectStore('battery_snapshots', { keyPath: 'id' });
        batteryStore.createIndex('by-battery', 'batteryId');
        batteryStore.createIndex('by-timestamp', 'timestamp');
        batteryStore.createIndex('by-flight', 'flightId');
        batteryStore.createIndex('by-soh', 'soh');
      }

      if (!db.objectStoreNames.contains('flights')) {
        const flightStore = db.createObjectStore('flights', { keyPath: 'id' });
        flightStore.createIndex('by-aircraft', 'aircraftId');
        flightStore.createIndex('by-status', 'status');
        flightStore.createIndex('by-departure', 'scheduledDeparture');
      }

      if (!db.objectStoreNames.contains('runway_allocations')) {
        const allocStore = db.createObjectStore('runway_allocations', { keyPath: 'id' });
        allocStore.createIndex('by-runway', 'runwayId');
        allocStore.createIndex('by-start-time', 'startTime');
        allocStore.createIndex('by-flight', 'flightId');
      }

      if (!db.objectStoreNames.contains('charge_sessions')) {
        const chargeStore = db.createObjectStore('charge_sessions', { keyPath: 'id' });
        chargeStore.createIndex('by-battery', 'batteryId');
        chargeStore.createIndex('by-start-time', 'startTime');
        chargeStore.createIndex('by-grid-signal', 'gridSignalId');
      }

      if (!db.objectStoreNames.contains('grid_signals')) {
        const gridStore = db.createObjectStore('grid_signals', { keyPath: 'id' });
        gridStore.createIndex('by-timestamp', 'timestamp');
        gridStore.createIndex('by-signal-type', 'signalType');
      }

      if (!db.objectStoreNames.contains('system_logs')) {
        const logStore = db.createObjectStore('system_logs', { keyPath: 'id' });
        logStore.createIndex('by-timestamp', 'timestamp');
        logStore.createIndex('by-level', 'level');
        logStore.createIndex('by-module', 'module');
      }
    },
  });

  return dbInstance;
}

export async function getDB(): Promise<IDBPDatabase<VertiPulsetDB>> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['battery_snapshots', 'flights', 'runway_allocations', 'charge_sessions', 'grid_signals', 'system_logs'],
    'readwrite'
  );
  
  await Promise.all([
    tx.objectStore('battery_snapshots').clear(),
    tx.objectStore('flights').clear(),
    tx.objectStore('runway_allocations').clear(),
    tx.objectStore('charge_sessions').clear(),
    tx.objectStore('grid_signals').clear(),
    tx.objectStore('system_logs').clear(),
  ]);
  
  await tx.done;
}

export async function getDatabaseStats(): Promise<{
  batterySnapshots: number;
  flights: number;
  runwayAllocations: number;
  chargeSessions: number;
  gridSignals: number;
  systemLogs: number;
}> {
  const db = await getDB();
  
  const [
    batteryCount,
    flightCount,
    allocationCount,
    chargeCount,
    gridCount,
    logCount
  ] = await Promise.all([
    db.count('battery_snapshots'),
    db.count('flights'),
    db.count('runway_allocations'),
    db.count('charge_sessions'),
    db.count('grid_signals'),
    db.count('system_logs'),
  ]);

  return {
    batterySnapshots: batteryCount,
    flights: flightCount,
    runwayAllocations: allocationCount,
    chargeSessions: chargeCount,
    gridSignals: gridCount,
    systemLogs: logCount,
  };
}
