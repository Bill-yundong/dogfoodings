import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { ConjunctionEvent, Debris } from "@/types/orbital";

interface OrbitLinkSchema extends DBSchema {
  debris: {
    key: string;
    value: Debris;
    indexes: {
      orbitClass: string;
      periodMin: number;
      rcsM2: number;
    };
  };
  events: {
    key: string;
    value: ConjunctionEvent;
    indexes: {
      tcaEpochJd: number;
      collisionProbability: number;
      severity: number;
    };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

const DB_NAME = "orbitlink-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OrbitLinkSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<OrbitLinkSchema>> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB<OrbitLinkSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("debris")) {
        const d = db.createObjectStore("debris", { keyPath: "noradId" });
        d.createIndex("orbitClass", "orbitClass", { unique: false });
        d.createIndex("periodMin", "periodMin", { unique: false });
        d.createIndex("rcsM2", "rcsM2", { unique: false });
      }
      if (!db.objectStoreNames.contains("events")) {
        const e = db.createObjectStore("events", { keyPath: "id" });
        e.createIndex("tcaEpochJd", "tcaEpochJd", { unique: false });
        e.createIndex("collisionProbability", "collisionProbability", {
          unique: false,
        });
        e.createIndex("severity", "severity", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    },
  });
  return dbPromise;
}

export async function upsertDebris(list: Debris[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("debris", "readwrite");
  for (const item of list) {
    tx.store.put(item);
  }
  await tx.done;
}

export async function getAllDebris(): Promise<Debris[]> {
  const db = await getDb();
  return db.getAll("debris");
}

export async function countDebris(): Promise<number> {
  const db = await getDb();
  return db.count("debris");
}

export async function queryDebrisByClass(
  orbitClass: string
): Promise<Debris[]> {
  const db = await getDb();
  return db.getAllFromIndex("debris", "orbitClass", orbitClass);
}

export async function clearDebris(): Promise<void> {
  const db = await getDb();
  await db.clear("debris");
}

export async function upsertEvents(events: ConjunctionEvent[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("events", "readwrite");
  for (const e of events) tx.store.put(e);
  await tx.done;
}

export async function getEvents(
  minSeverity = 0
): Promise<ConjunctionEvent[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("events", "severity", IDBKeyRange.lowerBound(minSeverity));
  return all.sort((a, b) => b.collisionProbability - a.collisionProbability);
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("meta", { key, value });
}

export async function getMeta<T = unknown>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get("meta", key);
  return row?.value as T | undefined;
}
