import { openDB, IDBPDatabase, DBSchema, StoreKey, IDBPTransaction } from "idb";
import { DiaryEntry, HealthProfile, EmotionInsight, EncryptedData, DatabaseStats } from "@/types";
import { DATABASE_NAME, DATABASE_VERSION, ENABLE_ENCRYPTION } from "@/lib/constants";
import { encryptData, decryptData, generateChecksum, getMasterKey, EncryptionError } from "@/lib/crypto";
import { generateId } from "@/lib/utils";

interface SoulPulseDB extends DBSchema {
  entries: {
    key: string;
    value: EncryptedData | DiaryEntry;
    indexes: {
      "by-createdAt": number;
      "by-updatedAt": number;
      "by-mood": string;
      "by-sentiment": number;
    };
  };
  profiles: {
    key: string;
    value: EncryptedData | HealthProfile;
    indexes: {
      "by-userId": string;
      "by-lastUpdated": number;
    };
  };
  insights: {
    key: string;
    value: EncryptedData | EmotionInsight;
    indexes: {
      "by-timestamp": number;
      "by-type": string;
      "by-confidence": number;
    };
  };
  metadata: {
    key: string;
    value: unknown;
  };
}

const STORE_NAMES = ["entries", "profiles", "insights", "metadata"] as const;

type StoreName = typeof STORE_NAMES[number];

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

class SoulPulseDatabase {
  private db: IDBPDatabase<SoulPulseDB> | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<void> {
    try {
      this.db = await openDB<SoulPulseDB>(DATABASE_NAME, DATABASE_VERSION, {
        upgrade: (db, oldVersion, newVersion, transaction) => {
          this.createObjectStores(db);
          this.createIndexes(db, transaction);
        },
        blocked: () => {
          throw new DatabaseError("Database is blocked by another tab");
        },
        blocking: () => {
          this.close();
        },
        terminated: () => {
          this.db = null;
          this.initPromise = null;
        },
      });
    } catch (error) {
      this.initPromise = null;
      throw new DatabaseError(`Failed to initialize database: ${error}`);
    }
  }

  private createObjectStores(db: IDBPDatabase<SoulPulseDB>): void {
    if (!db.objectStoreNames.contains("entries")) {
      const entriesStore = db.createObjectStore("entries", { keyPath: "id" });
      entriesStore.createIndex("by-createdAt", "createdAt", { unique: false });
      entriesStore.createIndex("by-updatedAt", "updatedAt", { unique: false });
      entriesStore.createIndex("by-mood", "mood", { unique: false });
      entriesStore.createIndex("by-sentiment", "sentimentScore", { unique: false });
    }

    if (!db.objectStoreNames.contains("profiles")) {
      const profilesStore = db.createObjectStore("profiles", { keyPath: "id" });
      profilesStore.createIndex("by-userId", "userId", { unique: true });
      profilesStore.createIndex("by-lastUpdated", "lastUpdated", { unique: false });
    }

    if (!db.objectStoreNames.contains("insights")) {
      const insightsStore = db.createObjectStore("insights", { keyPath: "id" });
      insightsStore.createIndex("by-timestamp", "timestamp", { unique: false });
      insightsStore.createIndex("by-type", "type", { unique: false });
      insightsStore.createIndex("by-confidence", "confidence", { unique: false });
    }

    if (!db.objectStoreNames.contains("metadata")) {
      db.createObjectStore("metadata");
    }
  }

  private createIndexes(
    db: IDBPDatabase<SoulPulseDB>,
    _transaction: IDBPTransaction<SoulPulseDB, StoreName[], "versionchange">
  ): void {
    const existingStores = Array.from(db.objectStoreNames);

    for (const storeName of STORE_NAMES) {
      if (existingStores.includes(storeName as StoreName)) {
        // Indexes are created during store creation
      }
    }
  }

  private async getDB(): Promise<IDBPDatabase<SoulPulseDB>> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new DatabaseError("Database not initialized");
    }
    return this.db;
  }

  private async encryptIfNeeded<T extends { id: string }>(data: T): Promise<T | EncryptedData> {
    if (!ENABLE_ENCRYPTION) {
      return data;
    }

    const key = getMasterKey();
    if (!key) {
      throw new DatabaseError("Encryption key not available");
    }

    try {
      const encrypted = encryptData(data, key);
      return {
        ...encrypted,
        id: data.id,
      } as T | EncryptedData;
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw new DatabaseError(error.message);
      }
      throw new DatabaseError(`Failed to encrypt data: ${error}`);
    }
  }

  private async decryptIfNeeded<T>(data: T | EncryptedData): Promise<T> {
    if (!ENABLE_ENCRYPTION || !this.isEncryptedData(data)) {
      return data as T;
    }

    const key = getMasterKey();
    if (!key) {
      throw new DatabaseError("Decryption key not available");
    }

    try {
      return decryptData<T>(data as EncryptedData, key);
    } catch (error) {
      if (error instanceof EncryptionError) {
        throw new DatabaseError(error.message);
      }
      throw new DatabaseError(`Failed to decrypt data: ${error}`);
    }
  }

  private isEncryptedData(data: unknown): data is EncryptedData {
    if (!data || typeof data !== "object") return false;
    const obj = data as Record<string, unknown>;
    return "encryptedData" in obj && "iv" in obj && "salt" in obj;
  }

  async addEntry(entry: Omit<DiaryEntry, "id" | "checksum">): Promise<DiaryEntry> {
    const db = await this.getDB();
    const id = generateId();
    const checksum = generateChecksum(entry.content + entry.title);

    const fullEntry: DiaryEntry = {
      ...entry,
      id,
      checksum,
      isEncrypted: ENABLE_ENCRYPTION,
    };

    const storedEntry = await this.encryptIfNeeded(fullEntry);
    await db.add("entries", storedEntry);

    return fullEntry;
  }

  async updateEntry(entry: DiaryEntry): Promise<DiaryEntry> {
    const db = await this.getDB();
    const checksum = generateChecksum(entry.content + entry.title);

    const updatedEntry: DiaryEntry = {
      ...entry,
      updatedAt: Date.now(),
      checksum,
      isEncrypted: ENABLE_ENCRYPTION,
    };

    const storedEntry = await this.encryptIfNeeded(updatedEntry);
    await db.put("entries", storedEntry);

    return updatedEntry;
  }

  async getEntry(id: string): Promise<DiaryEntry | null> {
    const db = await this.getDB();
    const stored = await db.get("entries", id);
    if (!stored) return null;
    return this.decryptIfNeeded<DiaryEntry>(stored);
  }

  async getAllEntries(limit?: number, offset?: number): Promise<DiaryEntry[]> {
    const db = await this.getDB();
    const items = await db.getAllFromIndex("entries", "by-createdAt", undefined, limit);

    const results = await Promise.all(
      items.map((item) => this.decryptIfNeeded<DiaryEntry>(item))
    );

    if (offset) {
      return results.slice(offset);
    }

    return results;
  }

  async getEntriesByDateRange(startTime: number, endTime: number): Promise<DiaryEntry[]> {
    const db = await this.getDB();
    const range = IDBKeyRange.bound(startTime, endTime);
    const items = await db.getAllFromIndex("entries", "by-createdAt", range);

    return Promise.all(items.map((item) => this.decryptIfNeeded<DiaryEntry>(item)));
  }

  async getEntriesByMood(mood: string): Promise<DiaryEntry[]> {
    const db = await this.getDB();
    const items = await db.getAllFromIndex("entries", "by-mood", IDBKeyRange.only(mood));

    return Promise.all(items.map((item) => this.decryptIfNeeded<DiaryEntry>(item)));
  }

  async deleteEntry(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete("entries", id);
  }

  async countEntries(): Promise<number> {
    const db = await this.getDB();
    return db.count("entries");
  }

  async saveProfile(profile: Omit<HealthProfile, "id"> & { id?: string }): Promise<HealthProfile> {
    const db = await this.getDB();
    const id = profile.id || generateId();

    const fullProfile: HealthProfile = {
      ...profile,
      id,
      lastUpdated: Date.now(),
    };

    const storedProfile = await this.encryptIfNeeded(fullProfile);
    await db.put("profiles", storedProfile);

    return fullProfile;
  }

  async getProfile(userId: string): Promise<HealthProfile | null> {
    const db = await this.getDB();
    const items = await db.getAllFromIndex("profiles", "by-userId", IDBKeyRange.only(userId));
    if (items.length === 0) return null;

    return this.decryptIfNeeded<HealthProfile>(items[0]);
  }

  async addInsight(insight: Omit<EmotionInsight, "id">): Promise<EmotionInsight> {
    const db = await this.getDB();
    const id = generateId();

    const fullInsight: EmotionInsight = {
      ...insight,
      id,
    };

    const storedInsight = await this.encryptIfNeeded(fullInsight);
    await db.add("insights", storedInsight);

    return fullInsight;
  }

  async getInsights(limit?: number): Promise<EmotionInsight[]> {
    const db = await this.getDB();
    const items = await db.getAllFromIndex("insights", "by-timestamp", undefined, limit);

    return Promise.all(items.map((item) => this.decryptIfNeeded<EmotionInsight>(item)));
  }

  async getInsightsByType(type: string): Promise<EmotionInsight[]> {
    const db = await this.getDB();
    const items = await db.getAllFromIndex("insights", "by-type", IDBKeyRange.only(type));

    return Promise.all(items.map((item) => this.decryptIfNeeded<EmotionInsight>(item)));
  }

  async deleteInsight(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete("insights", id);
  }

  async setMetadata(key: string, value: unknown): Promise<void> {
    const db = await this.getDB();
    await db.put("metadata", value, key);
  }

  async getMetadata<T>(key: string): Promise<T | null> {
    const db = await this.getDB();
    const value = await db.get("metadata", key);
    return (value as T) || null;
  }

  async getStats(): Promise<DatabaseStats> {
    const db = await this.getDB();

    const [totalEntries, lastSync] = await Promise.all([
      db.count("entries"),
      this.getMetadata<number>("lastSync"),
    ]);

    let storageUsed = 0;
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        storageUsed = estimate.usage || 0;
      } catch {
        // ignore
      }
    }

    return {
      totalEntries,
      encryptedEntries: ENABLE_ENCRYPTION ? totalEntries : 0,
      storageUsed,
      lastSync: lastSync || 0,
      databaseVersion: DATABASE_VERSION,
    };
  }

  async exportAll(): Promise<{
    entries: DiaryEntry[];
    profiles: HealthProfile[];
    insights: EmotionInsight[];
    exportedAt: number;
  }> {
    const [entries, profiles, insights] = await Promise.all([
      this.getAllEntries(),
      this.getAllProfiles(),
      this.getInsights(),
    ]);

    return {
      entries,
      profiles,
      insights,
      exportedAt: Date.now(),
    };
  }

  private async getAllProfiles(): Promise<HealthProfile[]> {
    const db = await this.getDB();
    const items = await db.getAll("profiles");
    return Promise.all(items.map((item) => this.decryptIfNeeded<HealthProfile>(item)));
  }

  async importAll(data: {
    entries: DiaryEntry[];
    profiles: HealthProfile[];
    insights: EmotionInsight[];
  }): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(["entries", "profiles", "insights"], "readwrite");

    try {
      for (const entry of data.entries) {
        const storedEntry = await this.encryptIfNeeded(entry);
        await tx.objectStore("entries").put(storedEntry);
      }

      for (const profile of data.profiles) {
        const storedProfile = await this.encryptIfNeeded(profile);
        await tx.objectStore("profiles").put(storedProfile);
      }

      for (const insight of data.insights) {
        const storedInsight = await this.encryptIfNeeded(insight);
        await tx.objectStore("insights").put(storedInsight);
      }

      await tx.done;
    } catch (error) {
      tx.abort();
      throw new DatabaseError(`Failed to import data: ${error}`);
    }
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(["entries", "profiles", "insights", "metadata"] as StoreName[], "readwrite");

    try {
      for (const storeName of STORE_NAMES) {
        await tx.objectStore(storeName as StoreName).clear();
      }
      await tx.done;
    } catch (error) {
      tx.abort();
      throw new DatabaseError(`Failed to clear database: ${error}`);
    }
  }

  async deleteDatabase(): Promise<void> {
    this.close();
    if (typeof indexedDB !== "undefined") {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DATABASE_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new DatabaseError("Database deletion blocked"));
      });
    }
    this.initPromise = null;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }

  isOpen(): boolean {
    return this.db !== null;
  }
}

export const database = new SoulPulseDatabase();

export default database;
