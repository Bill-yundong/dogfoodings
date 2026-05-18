import { getDB } from './index'
import type { FaultChain } from '@/types'

export async function addFaultChain(chain: FaultChain): Promise<string> {
  const db = await getDB()
  return db.put('fault_chains', chain) as Promise<string>
}

export async function getFaultChainById(id: string): Promise<FaultChain | undefined> {
  const db = await getDB()
  return db.get('fault_chains', id)
}

export async function getFaultChainsByDevice(deviceId: string): Promise<FaultChain[]> {
  const db = await getDB()
  return db.getAllFromIndex('fault_chains', 'by-device', deviceId)
}

export async function getFaultChainsBySeverity(severity: FaultChain['severity']): Promise<FaultChain[]> {
  const db = await getDB()
  return db.getAllFromIndex('fault_chains', 'by-severity', severity)
}

export async function getAllFaultChains(): Promise<FaultChain[]> {
  const db = await getDB()
  return db.getAll('fault_chains')
}

export async function deleteFaultChain(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('fault_chains', id)
}
