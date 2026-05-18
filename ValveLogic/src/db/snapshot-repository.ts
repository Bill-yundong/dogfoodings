import { initDB } from './indexed-db';
import type { SnapshotRecord, SimulationRecord, WarningRecord } from './indexed-db';
import type {
  PressureSnapshot,
  Warning,
  MOCConfig,
  PipelineNode,
  PipelineSegment,
  Valve,
} from '../types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function createSimulation(
  name: string,
  config: MOCConfig,
  nodes: PipelineNode[],
  segments: PipelineSegment[],
  valves: Valve[]
): Promise<string> {
  const db = await initDB();
  const simulation: SimulationRecord = {
    id: generateId(),
    name,
    createdAt: Date.now(),
    duration: 0,
    config,
    nodes,
    segments,
    valves,
    snapshotCount: 0,
  };
  await db.add('simulations', simulation);
  return simulation.id;
}

export async function getSimulation(simulationId: string): Promise<SimulationRecord | undefined> {
  const db = await initDB();
  return db.get('simulations', simulationId);
}

export async function getAllSimulations(): Promise<SimulationRecord[]> {
  const db = await initDB();
  return db.getAllFromIndex('simulations', 'by-createdAt');
}

export async function updateSimulationDuration(
  simulationId: string,
  duration: number
): Promise<void> {
  const db = await initDB();
  const sim = await db.get('simulations', simulationId);
  if (sim) {
    sim.duration = duration;
    await db.put('simulations', sim);
  }
}

export async function deleteSimulation(simulationId: string): Promise<void> {
  const db = await initDB();

  const snapshots = await db.getAllFromIndex('snapshots', 'by-simulationId', simulationId);
  const warnings = await db.getAllFromIndex('warnings', 'by-simulationId', simulationId);

  const tx = db.transaction(['simulations', 'snapshots', 'warnings'], 'readwrite');

  await Promise.all([
    ...snapshots.map((s) => tx.objectStore('snapshots').delete(s.id)),
    ...warnings.map((w) => tx.objectStore('warnings').delete(w.id)),
    tx.objectStore('simulations').delete(simulationId),
  ]);

  await tx.done;
}

export async function saveSnapshot(
  simulationId: string,
  snapshot: Omit<PressureSnapshot, 'id'>
): Promise<string> {
  const db = await initDB();
  const snapshotId = generateId();

  const record: SnapshotRecord = {
    id: snapshotId,
    simulationId,
    timestamp: snapshot.timestamp,
    simulationTime: snapshot.simulationTime,
    nodePressures: snapshot.nodePressures,
    segmentPressures: snapshot.segmentPressures,
    valveStates: snapshot.valveStates,
    warnings: snapshot.warnings,
  };

  const tx = db.transaction(['snapshots', 'warnings', 'simulations'], 'readwrite');
  await tx.objectStore('snapshots').add(record);

  for (const warning of snapshot.warnings) {
    const warningRecord: WarningRecord = {
      id: warning.id,
      snapshotId,
      simulationId,
      type: warning.type,
      severity: warning.severity,
      nodeId: warning.nodeId,
      segmentId: warning.segmentId,
      message: warning.message,
      timestamp: warning.timestamp,
    };
    await tx.objectStore('warnings').add(warningRecord);
  }

  const sim = await tx.objectStore('simulations').get(simulationId);
  if (sim) {
    sim.snapshotCount++;
    await tx.objectStore('simulations').put(sim);
  }

  await tx.done;
  return snapshotId;
}

export async function saveSnapshotsBatch(
  simulationId: string,
  snapshots: Omit<PressureSnapshot, 'id'>[]
): Promise<string[]> {
  const db = await initDB();
  const ids: string[] = [];
  const tx = db.transaction(['snapshots', 'warnings', 'simulations'], 'readwrite');

  for (const snapshot of snapshots) {
    const snapshotId = generateId();
    ids.push(snapshotId);

    const record: SnapshotRecord = {
      id: snapshotId,
      simulationId,
      timestamp: snapshot.timestamp,
      simulationTime: snapshot.simulationTime,
      nodePressures: snapshot.nodePressures,
      segmentPressures: snapshot.segmentPressures,
      valveStates: snapshot.valveStates,
      warnings: snapshot.warnings,
    };

    await tx.objectStore('snapshots').add(record);

    for (const warning of snapshot.warnings) {
      const warningRecord: WarningRecord = {
        id: warning.id,
        snapshotId,
        simulationId,
        type: warning.type,
        severity: warning.severity,
        nodeId: warning.nodeId,
        segmentId: warning.segmentId,
        message: warning.message,
        timestamp: warning.timestamp,
      };
      await tx.objectStore('warnings').add(warningRecord);
    }
  }

  const sim = await tx.objectStore('simulations').get(simulationId);
  if (sim) {
    sim.snapshotCount += snapshots.length;
    await tx.objectStore('simulations').put(sim);
  }

  await tx.done;
  return ids;
}

export async function getSnapshot(snapshotId: string): Promise<SnapshotRecord | undefined> {
  const db = await initDB();
  return db.get('snapshots', snapshotId);
}

export async function getSnapshotsBySimulation(
  simulationId: string,
  limit?: number,
  offset?: number
): Promise<SnapshotRecord[]> {
  const db = await initDB();
  const snapshots = await db.getAllFromIndex('snapshots', 'by-simulationId', simulationId);

  if (offset) {
    return snapshots.slice(offset, limit ? offset + limit : undefined);
  }
  if (limit) {
    return snapshots.slice(0, limit);
  }
  return snapshots;
}

export async function getSnapshotAtTime(
  simulationId: string,
  simulationTime: number
): Promise<SnapshotRecord | undefined> {
  const db = await initDB();
  const range = IDBKeyRange.bound([simulationId, 0], [simulationId, simulationTime]);
  const snapshots = await db.getAllFromIndex('snapshots', 'by-simulationTime', range);
  return snapshots[snapshots.length - 1];
}

export async function getSnapshotsInTimeRange(
  simulationId: string,
  startTime: number,
  endTime: number
): Promise<SnapshotRecord[]> {
  const db = await initDB();
  const range = IDBKeyRange.bound([simulationId, startTime], [simulationId, endTime]);
  return db.getAllFromIndex('snapshots', 'by-simulationTime', range);
}

export async function getWarningsBySimulation(
  simulationId: string,
  severity?: string
): Promise<WarningRecord[]> {
  const db = await initDB();
  if (severity) {
    return db.getAllFromIndex('warnings', 'by-severity', severity);
  }
  return db.getAllFromIndex('warnings', 'by-simulationId', simulationId);
}

export async function getNodePressureHistory(
  simulationId: string,
  nodeId: string
): Promise<{ time: number; pressure: number }[]> {
  const snapshots = await getSnapshotsBySimulation(simulationId);
  return snapshots
    .filter((s) => s.nodePressures[nodeId] !== undefined)
    .map((s) => ({
      time: s.simulationTime,
      pressure: s.nodePressures[nodeId],
    }));
}

export async function exportSimulationData(simulationId: string): Promise<string> {
  const [simulation, snapshots, warnings] = await Promise.all([
    getSimulation(simulationId),
    getSnapshotsBySimulation(simulationId),
    getWarningsBySimulation(simulationId),
  ]);

  const data = {
    simulation,
    snapshots,
    warnings,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

export async function importSimulationData(jsonData: string): Promise<string> {
  const data = JSON.parse(jsonData);

  if (!data.simulation || !data.snapshots) {
    throw new Error('无效的仿真数据格式');
  }

  const db = await initDB();
  const newSimulationId = generateId();

  const tx = db.transaction(['simulations', 'snapshots', 'warnings'], 'readwrite');

  const simulation: SimulationRecord = {
    ...data.simulation,
    id: newSimulationId,
    createdAt: Date.now(),
    name: `${data.simulation.name} (导入)`,
  };

  await tx.objectStore('simulations').add(simulation);

  const idMapping: Record<string, string> = {};

  for (const snapshot of data.snapshots) {
    const newSnapshotId = generateId();
    idMapping[snapshot.id] = newSnapshotId;

    const record: SnapshotRecord = {
      ...snapshot,
      id: newSnapshotId,
      simulationId: newSimulationId,
    };

    await tx.objectStore('snapshots').add(record);
  }

  if (data.warnings) {
    for (const warning of data.warnings) {
      const warningRecord: WarningRecord = {
        ...warning,
        id: generateId(),
        simulationId: newSimulationId,
        snapshotId: idMapping[warning.snapshotId] || warning.snapshotId,
      };
      await tx.objectStore('warnings').add(warningRecord);
    }
  }

  await tx.done;
  return newSimulationId;
}
