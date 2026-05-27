import { getDB } from './index'
import type {
  User,
  RunSession,
  PressureData,
  CadenceData,
  PostureData,
  RiskAssessment,
  Shoes,
  WearData,
  SyncQueueItem
} from '@/types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export const userRepository = {
  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const db = getDB()
    const newUser: User = {
      ...user,
      id: generateId(),
      createdAt: new Date()
    }
    await db.add('users', newUser)
    await addToSyncQueue('users', newUser.id, 'create', newUser)
    return newUser
  },

  async getById(id: string): Promise<User | undefined> {
    const db = getDB()
    return db.get('users', id)
  },

  async update(id: string, updates: Partial<User>): Promise<void> {
    const db = getDB()
    const user = await db.get('users', id)
    if (user) {
      const updated = { ...user, ...updates }
      await db.put('users', updated)
      await addToSyncQueue('users', id, 'update', updated)
    }
  },

  async getAll(): Promise<User[]> {
    const db = getDB()
    return db.getAll('users')
  }
}

export const runSessionRepository = {
  async create(session: Omit<RunSession, 'id'>): Promise<RunSession> {
    const db = getDB()
    const newSession: RunSession = {
      ...session,
      id: generateId()
    }
    await db.add('runSessions', newSession)
    await addToSyncQueue('runSessions', newSession.id, 'create', newSession)
    return newSession
  },

  async getById(id: string): Promise<RunSession | undefined> {
    const db = getDB()
    return db.get('runSessions', id)
  },

  async getByUserId(userId: string): Promise<RunSession[]> {
    const db = getDB()
    return db.getAllFromIndex('runSessions', 'by-user', userId)
  },

  async update(id: string, updates: Partial<RunSession>): Promise<void> {
    const db = getDB()
    const session = await db.get('runSessions', id)
    if (session) {
      const updated = { ...session, ...updates }
      await db.put('runSessions', updated)
      await addToSyncQueue('runSessions', id, 'update', updated)
    }
  },

  async getRecent(limit: number = 10): Promise<RunSession[]> {
    const db = getDB()
    const sessions = await db.getAll('runSessions')
    return sessions
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, limit)
  }
}

export const pressureDataRepository = {
  async create(data: Omit<PressureData, 'id'>): Promise<PressureData> {
    const db = getDB()
    const newData: PressureData = {
      ...data,
      id: generateId()
    }
    await db.add('pressureData', newData)
    await addToSyncQueue('pressureData', newData.id, 'create', newData)
    return newData
  },

  async getBySessionId(sessionId: string): Promise<PressureData[]> {
    const db = getDB()
    return db.getAllFromIndex('pressureData', 'by-session', sessionId)
  },

  async getBySessionIdRange(sessionId: string, startTime: number, endTime: number): Promise<PressureData[]> {
    const db = getDB()
    const allData = await db.getAllFromIndex('pressureData', 'by-session', sessionId)
    return allData.filter(d => d.timestamp >= startTime && d.timestamp <= endTime)
  },

  async bulkCreate(dataList: Omit<PressureData, 'id'>[]): Promise<PressureData[]> {
    const db = getDB()
    const results: PressureData[] = []
    const tx = db.transaction('pressureData', 'readwrite')
    
    for (const data of dataList) {
      const newData: PressureData = { ...data, id: generateId() }
      await tx.store.add(newData)
      results.push(newData)
      await addToSyncQueue('pressureData', newData.id, 'create', newData)
    }
    
    await tx.done
    return results
  }
}

export const cadenceDataRepository = {
  async create(data: Omit<CadenceData, 'id'>): Promise<CadenceData> {
    const db = getDB()
    const newData: CadenceData = {
      ...data,
      id: generateId()
    }
    await db.add('cadenceData', newData)
    await addToSyncQueue('cadenceData', newData.id, 'create', newData)
    return newData
  },

  async getBySessionId(sessionId: string): Promise<CadenceData[]> {
    const db = getDB()
    return db.getAllFromIndex('cadenceData', 'by-session', sessionId)
  }
}

export const postureDataRepository = {
  async create(data: Omit<PostureData, 'id'>): Promise<PostureData> {
    const db = getDB()
    const newData: PostureData = {
      ...data,
      id: generateId()
    }
    await db.add('postureData', newData)
    await addToSyncQueue('postureData', newData.id, 'create', newData)
    return newData
  },

  async getBySessionId(sessionId: string): Promise<PostureData[]> {
    const db = getDB()
    return db.getAllFromIndex('postureData', 'by-session', sessionId)
  }
}

export const riskAssessmentRepository = {
  async create(data: Omit<RiskAssessment, 'id'>): Promise<RiskAssessment> {
    const db = getDB()
    const newData: RiskAssessment = {
      ...data,
      id: generateId()
    }
    await db.add('riskAssessments', newData)
    await addToSyncQueue('riskAssessments', newData.id, 'create', newData)
    return newData
  },

  async getBySessionId(sessionId: string): Promise<RiskAssessment[]> {
    const db = getDB()
    return db.getAllFromIndex('riskAssessments', 'by-session', sessionId)
  },

  async getLatest(sessionId: string): Promise<RiskAssessment | undefined> {
    const assessments = await this.getBySessionId(sessionId)
    return assessments.sort((a, b) => 
      new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
    )[0]
  }
}

export const shoesRepository = {
  async create(shoes: Omit<Shoes, 'id'>): Promise<Shoes> {
    const db = getDB()
    const newShoes: Shoes = {
      ...shoes,
      id: generateId()
    }
    await db.add('shoes', newShoes)
    await addToSyncQueue('shoes', newShoes.id, 'create', newShoes)
    return newShoes
  },

  async getById(id: string): Promise<Shoes | undefined> {
    const db = getDB()
    return db.get('shoes', id)
  },

  async getByUserId(userId: string): Promise<Shoes[]> {
    const db = getDB()
    return db.getAllFromIndex('shoes', 'by-user', userId)
  },

  async update(id: string, updates: Partial<Shoes>): Promise<void> {
    const db = getDB()
    const shoes = await db.get('shoes', id)
    if (shoes) {
      const updated = { ...shoes, ...updates }
      await db.put('shoes', updated)
      await addToSyncQueue('shoes', id, 'update', updated)
    }
  }
}

export const wearDataRepository = {
  async create(data: Omit<WearData, 'id'>): Promise<WearData> {
    const db = getDB()
    const newData: WearData = {
      ...data,
      id: generateId()
    }
    await db.add('wearData', newData)
    await addToSyncQueue('wearData', newData.id, 'create', newData)
    return newData
  },

  async getByShoesId(shoesId: string): Promise<WearData[]> {
    const db = getDB()
    return db.getAllFromIndex('wearData', 'by-shoes', shoesId)
  },

  async getLatest(shoesId: string): Promise<WearData | undefined> {
    const dataList = await this.getByShoesId(shoesId)
    return dataList.sort((a, b) => 
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )[0]
  }
}

async function addToSyncQueue(
  tableName: string,
  recordId: string,
  operation: 'create' | 'update' | 'delete',
  data: any
): Promise<void> {
  const db = getDB()
  const queueItem: SyncQueueItem = {
    id: generateId(),
    tableName,
    recordId,
    operation,
    status: 'pending',
    createdAt: new Date(),
    data
  }
  await db.add('syncQueue', queueItem)
}

export const syncQueueRepository = {
  async getPending(): Promise<SyncQueueItem[]> {
    const db = getDB()
    return db.getAllFromIndex('syncQueue', 'by-status', 'pending')
  },

  async updateStatus(id: string, status: SyncQueueItem['status']): Promise<void> {
    const db = getDB()
    const item = await db.get('syncQueue', id)
    if (item) {
      item.status = status
      if (status === 'completed') {
        item.syncedAt = new Date()
      }
      await db.put('syncQueue', item)
    }
  },

  async getCountByStatus(status: SyncQueueItem['status']): Promise<number> {
    const db = getDB()
    const items = await db.getAllFromIndex('syncQueue', 'by-status', status)
    return items.length
  },

  async clearCompleted(): Promise<void> {
    const db = getDB()
    const items = await db.getAllFromIndex('syncQueue', 'by-status', 'completed')
    const tx = db.transaction('syncQueue', 'readwrite')
    for (const item of items) {
      await tx.store.delete(item.id)
    }
    await tx.done
  }
}
