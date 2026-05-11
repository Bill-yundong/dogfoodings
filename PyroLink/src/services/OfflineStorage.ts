import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { OfflinePlan, RescueUnit, Command } from '../types';

interface PyroLinkDB extends DBSchema {
  plans: {
    key: string;
    value: OfflinePlan;
    indexes: { 'by-updated': number };
  };
  units: {
    key: string;
    value: RescueUnit;
    indexes: { 'by-type': string };
  };
  commands: {
    key: string;
    value: Command;
    indexes: { 'by-timestamp': number; 'by-status': string };
  };
}

export class OfflineStorage {
  private db: IDBPDatabase<PyroLinkDB> | null = null;

  async init() {
    this.db = await openDB<PyroLinkDB>('pyrolink-db', 1, {
      upgrade(db) {
        const planStore = db.createObjectStore('plans', { keyPath: 'id' });
        planStore.createIndex('by-updated', 'updatedAt');

        const unitStore = db.createObjectStore('units', { keyPath: 'id' });
        unitStore.createIndex('by-type', 'type');

        const cmdStore = db.createObjectStore('commands', { keyPath: 'id' });
        cmdStore.createIndex('by-timestamp', 'timestamp');
        cmdStore.createIndex('by-status', 'status');
      }
    });
  }

  async savePlan(plan: Omit<OfflinePlan, 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!this.db) await this.init();
    
    const now = Date.now();
    await this.db!.put('plans', {
      ...plan,
      createdAt: now,
      updatedAt: now
    });
  }

  async getPlan(id: string): Promise<OfflinePlan | undefined> {
    if (!this.db) await this.init();
    return this.db!.get('plans', id);
  }

  async getAllPlans(): Promise<OfflinePlan[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('plans', 'by-updated');
  }

  async deletePlan(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('plans', id);
  }

  async saveUnits(units: RescueUnit[]): Promise<void> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction('units', 'readwrite');
    await Promise.all([
      ...units.map(unit => tx.store.put(unit)),
      tx.done
    ]);
  }

  async getUnits(): Promise<RescueUnit[]> {
    if (!this.db) await this.init();
    return this.db!.getAll('units');
  }

  async getUnitsByType(type: RescueUnit['type']): Promise<RescueUnit[]> {
    if (!this.db) await this.init();
    return this.db!.getAllFromIndex('units', 'by-type', type);
  }

  async saveCommands(commands: Command[]): Promise<void> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction('commands', 'readwrite');
    await Promise.all([
      ...commands.map(cmd => tx.store.put(cmd)),
      tx.done
    ]);
  }

  async getPendingCommands(): Promise<Command[]> {
    if (!this.db) await this.init();
    const allCommands = await this.db!.getAllFromIndex('commands', 'by-status');
    return allCommands.filter(c => c.status !== 'completed');
  }

  async syncOfflineData(): Promise<{ commands: Command[]; units: RescueUnit[] }> {
    if (!this.db) await this.init();
    
    const [commands, units] = await Promise.all([
      this.getPendingCommands(),
      this.getUnits()
    ]);

    return { commands, units };
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    await Promise.all([
      this.db!.clear('plans'),
      this.db!.clear('units'),
      this.db!.clear('commands')
    ]);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
