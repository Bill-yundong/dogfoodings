import { getDB } from './index'
import type { VibrationSignal } from '@/types'

export async function addSignal(signal: VibrationSignal): Promise<string> {
  const db = await getDB()
  return db.put('vibration_signals', signal) as Promise<string>
}

export async function addSignals(signals: VibrationSignal[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('vibration_signals', 'readwrite')
  await Promise.all(signals.map(s => tx.store.put(s)))
  await tx.done
}

export async function getSignalById(id: string): Promise<VibrationSignal | undefined> {
  const db = await getDB()
  return db.get('vibration_signals', id)
}

export async function getSignalsByDevice(
  deviceId: string,
  limit?: number
): Promise<VibrationSignal[]> {
  const db = await getDB()
  const tx = db.transaction('vibration_signals', 'readonly')
  const index = tx.store.index('by-device')
  const range = IDBKeyRange.only(deviceId)

  const signals: VibrationSignal[] = []
  let count = 0
  let cursor = await index.openCursor(range, 'prev')

  while (cursor) {
    signals.push(cursor.value)
    count++
    if (limit && count >= limit) break
    cursor = await cursor.continue()
  }

  await tx.done
  return signals
}

export async function getLatestSignal(deviceId: string): Promise<VibrationSignal | undefined> {
  const signals = await getSignalsByDevice(deviceId, 1)
  return signals[0]
}

export async function deleteSignalsByDevice(deviceId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('vibration_signals', 'readwrite')
  const index = tx.store.index('by-device')
  const range = IDBKeyRange.only(deviceId)

  let cursor = await index.openCursor(range)
  while (cursor) {
    await cursor.delete()
    cursor = await cursor.continue()
  }

  await tx.done
}
