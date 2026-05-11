import { getDB } from './index'
import type { CarbonRecord, SupplyChainNode, LCACalculation, SimulationResult } from '@/types/carbon'

export class CarbonRecordRepository {
  static async add(record: Omit<CarbonRecord, 'id'>): Promise<string> {
    const db = getDB()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    await db.add('carbonRecords', {
      ...record,
      id,
      createdAt: now,
      updatedAt: now
    } as any)
    return id
  }

  static async bulkAdd(records: Omit<CarbonRecord, 'id'>[]): Promise<string[]> {
    const db = getDB()
    const tx = db.transaction('carbonRecords', 'readwrite')
    const ids: string[] = []
    const now = new Date().toISOString()

    for (const record of records) {
      const id = crypto.randomUUID()
      ids.push(id)
      await tx.store.add({
        ...record,
        id,
        createdAt: now,
        updatedAt: now
      } as any)
    }

    await tx.done
    return ids
  }

  static async getByTimeRange(start: string, end: string): Promise<CarbonRecord[]> {
    const db = getDB()
    const index = db.transaction('carbonRecords').store.index('by-timestamp')
    const records = await index.getAll(IDBKeyRange.bound(start, end))
    return records as CarbonRecord[]
  }

  static async getByScope(scope: 1 | 2 | 3): Promise<CarbonRecord[]> {
    const db = getDB()
    const index = db.transaction('carbonRecords').store.index('by-scope')
    const records = await index.getAll(scope)
    return records as CarbonRecord[]
  }

  static async getUnsynced(): Promise<CarbonRecord[]> {
    const db = getDB()
    const index = db.transaction('carbonRecords').store.index('by-sync')
    const records = await index.getAll('local')
    return records as CarbonRecord[]
  }

  static async updateSyncStatus(id: string, status: 'local' | 'synced' | 'conflict'): Promise<void> {
    const db = getDB()
    const record = await db.get('carbonRecords', id)
    if (record) {
      record.syncStatus = status
      record.updatedAt = new Date().toISOString()
      await db.put('carbonRecords', record)
    }
  }
}

export class SupplyChainRepository {
  static async add(node: Omit<SupplyChainNode, 'id'>): Promise<string> {
    const db = getDB()
    const id = crypto.randomUUID()
    await db.add('supplyChainNodes', { ...node, id, lastSynced: new Date().toISOString() } as any)
    return id
  }

  static async getByTier(tier: number): Promise<SupplyChainNode[]> {
    const db = getDB()
    const index = db.transaction('supplyChainNodes').store.index('by-tier')
    const nodes = await index.getAll(tier)
    return nodes as SupplyChainNode[]
  }

  static async getChildren(parentId: string): Promise<SupplyChainNode[]> {
    const db = getDB()
    const index = db.transaction('supplyChainNodes').store.index('by-parent')
    const nodes = await index.getAll(parentId)
    return nodes as SupplyChainNode[]
  }

  static async getAll(): Promise<SupplyChainNode[]> {
    const db = getDB()
    const nodes = await db.getAll('supplyChainNodes')
    return nodes as SupplyChainNode[]
  }

  static async incrementalSync(nodes: SupplyChainNode[]): Promise<void> {
    const db = getDB()
    const tx = db.transaction('supplyChainNodes', 'readwrite')
    const now = new Date().toISOString()

    for (const node of nodes) {
      const existing = await tx.store.get(node.id)
      if (!existing || new Date(node.lastSynced || now) > new Date(existing.lastSynced || 0)) {
        await tx.store.put({ ...node, lastSynced: now } as any)
      }
    }

    await tx.done
  }
}

export class LCARepository {
  static async create(calc: Omit<LCACalculation, 'id' | 'timestamp'>): Promise<string> {
    const db = getDB()
    const id = crypto.randomUUID()
    await db.add('lcaCalculations', {
      ...calc,
      id,
      timestamp: new Date().toISOString()
    } as any)
    return id
  }

  static async updateStatus(id: string, status: LCACalculation['status']): Promise<void> {
    const db = getDB()
    const calc = await db.get('lcaCalculations', id)
    if (calc) {
      calc.status = status
      await db.put('lcaCalculations', calc)
    }
  }

  static async updateResult(id: string, result: Partial<LCACalculation>): Promise<void> {
    const db = getDB()
    const calc = await db.get('lcaCalculations', id)
    if (calc) {
      Object.assign(calc, result)
      await db.put('lcaCalculations', calc)
    }
  }

  static async getByProduct(productId: string): Promise<LCACalculation[]> {
    const db = getDB()
    const index = db.transaction('lcaCalculations').store.index('by-product')
    const calcs = await index.getAll(productId)
    return calcs as LCACalculation[]
  }
}

export class SimulationRepository {
  static async save(result: Omit<SimulationResult, 'id' | 'timestamp'>): Promise<string> {
    const db = getDB()
    const id = crypto.randomUUID()
    await db.add('simulationResults', {
      ...result,
      id,
      timestamp: new Date().toISOString()
    } as any)
    return id
  }

  static async getAll(): Promise<SimulationResult[]> {
    const db = getDB()
    const results = await db.getAll('simulationResults')
    return results as SimulationResult[]
  }
}
