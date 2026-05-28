import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DatabaseService } from '../services/database'
import { openDB } from 'idb'
import type { SkinScan, SkinImage, CarePlan, Device } from '../types'

describe('DatabaseService 集成测试', () => {
  let dbService: DatabaseService
  let mockDB: any

  beforeEach(async () => {
    vi.clearAllMocks()
    dbService = new DatabaseService()
    await dbService.init()
    // 通过 mock 返回值获取 mockIDBDatabase 引用
    mockDB = await (openDB as any)('', 1)
  })

  // ── 1. 数据库初始化 ──────────────────────────────────────────
  describe('数据库初始化 - PRD: 创建 dermalogic-db', () => {
    it('init() 应以 dermalogic-db 为名、版本号 1 调用 openDB', () => {
      expect(openDB).toHaveBeenCalledWith(
        'dermalogic-db',
        1,
        expect.objectContaining({ upgrade: expect.any(Function) })
      )
    })

    it('升级回调应创建 skinScans/skinImages/carePlans/devices 四个对象存储', () => {
      const upgradeFn = (openDB as any).mock.calls[0][2].upgrade
      const upgradeDB = {
        objectStoreNames: { contains: vi.fn().mockReturnValue(false) },
        createObjectStore: vi.fn().mockReturnValue({ createIndex: vi.fn() })
      }

      upgradeFn(upgradeDB)

      expect(upgradeDB.createObjectStore).toHaveBeenCalledWith('skinScans', { keyPath: 'id' })
      expect(upgradeDB.createObjectStore).toHaveBeenCalledWith('skinImages', { keyPath: 'id' })
      expect(upgradeDB.createObjectStore).toHaveBeenCalledWith('carePlans', { keyPath: 'id' })
      expect(upgradeDB.createObjectStore).toHaveBeenCalledWith('devices', { keyPath: 'id' })
    })

    it('skinScans 存储应创建 userId 和 timestamp 索引', () => {
      const upgradeFn = (openDB as any).mock.calls[0][2].upgrade
      const mockStore = { createIndex: vi.fn() }
      const upgradeDB = {
        objectStoreNames: {
          contains: vi.fn((name: string) => name !== 'skinScans')
        },
        createObjectStore: vi.fn().mockReturnValue(mockStore)
      }

      upgradeFn(upgradeDB)

      expect(mockStore.createIndex).toHaveBeenCalledWith('userId', 'userId')
      expect(mockStore.createIndex).toHaveBeenCalledWith('timestamp', 'timestamp')
    })

    it('skinImages 存储应创建 scanId 索引', () => {
      const upgradeFn = (openDB as any).mock.calls[0][2].upgrade
      const mockStore = { createIndex: vi.fn() }
      const upgradeDB = {
        objectStoreNames: {
          contains: vi.fn((name: string) => name !== 'skinImages')
        },
        createObjectStore: vi.fn().mockReturnValue(mockStore)
      }

      upgradeFn(upgradeDB)

      expect(mockStore.createIndex).toHaveBeenCalledWith('scanId', 'scanId')
    })

    it('carePlans 存储应创建 userId 索引', () => {
      const upgradeFn = (openDB as any).mock.calls[0][2].upgrade
      const mockStore = { createIndex: vi.fn() }
      const upgradeDB = {
        objectStoreNames: {
          contains: vi.fn((name: string) => name !== 'carePlans')
        },
        createObjectStore: vi.fn().mockReturnValue(mockStore)
      }

      upgradeFn(upgradeDB)

      expect(mockStore.createIndex).toHaveBeenCalledWith('userId', 'userId')
    })

    it('devices 存储不创建额外索引', () => {
      const upgradeFn = (openDB as any).mock.calls[0][2].upgrade
      const mockStore = { createIndex: vi.fn() }
      const upgradeDB = {
        objectStoreNames: {
          contains: vi.fn((name: string) => name !== 'devices')
        },
        createObjectStore: vi.fn().mockReturnValue(mockStore)
      }

      upgradeFn(upgradeDB)

      expect(mockStore.createIndex).not.toHaveBeenCalled()
    })

    it('已存在的对象存储不应重复创建', () => {
      const upgradeFn = (openDB as any).mock.calls[0][2].upgrade
      const upgradeDB = {
        objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
        createObjectStore: vi.fn()
      }

      upgradeFn(upgradeDB)

      expect(upgradeDB.createObjectStore).not.toHaveBeenCalled()
    })
  })

  // ── 2. 肤质扫描记录 CRUD ──────────────────────────────────────
  describe('肤质扫描记录 CRUD - PRD: 肤质扫描记录管理', () => {
    const baseScan: SkinScan = {
      id: 'scan-1',
      userId: 'user-1',
      deviceId: 'device-1',
      timestamp: new Date('2024-01-01'),
      overallScore: 85,
      features: {
        moisture: 70,
        oiliness: 40,
        elasticity: 80,
        roughness: 30,
        poreSize: 25,
        wrinkles: 15,
        activeIngredients: {}
      },
      imageIds: ['img-1']
    }

    it('saveSkinScan 应调用 db.put 写入 skinScans 存储', async () => {
      await dbService.saveSkinScan(baseScan)
      expect(mockDB.put).toHaveBeenCalledWith('skinScans', baseScan)
    })

    it('getSkinScans 应按 userId 从索引查询', async () => {
      await dbService.getSkinScans('user-1')
      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('skinScans', 'userId', 'user-1')
    })

    it('getSkinScans 应按 timestamp 降序排序', async () => {
      const scans = [
        { ...baseScan, id: 'scan-1', timestamp: new Date('2024-01-01') },
        { ...baseScan, id: 'scan-2', timestamp: new Date('2024-06-01') },
        { ...baseScan, id: 'scan-3', timestamp: new Date('2024-03-01') }
      ]
      mockDB.getAllFromIndex.mockResolvedValueOnce(scans)

      const result = await dbService.getSkinScans('user-1')

      expect(result.map((s: SkinScan) => s.id)).toEqual(['scan-2', 'scan-3', 'scan-1'])
    })

    it('getSkinScans 支持 limit 参数限制返回数量', async () => {
      const scans = [
        { ...baseScan, id: 'scan-1', timestamp: new Date('2024-01-01') },
        { ...baseScan, id: 'scan-2', timestamp: new Date('2024-06-01') },
        { ...baseScan, id: 'scan-3', timestamp: new Date('2024-03-01') }
      ]
      mockDB.getAllFromIndex.mockResolvedValueOnce(scans)

      const result = await dbService.getSkinScans('user-1', 2)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('scan-2')
      expect(result[1].id).toBe('scan-3')
    })

    it('getSkinScans 不传 limit 时返回全部记录', async () => {
      const scans = [
        { ...baseScan, id: 'scan-1', timestamp: new Date('2024-01-01') },
        { ...baseScan, id: 'scan-2', timestamp: new Date('2024-06-01') }
      ]
      mockDB.getAllFromIndex.mockResolvedValueOnce(scans)

      const result = await dbService.getSkinScans('user-1')

      expect(result).toHaveLength(2)
    })

    it('getSkinScan 应按 id 从 skinScans 存储获取单条记录', async () => {
      mockDB.get.mockResolvedValueOnce(baseScan)

      const result = await dbService.getSkinScan('scan-1')

      expect(mockDB.get).toHaveBeenCalledWith('skinScans', 'scan-1')
      expect(result).toEqual(baseScan)
    })

    it('getSkinScan 查询不存在的 id 应返回 undefined', async () => {
      mockDB.get.mockResolvedValueOnce(undefined)

      const result = await dbService.getSkinScan('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  // ── 3. 肤质影像切片存储 ──────────────────────────────────────
  describe('肤质影像切片存储 - PRD: 长周期肤质影像切片存储', () => {
    const baseImage: SkinImage = {
      id: 'img-1',
      scanId: 'scan-1',
      imageData: new Blob(),
      width: 1024,
      height: 768,
      type: 'microscope'
    }

    it('saveSkinImage 应调用 db.put 写入 skinImages 存储', async () => {
      await dbService.saveSkinImage(baseImage)
      expect(mockDB.put).toHaveBeenCalledWith('skinImages', baseImage)
    })

    it('getSkinImages 应按 scanId 从索引查询关联影像', async () => {
      await dbService.getSkinImages('scan-1')
      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('skinImages', 'scanId', 'scan-1')
    })

    it('getSkinImage 应按 id 从 skinImages 存储获取单条影像', async () => {
      mockDB.get.mockResolvedValueOnce(baseImage)

      const result = await dbService.getSkinImage('img-1')

      expect(mockDB.get).toHaveBeenCalledWith('skinImages', 'img-1')
      expect(result).toEqual(baseImage)
    })

    it('getSkinImage 查询不存在的 id 应返回 undefined', async () => {
      mockDB.get.mockResolvedValueOnce(undefined)

      const result = await dbService.getSkinImage('nonexistent')

      expect(result).toBeUndefined()
    })
  })

  // ── 4. 护理方案持久化 ────────────────────────────────────────
  describe('护理方案持久化 - PRD: 护理方案管理', () => {
    const basePlan: CarePlan = {
      id: 'plan-1',
      userId: 'user-1',
      recommendations: [
        {
          id: 'rec-1',
          type: 'serum',
          product: '维C精华',
          ingredients: ['维C', '透明质酸'],
          frequency: '每日早晚',
          matchScore: 92
        }
      ],
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-01')
    }

    it('saveCarePlan 应调用 db.put 写入 carePlans 存储', async () => {
      await dbService.saveCarePlan(basePlan)
      expect(mockDB.put).toHaveBeenCalledWith('carePlans', basePlan)
    })

    it('getCarePlans 应按 userId 从索引查询护理方案', async () => {
      await dbService.getCarePlans('user-1')
      expect(mockDB.getAllFromIndex).toHaveBeenCalledWith('carePlans', 'userId', 'user-1')
    })
  })

  // ── 5. 设备信息管理 ──────────────────────────────────────────
  describe('设备信息管理 - PRD: 设备管理', () => {
    const baseDevice: Device = {
      id: 'device-1',
      name: 'DermaScan Pro',
      type: 'scanner',
      status: 'connected',
      lastSync: new Date('2024-01-01'),
      battery: 85
    }

    it('saveDevice 应调用 db.put 写入 devices 存储', async () => {
      await dbService.saveDevice(baseDevice)
      expect(mockDB.put).toHaveBeenCalledWith('devices', baseDevice)
    })

    it('getDevices 应调用 db.getAll 获取所有设备', async () => {
      await dbService.getDevices()
      expect(mockDB.getAll).toHaveBeenCalledWith('devices')
    })

    it('deleteDevice 应调用 db.delete 删除指定设备', async () => {
      await dbService.deleteDevice('device-1')
      expect(mockDB.delete).toHaveBeenCalledWith('devices', 'device-1')
    })
  })

  // ── 6. 数据清理 ──────────────────────────────────────────────
  describe('数据清理 - PRD: 清除所有数据', () => {
    it('clearAll 应开启包含全部 4 个对象存储的读写事务', async () => {
      await dbService.clearAll()
      expect(mockDB.transaction).toHaveBeenCalledWith(
        ['skinScans', 'skinImages', 'carePlans', 'devices'],
        'readwrite'
      )
    })

    it('clearAll 应清除 skinScans/skinImages/carePlans/devices 四个存储的数据', async () => {
      const mockClear = vi.fn().mockResolvedValue(undefined)
      const mockTx = {
        store: { clear: mockClear },
        objectStore: vi.fn().mockReturnValue({ clear: mockClear }),
        done: Promise.resolve()
      }
      mockDB.transaction.mockReturnValueOnce(mockTx)

      await dbService.clearAll()

      // store.clear 对应 skinScans（事务默认 store），objectStore 调用 3 次
      expect(mockClear).toHaveBeenCalledTimes(4)
      expect(mockTx.objectStore).toHaveBeenCalledWith('skinImages')
      expect(mockTx.objectStore).toHaveBeenCalledWith('carePlans')
      expect(mockTx.objectStore).toHaveBeenCalledWith('devices')
    })
  })
})
