export const DATABASE_CONFIG = {
  name: 'MetroSafeCycleDB',
  version: 1,
  stores: {
    cycles: {
      name: 'cycles',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'doorId', unique: false },
        { name: 'cycleNumber', unique: false },
        { name: 'startTime', unique: false },
        { name: 'success', unique: false },
        { name: 'faultType', unique: false }
      ]
    }
  }
} as const;

export const MAX_CYCLE_HISTORY = 10000;
export const MAX_FAULT_SIGNALS = 100;
