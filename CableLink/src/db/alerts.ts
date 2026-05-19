import type { AlertRecord, AlertSeverity, AlertStatus } from '@/types';
import { getDB } from './index';

export async function insertAlert(alert: AlertRecord): Promise<void> {
  const db = await getDB();
  await db.put('alerts', alert);
}

export async function insertAlertBatch(alerts: AlertRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('alerts', 'readwrite');

  for (const alert of alerts) {
    await tx.store.put(alert);
  }

  await tx.done;
}

export async function getAlerts(
  options: {
    status?: AlertStatus;
    severity?: AlertSeverity;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<AlertRecord[]> {
  const db = await getDB();
  const tx = db.transaction('alerts', 'readonly');
  const store = tx.objectStore('alerts');

  let results: AlertRecord[];

  if (options.status && options.severity) {
    const index = store.index('by-status-severity');
    results = await index.getAll([options.status, options.severity]);
  } else if (options.status) {
    const index = store.index('by-status');
    results = await index.getAll(options.status);
  } else if (options.severity) {
    const index = store.index('by-severity');
    results = await index.getAll(options.severity);
  } else {
    const index = store.index('by-timestamp');
    results = await index.getAll();
    results.reverse();
  }

  if (options.startTime) {
    results = results.filter(a => a.timestamp >= options.startTime!);
  }
  if (options.endTime) {
    results = results.filter(a => a.timestamp <= options.endTime!);
  }

  results.sort((a, b) => b.timestamp - a.timestamp);

  if (options.offset) {
    results = results.slice(options.offset);
  }
  if (options.limit) {
    results = results.slice(0, options.limit);
  }

  await tx.done;
  return results;
}

export async function getAlertById(alertId: string): Promise<AlertRecord | undefined> {
  const db = await getDB();
  return await db.get('alerts', alertId);
}

export async function updateAlertStatus(
  alertId: string,
  status: AlertStatus,
  acknowledgedBy?: string
): Promise<void> {
  const db = await getDB();
  const alert = await db.get('alerts', alertId);

  if (!alert) {
    throw new Error(`Alert ${alertId} not found`);
  }

  alert.status = status;
  if (status === 'acknowledged' && acknowledgedBy) {
    alert.acknowledgedBy = acknowledgedBy;
  }
  if (status === 'resolved') {
    alert.resolvedAt = Date.now();
  }

  await db.put('alerts', alert);
}

export async function getAlertCounts(): Promise<{
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: { info: number; warning: number; danger: number };
}> {
  const db = await getDB();
  const tx = db.transaction('alerts', 'readonly');
  const store = tx.objectStore('alerts');

  const allAlerts = await store.getAll();

  const counts = {
    total: allAlerts.length,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    bySeverity: { info: 0, warning: 0, danger: 0 }
  };

  for (const alert of allAlerts) {
    counts[alert.status]++;
    counts.bySeverity[alert.severity]++;
  }

  await tx.done;
  return counts;
}

export async function getRecentAlerts(limit: number = 10): Promise<AlertRecord[]> {
  return getAlerts({ limit, status: 'active' });
}

export async function deleteResolvedAlertsBefore(cutoffTime: number): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('alerts', 'readwrite');
  const store = tx.objectStore('alerts');
  const index = store.index('by-status-severity');

  let count = 0;
  const severities: AlertSeverity[] = ['info', 'warning', 'danger'];

  for (const severity of severities) {
    let cursor = await index.openCursor(IDBKeyRange.bound(
      ['resolved', severity],
      ['resolved', severity]
    ));

    while (cursor) {
      if (cursor.value.timestamp < cutoffTime) {
        await cursor.delete();
        count++;
      }
      cursor = await cursor.continue();
    }
  }

  await tx.done;
  return count;
}
