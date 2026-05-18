import { IDBPDatabase } from 'idb';
import { DBSchema, STORES } from './schema';
import type { SensorData, BeltState, Alarm, WearRecord, FiberSensor } from '@/types';

export class DatabaseOperations {
  private db: IDBPDatabase<DBSchema>;

  constructor(db: IDBPDatabase<DBSchema>) {
    this.db = db;
  }

  async addSensorData(data: SensorData): Promise<void> {
    await this.db.add(STORES.SENSOR_DATA, data);
  }

  async addSensorDataBatch(data: SensorData[]): Promise<void> {
    const tx = this.db.transaction(STORES.SENSOR_DATA, 'readwrite');
    await Promise.all([...data.map((d) => tx.store.add(d)), tx.done]);
  }

  async getSensorDataByTimeRange(
    startTime: number,
    endTime: number,
    sensorId?: string
  ): Promise<SensorData[]> {
    const index = this.db
      .transaction(STORES.SENSOR_DATA, 'readonly')
      .store.index('timestamp');
    const range = IDBKeyRange.bound(startTime, endTime);
    const data = await index.getAll(range);
    if (sensorId) {
      return data.filter((d) => d.sensorId === sensorId);
    }
    return data;
  }

  async addBeltState(state: Omit<BeltState, 'id'> & { id?: string }): Promise<void> {
    const stateWithId = {
      ...state,
      id: state.id || `belt_${Date.now()}`,
      timestamp: Date.now(),
    };
    await this.db.add(STORES.BELT_STATES, stateWithId as any);
  }

  async getLatestBeltState(): Promise<(BeltState & { timestamp: number }) | null> {
    const index = this.db
      .transaction(STORES.BELT_STATES, 'readonly')
      .store.index('timestamp');
    const cursor = await index.openCursor(null, 'prev');
    return cursor ? (cursor.value as any) : null;
  }

  async addAlarm(alarm: Alarm): Promise<void> {
    await this.db.add(STORES.ALARMS, alarm);
  }

  async getAlarms(
    options: {
      limit?: number;
      resolved?: boolean;
      severity?: string;
    } = {}
  ): Promise<Alarm[]> {
    const { limit = 100, resolved, severity } = options;
    const store = this.db.transaction(STORES.ALARMS, 'readonly').store;
    const index = store.index('timestamp');
    let data = await index.getAll(null, limit);
    
    if (resolved !== undefined) {
      data = data.filter((d) => d.resolved === resolved);
    }
    if (severity) {
      data = data.filter((d) => d.severity === severity);
    }
    
    return data.sort((a, b) => b.timestamp - a.timestamp) as Alarm[];
  }

  async updateAlarm(id: string, updates: Partial<Alarm>): Promise<void> {
    const tx = this.db.transaction(STORES.ALARMS, 'readwrite');
    const alarm = await tx.store.get(id);
    if (alarm) {
      await tx.store.put({ ...alarm, ...updates } as any);
    }
    await tx.done;
  }

  async addWearRecord(record: WearRecord): Promise<void> {
    await this.db.add(STORES.WEAR_RECORDS, record);
  }

  async getWearRecords(
    beltId: string,
    startDate?: string,
    endDate?: string
  ): Promise<WearRecord[]> {
    const index = this.db
      .transaction(STORES.WEAR_RECORDS, 'readonly')
      .store.index('date');
    let data = await index.getAll();
    data = data.filter((d) => d.beltId === beltId);
    if (startDate) {
      data = data.filter((d) => d.date >= startDate);
    }
    if (endDate) {
      data = data.filter((d) => d.date <= endDate);
    }
    return data as WearRecord[];
  }

  async addSensor(sensor: FiberSensor): Promise<void> {
    await this.db.add(STORES.SENSORS, sensor);
  }

  async getSensors(): Promise<FiberSensor[]> {
    const data = await this.db.getAll(STORES.SENSORS);
    return data.sort((a, b) => a.position - b.position) as FiberSensor[];
  }

  async updateSensor(id: string, updates: Partial<FiberSensor>): Promise<void> {
    const tx = this.db.transaction(STORES.SENSORS, 'readwrite');
    const sensor = await tx.store.get(id);
    if (sensor) {
      await tx.store.put({ ...sensor, ...updates } as any);
    }
    await tx.done;
  }

  async getSetting<T = any>(key: string): Promise<T | undefined> {
    const record = await this.db.get(STORES.SETTINGS, key);
    return record?.value as T;
  }

  async setSetting(key: string, value: any): Promise<void> {
    await this.db.put(STORES.SETTINGS, { key, value });
  }

  async clearOldSensorData(beforeTimestamp: number): Promise<number> {
    const tx = this.db.transaction(STORES.SENSOR_DATA, 'readwrite');
    const index = tx.store.index('timestamp');
    const range = IDBKeyRange.upperBound(beforeTimestamp);
    const keys = await index.getAllKeys(range);
    await Promise.all([...keys.map((k) => tx.store.delete(k)), tx.done]);
    return keys.length;
  }
}
