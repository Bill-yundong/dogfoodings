import type { TemperaturePoint, SensorMetaData } from '@/types';
import { getDB, batchInsert } from './index';

export async function insertSensorData(data: TemperaturePoint): Promise<void> {
  const db = await getDB();
  const key = `${data.timestamp}_${data.sensorId}`;
  await db.put('sensor_data', data, key);
}

export async function insertSensorDataBatch(data: TemperaturePoint[]): Promise<void> {
  await batchInsert(
    'sensor_data',
    data,
    (item) => `${(item as TemperaturePoint).timestamp}_${(item as TemperaturePoint).sensorId}`
  );
}

export async function getSensorDataByTimeRange(
  startTime: number,
  endTime: number,
  sensorId?: string
): Promise<TemperaturePoint[]> {
  const db = await getDB();
  const tx = db.transaction('sensor_data', 'readonly');
  const store = tx.objectStore('sensor_data');

  let results: TemperaturePoint[];

  if (sensorId) {
    const index = store.index('by-sensor-timestamp');
    results = await index.getAll(IDBKeyRange.bound([sensorId, startTime], [sensorId, endTime]));
  } else {
    const index = store.index('by-timestamp');
    results = await index.getAll(IDBKeyRange.bound(startTime, endTime));
  }

  await tx.done;
  return results;
}

export async function getLatestSensorData(sensorId?: string): Promise<TemperaturePoint | null> {
  const db = await getDB();
  const tx = db.transaction('sensor_data', 'readonly');
  const store = tx.objectStore('sensor_data');

  let cursor;
  if (sensorId) {
    const index = store.index('by-sensor-timestamp');
    cursor = await index.openCursor(IDBKeyRange.lowerBound([sensorId, 0]), 'prev');
  } else {
    const index = store.index('by-timestamp');
    cursor = await index.openCursor(null, 'prev');
  }

  const result = cursor ? cursor.value : null;
  await tx.done;
  return result;
}

export async function getSensorDataAggregates(
  startTime: number,
  endTime: number,
  sensorId?: string,
  intervalMs: number = 3600000
): Promise<Array<{
  timestamp: number;
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  avgCurrent: number;
  count: number;
}>> {
  const data = await getSensorDataByTimeRange(startTime, endTime, sensorId);

  if (data.length === 0) return [];

  const buckets = new Map<number, TemperaturePoint[]>();

  for (const point of data) {
    const bucketKey = Math.floor(point.timestamp / intervalMs) * intervalMs;
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(point);
  }

  const aggregates = Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, points]) => ({
      timestamp,
      avgTemp: points.reduce((sum, p) => sum + p.temperature, 0) / points.length,
      maxTemp: Math.max(...points.map(p => p.temperature)),
      minTemp: Math.min(...points.map(p => p.temperature)),
      avgCurrent: points.reduce((sum, p) => sum + p.current, 0) / points.length,
      count: points.length
    }));

  return aggregates;
}

export async function upsertSensorMetadata(metadata: SensorMetaData): Promise<void> {
  const db = await getDB();
  await db.put('sensor_metadata', metadata);
}

export async function getSensorMetadata(sensorId: string): Promise<SensorMetaData | undefined> {
  const db = await getDB();
  return await db.get('sensor_metadata', sensorId);
}

export async function getAllSensorMetadata(): Promise<SensorMetaData[]> {
  const db = await getDB();
  return await db.getAll('sensor_metadata');
}

export async function getDistinctSensorIds(): Promise<string[]> {
  const db = await getDB();
  const tx = db.transaction('sensor_data', 'readonly');
  const store = tx.objectStore('sensor_data');
  const index = store.index('by-sensor');

  const sensorIds = new Set<string>();
  let cursor = await index.openCursor(null, 'nextunique');

  while (cursor) {
    sensorIds.add(cursor.primaryKey as string);
    cursor = await cursor.continue();
  }

  await tx.done;
  return Array.from(sensorIds);
}

export async function deleteSensorDataBefore(cutoffTime: number): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('sensor_data', 'readwrite');
  const store = tx.objectStore('sensor_data');
  const index = store.index('by-timestamp');

  let count = 0;
  let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffTime));

  while (cursor) {
    await cursor.delete();
    count++;
    cursor = await cursor.continue();
  }

  await tx.done;
  return count;
}
