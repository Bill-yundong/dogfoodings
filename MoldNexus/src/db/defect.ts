import { getDB } from './index';
import type { Defect, DefectType } from '../types';

export async function createDefect(defect: Omit<Defect, 'id'>): Promise<Defect> {
  const db = getDB();
  const newDefect: Defect = {
    ...defect,
    id: crypto.randomUUID(),
  };
  await db.add('defects', newDefect);
  return newDefect;
}

export async function getDefectsBySnapshot(snapshotId: string): Promise<Defect[]> {
  const db = getDB();
  return db.getAllFromIndex('defects', 'by-snapshotId', snapshotId);
}

export async function getDefectsByType(type: DefectType): Promise<Defect[]> {
  const db = getDB();
  return db.getAllFromIndex('defects', 'by-type', type);
}

export async function getDefectsBySeverity(minSeverity: number): Promise<Defect[]> {
  const db = getDB();
  const allDefects = await db.getAll('defects');
  return allDefects.filter(d => d.severity >= minSeverity);
}

export async function bulkCreateDefects(defects: Omit<Defect, 'id'>[]): Promise<Defect[]> {
  const db = getDB();
  const tx = db.transaction('defects', 'readwrite');
  const result: Defect[] = [];

  for (const defect of defects) {
    const newDefect: Defect = {
      ...defect,
      id: crypto.randomUUID(),
    };
    await tx.store.add(newDefect);
    result.push(newDefect);
  }

  await tx.done;
  return result;
}

export async function countDefectsByType(_simulationId?: string): Promise<Record<DefectType, number>> {
  const db = getDB();
  const allDefects = await db.getAll('defects');
  const counts: Record<DefectType, number> = {
    weld_line: 0,
    air_trap: 0,
    short_shot: 0,
    burn_mark: 0,
    sink_mark: 0,
  };

  for (const defect of allDefects) {
    const type = defect.type as DefectType;
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts;
}
