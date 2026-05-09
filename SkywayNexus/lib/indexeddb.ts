import { openDB, IDBPDatabase } from "idb";
import {
  BlackBoxSnapshot,
  FlightPlan,
  FlightRoute,
  Aircraft,
  ConflictDetectionResult,
  MitigationAction,
  SemanticMapping,
} from "@/lib/types";

const DB_NAME = "SkywayNexusDB";
const DB_VERSION = 1;

const STORES = {
  BLACKBOX_SNAPSHOTS: "blackbox_snapshots",
  FLIGHT_PLANS: "flight_plans",
  FLIGHT_ROUTES: "flight_routes",
  AIRCRAFT: "aircraft",
  CONFLICTS: "conflicts",
  MITIGATIONS: "mitigations",
  SEMANTIC_MAPPINGS: "semantic_mappings",
};

class DatabaseService {
  private db: IDBPDatabase | null = null;

  async init(): Promise<IDBPDatabase> {
    if (this.db) return this.db;

    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade: (db) => {
        if (!db.objectStoreNames.contains(STORES.BLACKBOX_SNAPSHOTS)) {
          const blackboxStore = db.createObjectStore(
            STORES.BLACKBOX_SNAPSHOTS,
            { keyPath: "id" }
          );
          blackboxStore.createIndex("flightPlanId", "flightPlanId", {
            unique: false,
          });
          blackboxStore.createIndex("snapshotTime", "snapshotTime", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains(STORES.FLIGHT_PLANS)) {
          const flightPlanStore = db.createObjectStore(STORES.FLIGHT_PLANS, {
            keyPath: "id",
          });
          flightPlanStore.createIndex("status", "status", { unique: false });
          flightPlanStore.createIndex("aircraftId", "aircraftId", {
            unique: false,
          });
          flightPlanStore.createIndex("departureTime", "departureTime", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains(STORES.FLIGHT_ROUTES)) {
          const routeStore = db.createObjectStore(STORES.FLIGHT_ROUTES, {
            keyPath: "id",
          });
          routeStore.createIndex("routeType", "routeType", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.AIRCRAFT)) {
          const aircraftStore = db.createObjectStore(STORES.AIRCRAFT, {
            keyPath: "id",
          });
          aircraftStore.createIndex("registration", "registration", {
            unique: true,
          });
          aircraftStore.createIndex("status", "status", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
          const conflictStore = db.createObjectStore(STORES.CONFLICTS, {
            keyPath: "id",
          });
          conflictStore.createIndex("status", "status", { unique: false });
          conflictStore.createIndex("riskLevel", "riskLevel", {
            unique: false,
          });
          conflictStore.createIndex("predictedTime", "predictedTime", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains(STORES.MITIGATIONS)) {
          const mitigationStore = db.createObjectStore(STORES.MITIGATIONS, {
            keyPath: "id",
          });
          mitigationStore.createIndex("conflictId", "conflictId", {
            unique: false,
          });
          mitigationStore.createIndex("status", "status", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SEMANTIC_MAPPINGS)) {
          const mappingStore = db.createObjectStore(STORES.SEMANTIC_MAPPINGS, {
            keyPath: "id",
          });
          mappingStore.createIndex(
            ["sourceSystem", "targetSystem"],
            "sourceSystem_targetSystem",
            { unique: false }
          );
          mappingStore.createIndex("entityType", "entityType", {
            unique: false,
          });
        }
      },
    });

    return this.db;
  }

  private async getDB(): Promise<IDBPDatabase> {
    if (!this.db) {
      return this.init();
    }
    return this.db;
  }

  async saveBlackBoxSnapshot(
    snapshot: BlackBoxSnapshot
  ): Promise<string> {
    const db = await this.getDB();
    await db.put(STORES.BLACKBOX_SNAPSHOTS, snapshot);
    return snapshot.id;
  }

  async getBlackBoxSnapshots(
    flightPlanId?: string,
    startTime?: number,
    endTime?: number
  ): Promise<BlackBoxSnapshot[]> {
    const db = await this.getDB();
    let snapshots: BlackBoxSnapshot[] = [];

    if (flightPlanId) {
      const index = db
        .transaction(STORES.BLACKBOX_SNAPSHOTS, "readonly")
        .store.index("flightPlanId");
      snapshots = await index.getAll(flightPlanId);
    } else {
      snapshots = await db.getAll(STORES.BLACKBOX_SNAPSHOTS);
    }

    if (startTime || endTime) {
      return snapshots.filter((s) => {
        if (startTime && s.snapshotTime < startTime) return false;
        if (endTime && s.snapshotTime > endTime) return false;
        return true;
      });
    }

    return snapshots;
  }

  async getLatestBlackBoxSnapshot(
    flightPlanId: string
  ): Promise<BlackBoxSnapshot | null> {
    const db = await this.getDB();
    const index = db
      .transaction(STORES.BLACKBOX_SNAPSHOTS, "readonly")
      .store.index("snapshotTime");
    const snapshots = await index.getAll();
    const flightSnapshots = snapshots.filter(
      (s: BlackBoxSnapshot) => s.flightPlanId === flightPlanId
    );
    return flightSnapshots.length > 0
      ? flightSnapshots[flightSnapshots.length - 1]
      : null;
  }

  async deleteOldBlackBoxSnapshots(
    flightPlanId: string,
    keepCount: number = 100
  ): Promise<void> {
    const snapshots = await this.getBlackBoxSnapshots(flightPlanId);
    if (snapshots.length <= keepCount) return;

    const db = await this.getDB();
    const toDelete = snapshots
      .sort((a, b) => b.snapshotTime - a.snapshotTime)
      .slice(keepCount);

    const tx = db.transaction(STORES.BLACKBOX_SNAPSHOTS, "readwrite");
    for (const snapshot of toDelete) {
      await tx.store.delete(snapshot.id);
    }
    await tx.done;
  }

  async saveFlightPlan(flightPlan: FlightPlan): Promise<string> {
    const db = await this.getDB();
    await db.put(STORES.FLIGHT_PLANS, flightPlan);
    return flightPlan.id;
  }

  async getFlightPlans(status?: FlightPlan["status"]): Promise<FlightPlan[]> {
    const db = await this.getDB();
    if (status) {
      const index = db
        .transaction(STORES.FLIGHT_PLANS, "readonly")
        .store.index("status");
      return index.getAll(status);
    }
    return db.getAll(STORES.FLIGHT_PLANS);
  }

  async getFlightPlan(id: string): Promise<FlightPlan | undefined> {
    const db = await this.getDB();
    return db.get(STORES.FLIGHT_PLANS, id);
  }

  async saveFlightRoute(route: FlightRoute): Promise<string> {
    const db = await this.getDB();
    await db.put(STORES.FLIGHT_ROUTES, route);
    return route.id;
  }

  async getFlightRoutes(): Promise<FlightRoute[]> {
    const db = await this.getDB();
    return db.getAll(STORES.FLIGHT_ROUTES);
  }

  async saveAircraft(aircraft: Aircraft): Promise<string> {
    const db = await this.getDB();
    await db.put(STORES.AIRCRAFT, aircraft);
    return aircraft.id;
  }

  async getAircraft(): Promise<Aircraft[]> {
    const db = await this.getDB();
    return db.getAll(STORES.AIRCRAFT);
  }

  async saveConflict(conflict: ConflictDetectionResult): Promise<string> {
    const db = await this.getDB();
    await db.put(STORES.CONFLICTS, conflict);
    return conflict.id;
  }

  async getConflicts(
    status?: ConflictDetectionResult["status"]
  ): Promise<ConflictDetectionResult[]> {
    const db = await this.getDB();
    if (status) {
      const index = db
        .transaction(STORES.CONFLICTS, "readonly")
        .store.index("status");
      return index.getAll(status);
    }
    return db.getAll(STORES.CONFLICTS);
  }

  async saveMitigation(mitigation: MitigationAction): Promise<string> {
    const db = await this.getDB();
    await db.put(STORES.MITIGATIONS, mitigation);
    return mitigation.id;
  }

  async getMitigations(
    conflictId?: string
  ): Promise<MitigationAction[]> {
    const db = await this.getDB();
    if (conflictId) {
      const index = db
        .transaction(STORES.MITIGATIONS, "readonly")
        .store.index("conflictId");
      return index.getAll(conflictId);
    }
    return db.getAll(STORES.MITIGATIONS);
  }

  async saveSemanticMapping(mapping: SemanticMapping): Promise<string> {
    const db = await this.getDB();
    await db.put(STORES.SEMANTIC_MAPPINGS, mapping);
    return mapping.id;
  }

  async getSemanticMappings(
    sourceSystem?: SemanticMapping["sourceSystem"],
    targetSystem?: SemanticMapping["targetSystem"]
  ): Promise<SemanticMapping[]> {
    const db = await this.getDB();
    const mappings = await db.getAll(STORES.SEMANTIC_MAPPINGS);

    if (sourceSystem && targetSystem) {
      return mappings.filter(
        (m) => m.sourceSystem === sourceSystem && m.targetSystem === targetSystem
      );
    }
    return mappings;
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(
      Object.values(STORES),
      "readwrite"
    );
    for (const storeName of Object.values(STORES)) {
      await tx.objectStore(storeName).clear();
    }
    await tx.done;
  }
}

export const dbService = new DatabaseService();
