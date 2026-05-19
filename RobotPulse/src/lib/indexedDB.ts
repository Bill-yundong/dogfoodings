import { openDB, IDBPDatabase } from "idb";
import type { PoseSnapshot, RobotState, SafetyAlert, PlannedPath } from "@/types";

const DB_NAME = "RobotPulseDB";
const DB_VERSION = 1;

const STORES = {
  SNAPSHOTS: "pose_snapshots",
  ROBOT_STATES: "robot_states",
  ALERTS: "safety_alerts",
  PATHS: "planned_paths",
  SESSIONS: "sessions",
} as const;

interface RobotPulseDB {
  pose_snapshots: {
    key: string;
    value: PoseSnapshot;
    indexes: {
      "by-robot": string;
      "by-timestamp": number;
      "by-session": string;
    };
  };
  robot_states: {
    key: string;
    value: RobotState;
    indexes: {
      "by-robot": string;
      "by-timestamp": number;
    };
  };
  safety_alerts: {
    key: string;
    value: SafetyAlert;
    indexes: {
      "by-robot": string;
      "by-severity": string;
      "by-timestamp": number;
    };
  };
  planned_paths: {
    key: string;
    value: PlannedPath;
    indexes: {
      "by-robot": string;
      "by-start-time": number;
    };
  };
  sessions: {
    key: string;
    value: {
      id: string;
      name: string;
      startTime: number;
      endTime?: number;
      robotIds: string[];
    };
    indexes: {
      "by-start-time": number;
    };
  };
}

let dbInstance: IDBPDatabase<RobotPulseDB> | null = null;

async function getDB(): Promise<IDBPDatabase<RobotPulseDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<RobotPulseDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
        const snapshotStore = db.createObjectStore(STORES.SNAPSHOTS, {
          keyPath: "id",
          autoIncrement: false,
        });
        snapshotStore.createIndex("by-robot", "robotId");
        snapshotStore.createIndex("by-timestamp", "timestamp");
        snapshotStore.createIndex("by-session", "sessionId");
      }

      if (!db.objectStoreNames.contains(STORES.ROBOT_STATES)) {
        const stateStore = db.createObjectStore(STORES.ROBOT_STATES, {
          keyPath: "id",
        });
        stateStore.createIndex("by-robot", "id");
        stateStore.createIndex("by-timestamp", "timestamp");
      }

      if (!db.objectStoreNames.contains(STORES.ALERTS)) {
        const alertStore = db.createObjectStore(STORES.ALERTS, {
          keyPath: "id",
        });
        alertStore.createIndex("by-robot", "robotId");
        alertStore.createIndex("by-severity", "severity");
        alertStore.createIndex("by-timestamp", "timestamp");
      }

      if (!db.objectStoreNames.contains(STORES.PATHS)) {
        const pathStore = db.createObjectStore(STORES.PATHS, {
          keyPath: "robotId",
        });
        pathStore.createIndex("by-robot", "robotId");
        pathStore.createIndex("by-start-time", "startTime");
      }

      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionStore = db.createObjectStore(STORES.SESSIONS, {
          keyPath: "id",
        });
        sessionStore.createIndex("by-start-time", "startTime");
      }
    },
  });

  return dbInstance;
}

export async function savePoseSnapshot(snapshot: PoseSnapshot): Promise<string> {
  const db = await getDB();
  const id = snapshot.id || `${snapshot.robotId}-${snapshot.timestamp}`;
  await db.put(STORES.SNAPSHOTS, { ...snapshot, id });
  return id;
}

export async function savePoseSnapshotsBatch(snapshots: PoseSnapshot[]): Promise<string[]> {
  const db = await getDB();
  const tx = db.transaction(STORES.SNAPSHOTS, "readwrite");
  const ids: string[] = [];

  for (const snapshot of snapshots) {
    const id = snapshot.id || `${snapshot.robotId}-${snapshot.timestamp}`;
    await tx.store.put({ ...snapshot, id });
    ids.push(id);
  }

  await tx.done;
  return ids;
}

export async function getSnapshotsByRobot(
  robotId: string,
  limit?: number,
  startTime?: number,
  endTime?: number
): Promise<PoseSnapshot[]> {
  const db = await getDB();
  const index = db.transaction(STORES.SNAPSHOTS).store.index("by-robot");

  let range: IDBKeyRange | undefined;
  if (startTime && endTime) {
    range = IDBKeyRange.bound([robotId, startTime], [robotId, endTime], false, false);
  }

  const results = await index.getAll(range, limit);
  return results.filter((s) => s.robotId === robotId).sort((a, b) => a.timestamp - b.timestamp);
}

export async function getSnapshotsBySession(sessionId: string): Promise<PoseSnapshot[]> {
  const db = await getDB();
  const index = db.transaction(STORES.SNAPSHOTS).store.index("by-session");
  const results = await index.getAll(sessionId);
  return results.sort((a, b) => a.timestamp - b.timestamp);
}

export async function getLatestSnapshot(robotId: string): Promise<PoseSnapshot | undefined> {
  const db = await getDB();
  const index = db.transaction(STORES.SNAPSHOTS).store.index("by-timestamp");
  const results = await index.getAll(null, 100);
  return results.filter((s) => s.robotId === robotId).sort((a, b) => b.timestamp - a.timestamp)[0];
}

export async function saveRobotState(state: RobotState): Promise<void> {
  const db = await getDB();
  await db.put(STORES.ROBOT_STATES, state);
}

export async function getRobotState(robotId: string): Promise<RobotState | undefined> {
  const db = await getDB();
  return db.get(STORES.ROBOT_STATES, robotId);
}

export async function saveSafetyAlert(alert: SafetyAlert): Promise<void> {
  const db = await getDB();
  await db.put(STORES.ALERTS, alert);
}

export async function getAlertsBySeverity(
  severity: "info" | "warning" | "critical",
  limit?: number
): Promise<SafetyAlert[]> {
  const db = await getDB();
  const index = db.transaction(STORES.ALERTS).store.index("by-severity");
  const results = await index.getAll(severity, limit);
  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getUnacknowledgedAlerts(): Promise<SafetyAlert[]> {
  const db = await getDB();
  const allAlerts = await db.getAll(STORES.ALERTS);
  return allAlerts.filter((a) => !a.acknowledged).sort((a, b) => b.timestamp - a.timestamp);
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  const db = await getDB();
  const alert = await db.get(STORES.ALERTS, alertId);
  if (alert) {
    await db.put(STORES.ALERTS, { ...alert, acknowledged: true });
  }
}

export async function savePlannedPath(path: PlannedPath): Promise<void> {
  const db = await getDB();
  await db.put(STORES.PATHS, path);
}

export async function createSession(
  name: string,
  robotIds: string[]
): Promise<{ id: string; startTime: number }> {
  const db = await getDB();
  const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  await db.put(STORES.SESSIONS, { id, name, startTime, robotIds });
  return { id, startTime };
}

export async function endSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const session = await db.get(STORES.SESSIONS, sessionId);
  if (session) {
    await db.put(STORES.SESSIONS, { ...session, endTime: Date.now() });
  }
}

export async function getRecentSessions(limit: number = 10): Promise<
  {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    robotIds: string[];
  }[]
> {
  const db = await getDB();
  const index = db.transaction(STORES.SESSIONS).store.index("by-start-time");
  const results = await index.getAll(null, limit);
  return results.sort((a, b) => b.startTime - a.startTime);
}

export async function deleteOldSnapshots(beforeTimestamp: number): Promise<number> {
  const db = await getDB();
  const tx = db.transaction(STORES.SNAPSHOTS, "readwrite");
  const index = tx.store.index("by-timestamp");
  const range = IDBKeyRange.upperBound(beforeTimestamp);

  let count = 0;
  let cursor = await index.openCursor(range);
  while (cursor) {
    await cursor.delete();
    count++;
    cursor = await cursor.continue();
  }

  await tx.done;
  return count;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const storeNames = [STORES.SNAPSHOTS, STORES.ROBOT_STATES, STORES.ALERTS, STORES.PATHS, STORES.SESSIONS] as const;
  const tx = db.transaction(storeNames, "readwrite");
  await Promise.all(storeNames.map((name) => tx.objectStore(name).clear()));
  await tx.done;
}

export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
