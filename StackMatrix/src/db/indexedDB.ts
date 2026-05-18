import Dexie, { Table } from 'dexie';
import { SKU, SKUSnapshot, Location, Task, Metrics, Fragment } from '../types';

export class WMSDatabase extends Dexie {
  skus!: Table<SKU, string>;
  skuSnapshots!: Table<SKUSnapshot, [string, number]>;
  locations!: Table<Location, string>;
  tasks!: Table<Task, string>;
  metrics!: Table<Metrics, number>;
  fragments!: Table<Fragment, string>;

  constructor() {
    super('WMSDatabase');
    
    this.version(1).stores({
      skus: 'id, category, liquidityScore, heatLevel',
      skuSnapshots: '[skuId+timestamp], skuId, timestamp',
      locations: 'id, status, heatLevel, row, col, level',
      tasks: 'id, status, createdAt, type, stackerId',
      metrics: 'timestamp',
      fragments: 'id, wasteScore'
    });
  }
}

export const db = new WMSDatabase();

export default db;
