import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Ship, Anchorage, TidalRecord, AnchorStatus, SemanticSyncMessage } from '../types';

export class SafeHarborDB extends Dexie {
  ships!: Table<Ship>;
  anchorages!: Table<Anchorage>;
  tidalRecords!: Table<TidalRecord>;
  anchorStatuses!: Table<AnchorStatus>;
  syncMessages!: Table<SemanticSyncMessage>;

  constructor() {
    super('SafeHarborDB');
    this.version(1).stores({
      ships: 'id, mmsi',
      anchorages: 'id, name',
      tidalRecords: '++id, anchorageId, timestamp',
      anchorStatuses: '[shipId+timestamp], anchorageId, dragRisk',
      syncMessages: 'id, timestamp, semanticHash'
    });
  }

  async addTidalRecord(record: Omit<TidalRecord, 'id'>): Promise<string> {
    const id = await this.tidalRecords.add(record as TidalRecord);
    return id.toString();
  }

  async getTidalRecordsByAnchorage(anchorageId: string, limit: number = 100): Promise<TidalRecord[]> {
    return this.tidalRecords
      .where('anchorageId')
      .equals(anchorageId)
      .reverse()
      .sortBy('timestamp')
      .then(records => records.slice(0, limit));
  }

  async addAnchorStatus(status: AnchorStatus): Promise<void> {
    await this.anchorStatuses.put(status);
  }

  async getLatestAnchorStatus(shipId: string): Promise<AnchorStatus | undefined> {
    return this.anchorStatuses
      .where('shipId')
      .equals(shipId)
      .reverse()
      .sortBy('timestamp')
      .then(statuses => statuses[0]);
  }

  async addSyncMessage(message: SemanticSyncMessage): Promise<void> {
    await this.syncMessages.put(message);
  }

  async getSyncMessages(since: number): Promise<SemanticSyncMessage[]> {
    return this.syncMessages
      .where('timestamp')
      .above(since)
      .toArray();
  }

  async getAllShips(): Promise<Ship[]> {
    return this.ships.toArray();
  }

  async getAllAnchorages(): Promise<Anchorage[]> {
    return this.anchorages.toArray();
  }
}

export const db = new SafeHarborDB();

let isInitializing = false;

const sampleShips: Ship[] = [
  {
    id: 'ship-001',
    name: '东方明珠号',
    mmsi: '413123456',
    length: 225,
    width: 32,
    draft: 12.5,
    grossTonnage: 65000,
    anchorChainLength: 350,
    anchorWeight: 12
  },
  {
    id: 'ship-002',
    name: '南海远航号',
    mmsi: '413654321',
    length: 180,
    width: 28,
    draft: 10.2,
    grossTonnage: 42000,
    anchorChainLength: 300,
    anchorWeight: 10
  },
  {
    id: 'ship-003',
    name: '渤海之星',
    mmsi: '413987654',
    length: 260,
    width: 40,
    draft: 14.8,
    grossTonnage: 88000,
    anchorChainLength: 420,
    anchorWeight: 15
  }
];

const sampleAnchorages: Anchorage[] = [
  {
    id: 'anchorage-001',
    name: '一号避风锚地',
    latitude: 30.1234,
    longitude: 122.5678,
    radius: 1.5,
    maxCapacity: 20,
    geologyType: 'mud',
    holdingCapacity: 0.85,
    depth: 25
  },
  {
    id: 'anchorage-002',
    name: '二号避风锚地',
    latitude: 30.2345,
    longitude: 122.6789,
    radius: 2.0,
    maxCapacity: 30,
    geologyType: 'sand',
    holdingCapacity: 0.72,
    depth: 20
  },
  {
    id: 'anchorage-003',
    name: '三号应急锚地',
    latitude: 30.3456,
    longitude: 122.7890,
    radius: 1.0,
    maxCapacity: 10,
    geologyType: 'clay',
    holdingCapacity: 0.90,
    depth: 30
  }
];

const generateTidalRecords = (): Omit<TidalRecord, 'id'>[] => {
  const now = Date.now();
  const records: Omit<TidalRecord, 'id'>[] = [];
  
  for (let i = 0; i < 720; i++) {
    const timestamp = now - (720 - i) * 3600000;
    records.push({
      timestamp,
      anchorageId: 'anchorage-001',
      height: 2.5 + Math.sin(i * 0.2618) * 1.5,
      currentSpeed: 0.5 + Math.sin(i * 0.2618 + 0.5) * 0.4,
      currentDirection: 180 + Math.sin(i * 0.1309) * 90
    });
    records.push({
      timestamp,
      anchorageId: 'anchorage-002',
      height: 2.8 + Math.sin(i * 0.2618 + 0.3) * 1.4,
      currentSpeed: 0.6 + Math.sin(i * 0.2618 + 0.8) * 0.5,
      currentDirection: 200 + Math.sin(i * 0.1309 + 0.2) * 80
    });
  }
  
  return records;
};

export const initializeSampleData = async () => {
  if (isInitializing) {
    return;
  }

  try {
    isInitializing = true;

    await db.transaction('rw', db.ships, db.anchorages, db.tidalRecords, async () => {
      const existingShips = await db.ships.count();
      if (existingShips === 0) {
        await db.ships.bulkPut(sampleShips);
        console.log('船舶数据初始化完成');
      }

      const existingAnchorages = await db.anchorages.count();
      if (existingAnchorages === 0) {
        await db.anchorages.bulkPut(sampleAnchorages);
        console.log('锚地数据初始化完成');
      }

      const existingTidalRecords = await db.tidalRecords.count();
      if (existingTidalRecords === 0) {
        const records = generateTidalRecords();
        await db.tidalRecords.bulkPut(records as TidalRecord[]);
        console.log('潮流数据初始化完成');
      }
    });
  } catch (error) {
    console.warn('数据初始化警告:', error instanceof Error ? error.message : '未知错误');
  } finally {
    setTimeout(() => {
      isInitializing = false;
    }, 100);
  }
};
