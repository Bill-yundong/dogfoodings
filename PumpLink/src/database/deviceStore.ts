import { getDB } from './index'
import type { PumpDevice } from '@/types'

export async function getAllDevices(): Promise<PumpDevice[]> {
  const db = await getDB()
  return db.getAll('devices')
}

export async function getDeviceById(id: string): Promise<PumpDevice | undefined> {
  const db = await getDB()
  return db.get('devices', id)
}

export async function getDevicesByRegion(region: string): Promise<PumpDevice[]> {
  const db = await getDB()
  return db.getAllFromIndex('devices', 'by-region', region)
}

export async function getDevicesByStatus(status: PumpDevice['currentStatus']): Promise<PumpDevice[]> {
  const db = await getDB()
  return db.getAllFromIndex('devices', 'by-status', status)
}

export async function addDevice(device: PumpDevice): Promise<string> {
  const db = await getDB()
  return db.put('devices', device) as Promise<string>
}

export async function addDevices(devices: PumpDevice[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('devices', 'readwrite')
  await Promise.all(devices.map(d => tx.store.put(d)))
  await tx.done
}

export async function updateDevice(id: string, updates: Partial<PumpDevice>): Promise<void> {
  const db = await getDB()
  const device = await db.get('devices', id)
  if (device) {
    await db.put('devices', { ...device, ...updates })
  }
}

export async function deleteDevice(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('devices', id)
}

export async function getDeviceStats(): Promise<{ total: number; running: number; standby: number; maintenance: number; fault: number }> {
  const devices = await getAllDevices()
  return {
    total: devices.length,
    running: devices.filter(d => d.currentStatus === 'running').length,
    standby: devices.filter(d => d.currentStatus === 'standby').length,
    maintenance: devices.filter(d => d.currentStatus === 'maintenance').length,
    fault: devices.filter(d => d.currentStatus === 'fault').length
  }
}

export async function getRegionStats(): Promise<Map<string, { count: number; avgHealth: number }>> {
  const devices = await getAllDevices()
  const regionMap = new Map<string, { total: number; healthSum: number }>()

  for (const device of devices) {
    const existing = regionMap.get(device.region) || { total: 0, healthSum: 0 }
    existing.total++
    existing.healthSum += device.healthScore
    regionMap.set(device.region, existing)
  }

  const result = new Map<string, { count: number; avgHealth: number }>()
  for (const [region, data] of regionMap) {
    result.set(region, {
      count: data.total,
      avgHealth: data.total > 0 ? Math.round(data.healthSum / data.total) : 0
    })
  }

  return result
}
