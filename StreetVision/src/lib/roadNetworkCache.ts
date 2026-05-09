import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { RoadNetworkTile, BoundingBox, VisibilityAnalysisResult, StreetPerceptionScore } from '../types';

interface StreetVisionDB extends DBSchema {
  roadTiles: {
    key: string;
    value: RoadNetworkTile;
    indexes: { 'by-zoom': number; 'by-createdAt': number };
  };
  visibilityResults: {
    key: string;
    value: VisibilityAnalysisResult;
    indexes: { 'by-viewpoint': string; 'by-timestamp': number };
  };
  perceptionScores: {
    key: string;
    value: StreetPerceptionScore;
    indexes: { 'by-segment': string };
  };
}

const DB_NAME = 'street-vision-db';
const DB_VERSION = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase<StreetVisionDB>> | null = null;

function getDB(): Promise<IDBPDatabase<StreetVisionDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StreetVisionDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('roadTiles')) {
          const tileStore = db.createObjectStore('roadTiles', { keyPath: 'tileKey' });
          tileStore.createIndex('by-zoom', 'zoom');
          tileStore.createIndex('by-createdAt', 'createdAt');
        }

        if (!db.objectStoreNames.contains('visibilityResults')) {
          const visibilityStore = db.createObjectStore('visibilityResults', {
            keyPath: 'viewpointId'
          });
          visibilityStore.createIndex('by-viewpoint', 'viewpointId');
          visibilityStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('perceptionScores')) {
          const perceptionStore = db.createObjectStore('perceptionScores', {
            keyPath: 'segmentId'
          });
          perceptionStore.createIndex('by-segment', 'segmentId');
        }
      }
    });
  }
  return dbPromise;
}

function generateTileKey(zoom: number, x: number, y: number): string {
  return `${zoom}/${x}/${y}`;
}

function bboxToTileCoords(bbox: BoundingBox, zoom: number): { minX: number; minY: number; maxX: number; maxY: number } {
  const worldSize = 256 * Math.pow(2, zoom);
  const minX = Math.floor((bbox.minX / worldSize) * Math.pow(2, zoom));
  const minY = Math.floor((bbox.minY / worldSize) * Math.pow(2, zoom));
  const maxX = Math.ceil((bbox.maxX / worldSize) * Math.pow(2, zoom));
  const maxY = Math.ceil((bbox.maxY / worldSize) * Math.pow(2, zoom));

  return { minX, minY, maxX, maxY };
}

export async function cacheRoadTile(tile: RoadNetworkTile): Promise<void> {
  const db = await getDB();
  const tileWithExpiry: RoadNetworkTile = {
    ...tile,
    expiresAt: Date.now() + CACHE_TTL_MS
  };
  await db.put('roadTiles', tileWithExpiry);
}

export async function getRoadTile(zoom: number, x: number, y: number): Promise<RoadNetworkTile | undefined> {
  const db = await getDB();
  const tileKey = generateTileKey(zoom, x, y);
  const tile = await db.get('roadTiles', tileKey);

  if (tile) {
    if (tile.expiresAt && tile.expiresAt < Date.now()) {
      await db.delete('roadTiles', tileKey);
      return undefined;
    }
  }

  return tile;
}

export async function getRoadTilesInBBox(bbox: BoundingBox, zoom: number): Promise<RoadNetworkTile[]> {
  const coords = bboxToTileCoords(bbox, zoom);
  const tiles: RoadNetworkTile[] = [];

  for (let x = coords.minX; x <= coords.maxX; x++) {
    for (let y = coords.minY; y <= coords.maxY; y++) {
      const tile = await getRoadTile(zoom, x, y);
      if (tile) {
        tiles.push(tile);
      }
    }
  }

  return tiles;
}

export async function cacheVisibilityResult(result: VisibilityAnalysisResult): Promise<void> {
  const db = await getDB();
  await db.put('visibilityResults', result);
}

export async function getVisibilityResult(viewpointId: string): Promise<VisibilityAnalysisResult | undefined> {
  const db = await getDB();
  return await db.get('visibilityResults', viewpointId);
}

export async function cachePerceptionScore(score: StreetPerceptionScore): Promise<void> {
  const db = await getDB();
  await db.put('perceptionScores', score);
}

export async function cachePerceptionScores(scores: StreetPerceptionScore[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('perceptionScores', 'readwrite');
  for (const score of scores) {
    tx.store.put(score);
  }
  await tx.done;
}

export async function getPerceptionScore(segmentId: string): Promise<StreetPerceptionScore | undefined> {
  const db = await getDB();
  return await db.get('perceptionScores', segmentId);
}

export async function clearExpiredCache(): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  const tx = db.transaction('roadTiles', 'readwrite');
  const index = tx.store.index('by-createdAt');

  for await (const cursor of index.iterate()) {
    const tile = cursor.value;
    if (tile.expiresAt && tile.expiresAt < now) {
      cursor.delete();
    }
  }

  await tx.done;
}

export async function getCacheStats(): Promise<{
  tileCount: number;
  visibilityCount: number;
  perceptionCount: number;
}> {
  const db = await getDB();
  const [tileCount, visibilityCount, perceptionCount] = await Promise.all([
    db.count('roadTiles'),
    db.count('visibilityResults'),
    db.count('perceptionScores')
  ]);

  return {
    tileCount,
    visibilityCount,
    perceptionCount
  };
}

export { generateTileKey };
