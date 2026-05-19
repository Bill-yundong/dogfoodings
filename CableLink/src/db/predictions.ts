import type { PredictionResult } from '@/types';
import { getDB } from './index';

export async function insertPrediction(prediction: PredictionResult): Promise<void> {
  const db = await getDB();
  const key = `${prediction.timestamp}_${prediction.horizon}`;
  await db.put('predictions', prediction, key);
}

export async function insertPredictionBatch(predictions: PredictionResult[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('predictions', 'readwrite');

  for (const prediction of predictions) {
    const key = `${prediction.timestamp}_${prediction.horizon}`;
    await tx.store.put(prediction, key);
  }

  await tx.done;
}

export async function getPredictionsByTimeRange(
  startTime: number,
  endTime: number,
  horizon?: number
): Promise<PredictionResult[]> {
  const db = await getDB();
  const tx = db.transaction('predictions', 'readonly');
  const store = tx.objectStore('predictions');

  let results: PredictionResult[];

  if (horizon !== undefined) {
    const index = store.index('by-horizon');
    results = await index.getAll(horizon);
    results = results.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
  } else {
    const index = store.index('by-timestamp');
    results = await index.getAll(IDBKeyRange.bound(startTime, endTime));
  }

  results.sort((a, b) => a.timestamp - b.timestamp);

  await tx.done;
  return results;
}

export async function getLatestPrediction(horizon?: number): Promise<PredictionResult | null> {
  const db = await getDB();
  const tx = db.transaction('predictions', 'readonly');
  const store = tx.objectStore('predictions');

  let cursor;
  if (horizon !== undefined) {
    const index = store.index('by-horizon');
    const range = IDBKeyRange.bound(
      [horizon, 0],
      [horizon, Date.now()]
    );
    cursor = await index.openCursor(range, 'prev');
  } else {
    const index = store.index('by-timestamp');
    cursor = await index.openCursor(null, 'prev');
  }

  const result = cursor ? cursor.value : null;
  await tx.done;
  return result;
}

export async function getPredictionAccuracy(
  startTime: number,
  endTime: number
): Promise<Array<{
  predictionTime: number;
  horizon: number;
  predictedTemp: number;
  actualTemp: number | null;
  error: number | null;
}>> {
  const predictions = await getPredictionsByTimeRange(startTime, endTime);

  if (predictions.length === 0) return [];

  const db = await getDB();
  const sensorTx = db.transaction('sensor_data', 'readonly');
  const sensorIndex = sensorTx.objectStore('sensor_data').index('by-timestamp');

  const results = [];

  for (const pred of predictions) {
    for (const forecast of pred.temperatureForecast) {
      const actualData = await sensorIndex.get(forecast.time);
      const actualTemp = actualData ? actualData.temperature : null;
      const error = actualTemp !== null ? forecast.temp - actualTemp : null;

      results.push({
        predictionTime: pred.timestamp,
        horizon: pred.horizon,
        predictedTemp: forecast.temp,
        actualTemp,
        error
      });
    }
  }

  await sensorTx.done;
  return results;
}

export async function deletePredictionsBefore(cutoffTime: number): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('predictions', 'readwrite');
  const store = tx.objectStore('predictions');
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
