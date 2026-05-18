import { getDB } from './index'
import type { Alert, AlertSeverity } from '@/types'

export async function addAlert(alert: Alert): Promise<string> {
  const db = await getDB()
  return db.put('alerts', alert) as Promise<string>
}

export async function addAlerts(alerts: Alert[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('alerts', 'readwrite')
  await Promise.all(alerts.map(a => tx.store.put(a)))
  await tx.done
}

export async function getAlertById(id: string): Promise<Alert | undefined> {
  const db = await getDB()
  return db.get('alerts', id)
}

export async function getAlerts(
  filters?: {
    severity?: AlertSeverity
    status?: Alert['status']
    deviceId?: string
  },
  limit?: number,
  offset?: number
): Promise<Alert[]> {
  const db = await getDB()
  const tx = db.transaction('alerts', 'readonly')
  const index = tx.store.index('by-timestamp')

  const alerts: Alert[] = []
  let count = 0
  let skip = offset || 0

  let cursor = await index.openCursor(null, 'prev')
  while (cursor) {
    const alert = cursor.value
    let match = true

    if (filters?.severity && alert.severity !== filters.severity) match = false
    if (filters?.status && alert.status !== filters.status) match = false
    if (filters?.deviceId && alert.deviceId !== filters.deviceId) match = false

    if (match) {
      if (skip > 0) {
        skip--
      } else {
        alerts.push(alert)
        count++
        if (limit && count >= limit) break
      }
    }

    cursor = await cursor.continue()
  }

  await tx.done
  return alerts
}

export async function getAlertCount(filters?: {
  severity?: AlertSeverity
  status?: Alert['status']
  deviceId?: string
}): Promise<number> {
  const alerts = await getAlerts(filters)
  return alerts.length
}

export async function updateAlertStatus(id: string, status: Alert['status'], acknowledgedBy?: string): Promise<void> {
  const db = await getDB()
  const alert = await db.get('alerts', id)
  if (alert) {
    const updates: Partial<Alert> = { status }
    if (status === 'acknowledged') {
      updates.acknowledgedAt = Date.now()
      updates.acknowledgedBy = acknowledgedBy
    } else if (status === 'resolved') {
      updates.resolvedAt = Date.now()
    }
    await db.put('alerts', { ...alert, ...updates })
  }
}

export async function deleteAlert(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('alerts', id)
}

export async function getUnacknowledgedCount(): Promise<number> {
  const db = await getDB()
  const tx = db.transaction('alerts', 'readonly')
  const index = tx.store.index('by-status')
  const range = IDBKeyRange.only('pending')
  const count = await index.count(range)
  await tx.done
  return count
}
