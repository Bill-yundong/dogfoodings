import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FlowField, Building } from '../turbulence/RNGKEpsilon';

export interface WindFieldRecord {
  id?: string;
  cityId: string;
  simulationId: string;
  timestamp: number;
  name: string;
  description: string;
  inletVelocity: number;
  windDirection: number;
  buildings: Building[];
  flowFieldData: {
    u: number[];
    v: number[];
    w: number[];
    k: number[];
    epsilon: number[];
    nu_t: number[];
    pressure: number[];
    nx: number;
    ny: number;
    nz: number;
    dx: number;
    dy: number;
    dz: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface WindHazardAssessment {
  id?: string;
  cityId: string;
  simulationId: string;
  timestamp: number;
  location: { x: number; y: number; z: number };
  hazardLevel: 'low' | 'medium' | 'high' | 'severe';
  windSpeed: number;
  turbulenceIntensity: number;
  pressureCoefficient: number;
  recommendations: string[];
}

export interface CityInfo {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  dominantWindDirection: number;
  averageWindSpeed: number;
}

interface AeroFlowDB extends DBSchema {
  windFields: {
    key: string;
    value: WindFieldRecord;
    indexes: { 
      'by-city': string;
      'by-simulation': string;
      'by-timestamp': number;
    };
  };
  hazardAssessments: {
    key: string;
    value: WindHazardAssessment;
    indexes: {
      'by-city': string;
      'by-simulation': string;
      'by-level': string;
    };
  };
  cities: {
    key: string;
    value: CityInfo;
  };
}

export class WindFieldDatabase {
  private db: IDBPDatabase<AeroFlowDB> | null = null;
  private readonly DB_NAME = 'AeroFlowDB';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<AeroFlowDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains('windFields')) {
          const windFieldsStore = db.createObjectStore('windFields', { 
            keyPath: 'id',
            autoIncrement: false
          });
          windFieldsStore.createIndex('by-city', 'cityId');
          windFieldsStore.createIndex('by-simulation', 'simulationId');
          windFieldsStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('hazardAssessments')) {
          const hazardStore = db.createObjectStore('hazardAssessments', { 
            keyPath: 'id',
            autoIncrement: false
          });
          hazardStore.createIndex('by-city', 'cityId');
          hazardStore.createIndex('by-simulation', 'simulationId');
          hazardStore.createIndex('by-level', 'hazardLevel');
        }

        if (!db.objectStoreNames.contains('cities')) {
          db.createObjectStore('cities', { keyPath: 'id' });
        }
      },
    });
  }

  private ensureInitialized(): void {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
  }

  generateId(): string {
    return `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveWindField(record: Omit<WindFieldRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    this.ensureInitialized();
    
    const id = this.generateId();
    const now = Date.now();
    
    const fullRecord: WindFieldRecord = {
      ...record,
      id,
      createdAt: now,
      updatedAt: now
    };

    await this.db!.put('windFields', fullRecord);
    return id;
  }

  async getWindField(id: string): Promise<WindFieldRecord | undefined> {
    this.ensureInitialized();
    return this.db!.get('windFields', id);
  }

  async getWindFieldsByCity(cityId: string): Promise<WindFieldRecord[]> {
    this.ensureInitialized();
    return this.db!.getAllFromIndex('windFields', 'by-city', cityId);
  }

  async getWindFieldsBySimulation(simulationId: string): Promise<WindFieldRecord[]> {
    this.ensureInitialized();
    return this.db!.getAllFromIndex('windFields', 'by-simulation', simulationId);
  }

  async getAllWindFields(limit?: number): Promise<WindFieldRecord[]> {
    this.ensureInitialized();
    return this.db!.getAll('windFields', undefined, limit);
  }

  async updateWindField(id: string, updates: Partial<WindFieldRecord>): Promise<void> {
    this.ensureInitialized();
    
    const existing = await this.getWindField(id);
    if (!existing) {
      throw new Error(`Wind field record ${id} not found`);
    }

    const updated: WindFieldRecord = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    await this.db!.put('windFields', updated);
  }

  async deleteWindField(id: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.delete('windFields', id);
  }

  flowFieldToSerializable(field: FlowField): WindFieldRecord['flowFieldData'] {
    return {
      u: Array.from(field.u),
      v: Array.from(field.v),
      w: Array.from(field.w),
      k: Array.from(field.k),
      epsilon: Array.from(field.epsilon),
      nu_t: Array.from(field.nu_t),
      pressure: Array.from(field.pressure),
      nx: field.nx,
      ny: field.ny,
      nz: field.nz,
      dx: field.dx,
      dy: field.dy,
      dz: field.dz
    };
  }

  serializableToFlowField(data: WindFieldRecord['flowFieldData']): FlowField {
    return {
      u: new Float32Array(data.u),
      v: new Float32Array(data.v),
      w: new Float32Array(data.w),
      k: new Float32Array(data.k),
      epsilon: new Float32Array(data.epsilon),
      nu_t: new Float32Array(data.nu_t),
      pressure: new Float32Array(data.pressure),
      nx: data.nx,
      ny: data.ny,
      nz: data.nz,
      dx: data.dx,
      dy: data.dy,
      dz: data.dz
    };
  }

  async saveHazardAssessment(assessment: Omit<WindHazardAssessment, 'id'>): Promise<string> {
    this.ensureInitialized();
    
    const id = this.generateId();
    const fullAssessment: WindHazardAssessment = {
      ...assessment,
      id
    };

    await this.db!.put('hazardAssessments', fullAssessment);
    return id;
  }

  async getHazardAssessment(id: string): Promise<WindHazardAssessment | undefined> {
    this.ensureInitialized();
    return this.db!.get('hazardAssessments', id);
  }

  async getHazardAssessmentsByLevel(level: WindHazardAssessment['hazardLevel']): Promise<WindHazardAssessment[]> {
    this.ensureInitialized();
    return this.db!.getAllFromIndex('hazardAssessments', 'by-level', level);
  }

  async getHazardAssessmentsByCity(cityId: string): Promise<WindHazardAssessment[]> {
    this.ensureInitialized();
    return this.db!.getAllFromIndex('hazardAssessments', 'by-city', cityId);
  }

  async getAllHazardAssessments(limit?: number): Promise<WindHazardAssessment[]> {
    this.ensureInitialized();
    return this.db!.getAll('hazardAssessments', undefined, limit);
  }

  async deleteHazardAssessment(id: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.delete('hazardAssessments', id);
  }

  async saveCity(city: CityInfo): Promise<string> {
    this.ensureInitialized();
    await this.db!.put('cities', city);
    return city.id;
  }

  async getCity(id: string): Promise<CityInfo | undefined> {
    this.ensureInitialized();
    return this.db!.get('cities', id);
  }

  async getAllCities(): Promise<CityInfo[]> {
    this.ensureInitialized();
    return this.db!.getAll('cities');
  }

  async deleteCity(id: string): Promise<void> {
    this.ensureInitialized();
    await this.db!.delete('cities', id);
  }

  async batchSaveWindFields(records: Array<Omit<WindFieldRecord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<string[]> {
    this.ensureInitialized();
    
    const ids: string[] = [];
    const tx = this.db!.transaction('windFields', 'readwrite');
    
    for (const record of records) {
      const id = this.generateId();
      ids.push(id);
      
      const fullRecord: WindFieldRecord = {
        ...record,
        id,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      tx.store.put(fullRecord);
    }

    await tx.done;
    return ids;
  }

  async getWindFieldCount(): Promise<number> {
    this.ensureInitialized();
    return this.db!.count('windFields');
  }

  async getHazardAssessmentCount(): Promise<number> {
    this.ensureInitialized();
    return this.db!.count('hazardAssessments');
  }

  async clearAllWindFields(): Promise<void> {
    this.ensureInitialized();
    await this.db!.clear('windFields');
  }

  async clearAllHazardAssessments(): Promise<void> {
    this.ensureInitialized();
    await this.db!.clear('hazardAssessments');
  }

  async getDatabaseStats(): Promise<{
    windFieldCount: number;
    hazardAssessmentCount: number;
    cityCount: number;
  }> {
    this.ensureInitialized();
    
    const [windFieldCount, hazardAssessmentCount, cityCount] = await Promise.all([
      this.getWindFieldCount(),
      this.getHazardAssessmentCount(),
      this.db!.count('cities')
    ]);

    return {
      windFieldCount,
      hazardAssessmentCount,
      cityCount
    };
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const windFieldDB = new WindFieldDatabase();
