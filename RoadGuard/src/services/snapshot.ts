import { openDB, type IDBPDatabase } from 'idb';
import type { Snapshot, Annotation } from '../types';

const DB_NAME = 'RoadGuardDB';
const DB_VERSION = 1;
const SNAPSHOTS_STORE = 'snapshots';

class SnapshotService {
  private db: IDBPDatabase | null = null;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
          const store = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
          store.createIndex('roadSection', 'roadSection', { unique: false });
          store.createIndex('year', 'year', { unique: false });
          store.createIndex('imageType', 'imageType', { unique: false });
          store.createIndex('captureDate', 'captureDate', { unique: false });
        }
      }
    });

    await this.generateMockSnapshots();
  }

  private async generateMockSnapshots(): Promise<void> {
    const existing = await this.getAllSnapshots();
    if (existing.length > 0) return;

    const roadSections = ['A-001', 'A-002', 'B-001', 'B-002', 'C-001'];
    const imageTypes: Snapshot['imageType'][] = ['visual', 'thermal', '3d_scan'];
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 3; year <= currentYear; year++) {
      for (let i = 0; i < 3; i++) {
        const snapshot = await this.createMockSnapshot(
          roadSections[Math.floor(Math.random() * roadSections.length)],
          year,
          imageTypes[Math.floor(Math.random() * imageTypes.length)]
        );
        await this.saveSnapshot(snapshot);
      }
    }
  }

  private async createMockSnapshot(
    roadSection: string,
    year: number,
    imageType: Snapshot['imageType']
  ): Promise<Snapshot> {
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const captureDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    if (imageType === 'thermal') {
      gradient.addColorStop(0, '#1e3a5f');
      gradient.addColorStop(0.5, '#dc2626');
      gradient.addColorStop(1, '#fbbf24');
    } else if (imageType === '3d_scan') {
      gradient.addColorStop(0, '#1e293b');
      gradient.addColorStop(1, '#3b82f6');
    } else {
      gradient.addColorStop(0, '#64748b');
      gradient.addColorStop(1, '#334155');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    ctx.strokeStyle = imageType === 'thermal' ? '#f59e0b' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, 150);
    ctx.lineTo(250, 180);
    ctx.lineTo(320, 220);
    ctx.lineTo(450, 190);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(500, 300);
    ctx.lineTo(650, 350);
    ctx.lineTo(700, 320);
    ctx.stroke();

    const imageData = canvas.toDataURL('image/png');

    const annotations: Annotation[] = [
      {
        id: `ann-${Date.now()}-1`,
        type: 'crack',
        boundingBox: { x: 100, y: 150, width: 350, height: 80 },
        confidence: 0.92,
        notes: '横向裂缝，宽度约15mm'
      },
      {
        id: `ann-${Date.now()}-2`,
        type: 'crack',
        boundingBox: { x: 500, y: 300, width: 200, height: 60 },
        confidence: 0.87,
        notes: '网状裂缝区'
      }
    ];

    return {
      id: `SNP-${year}-${roadSection}-${Date.now()}`,
      roadSection,
      captureDate,
      year,
      imageData,
      imageType,
      resolution: { width: 800, height: 600 },
      metadata: {
        weather: ['晴', '多云', '阴'][Math.floor(Math.random() * 3)],
        temperature: Math.round(Math.random() * 30) + 5,
        humidity: Math.round(Math.random() * 50) + 30,
        equipment: imageType === 'thermal' ? 'FLIR T640' : imageType === '3d_scan' ? 'Trimble MX9' : 'Canon EOS R5',
        operator: ['张工', '李工', '王工'][Math.floor(Math.random() * 3)]
      },
      associatedCracks: [
        `CRK-${String(Math.floor(Math.random() * 20) + 1).padStart(4, '0')}`,
        `CRK-${String(Math.floor(Math.random() * 20) + 1).padStart(4, '0')}`
      ],
      annotations
    };
  }

  async saveSnapshot(snapshot: Snapshot): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.put(SNAPSHOTS_STORE, snapshot);
  }

  async getSnapshot(id: string): Promise<Snapshot | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.get(SNAPSHOTS_STORE, id);
  }

  async getAllSnapshots(): Promise<Snapshot[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAll(SNAPSHOTS_STORE);
  }

  async getSnapshotsByRoadSection(roadSection: string): Promise<Snapshot[]> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(SNAPSHOTS_STORE, 'readonly');
    const index = tx.store.index('roadSection');
    return index.getAll(roadSection);
  }

  async getSnapshotsByYear(year: number): Promise<Snapshot[]> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(SNAPSHOTS_STORE, 'readonly');
    const index = tx.store.index('year');
    return index.getAll(year);
  }

  async getSnapshotsByType(imageType: Snapshot['imageType']): Promise<Snapshot[]> {
    if (!this.db) throw new Error('Database not initialized');
    const tx = this.db.transaction(SNAPSHOTS_STORE, 'readonly');
    const index = tx.store.index('imageType');
    return index.getAll(imageType);
  }

  async getSnapshotsByDateRange(startDate: string, endDate: string): Promise<Snapshot[]> {
    const allSnapshots = await this.getAllSnapshots();
    return allSnapshots.filter(s => {
      return s.captureDate >= startDate && s.captureDate <= endDate;
    });
  }

  async deleteSnapshot(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.delete(SNAPSHOTS_STORE, id);
  }

  async updateSnapshot(id: string, updates: Partial<Snapshot>): Promise<Snapshot | undefined> {
    const snapshot = await this.getSnapshot(id);
    if (!snapshot) return undefined;

    const updated: Snapshot = { ...snapshot, ...updates };
    await this.saveSnapshot(updated);
    return updated;
  }

  async addAnnotation(snapshotId: string, annotation: Omit<Annotation, 'id'>): Promise<Snapshot | undefined> {
    const snapshot = await this.getSnapshot(snapshotId);
    if (!snapshot) return undefined;

    const newAnnotation: Annotation = {
      ...annotation,
      id: `ann-${Date.now()}`
    };

    snapshot.annotations.push(newAnnotation);
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  async getStats(): Promise<{
    total: number;
    byYear: Record<number, number>;
    byType: Record<string, number>;
    bySection: Record<string, number>;
  }> {
    const snapshots = await this.getAllSnapshots();
    const stats = {
      total: snapshots.length,
      byYear: {} as Record<number, number>,
      byType: {} as Record<string, number>,
      bySection: {} as Record<string, number>
    };

    for (const s of snapshots) {
      stats.byYear[s.year] = (stats.byYear[s.year] || 0) + 1;
      stats.byType[s.imageType] = (stats.byType[s.imageType] || 0) + 1;
      stats.bySection[s.roadSection] = (stats.bySection[s.roadSection] || 0) + 1;
    }

    return stats;
  }
}

export const snapshotService = new SnapshotService();
