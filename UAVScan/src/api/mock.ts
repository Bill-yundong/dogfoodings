import type { PointCloud, ProcessingTask, SyncTask, TopologySnapshot, LinkStatus } from '@/types'
import { generateMockPointCloud } from '@/utils/pointcloud/lasParser'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const mockApi = {
  async getDroneLinkStatus(): Promise<LinkStatus> {
    await delay(500)
    return {
      droneConnected: Math.random() > 0.2,
      databaseConnected: Math.random() > 0.1,
      networkLatency: Math.floor(Math.random() * 100) + 10,
      bandwidth: Math.floor(Math.random() * 500) + 100,
      signalStrength: Math.floor(Math.random() * 100)
    }
  },

  async getPointCloudList(): Promise<PointCloud[]> {
    await delay(800)
    const mockData = generateMockPointCloud(50000)
    return [
      {
        id: 'pc_001',
        name: '220kV凤东线#12-#18塔',
        description: '电力线路巡检点云数据',
        originalPoints: 12580000,
        downsampledPoints: 1258000,
        fileSize: 189.5,
        compressedSize: 23.7,
        format: 'LAS 1.4',
        createdAt: Date.now() - 86400000 * 2,
        updatedAt: Date.now() - 3600000,
        status: 'processed',
        data: mockData,
        metadata: {
          flightId: 'FL-2024-001',
          droneModel: 'DJI Matrice 300 RTK',
          sensorModel: 'LIVOX Avia',
          location: { lat: 30.2741, lng: 120.1551, altitude: 45.2 },
          weather: '晴朗',
          temperature: 25.5,
          humidity: 65
        }
      },
      {
        id: 'pc_002',
        name: '500kV瓶武线#45-#52塔',
        description: '跨江输电线路巡检',
        originalPoints: 28450000,
        downsampledPoints: 2845000,
        fileSize: 428.3,
        compressedSize: 53.5,
        format: 'LAZ 1.4',
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 7200000,
        status: 'processed',
        data: generateMockPointCloud(80000),
        metadata: {
          flightId: 'FL-2024-002',
          droneModel: 'DJI Matrice 300 RTK',
          sensorModel: 'RIEGL miniVUX-1UAV',
          location: { lat: 30.1928, lng: 120.2674, altitude: 78.5 },
          weather: '多云',
          temperature: 23.0,
          humidity: 72
        }
      },
      {
        id: 'pc_003',
        name: '110kV滨文线#3-#9塔',
        description: '城市配网线路巡检',
        originalPoints: 8920000,
        downsampledPoints: 0,
        fileSize: 134.2,
        compressedSize: 0,
        format: 'LAS 1.4',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
        status: 'pending',
        data: generateMockPointCloud(30000),
        metadata: {
          flightId: 'FL-2024-003',
          droneModel: 'DJI Mavic 3 Enterprise',
          sensorModel: 'LIVOX Mid-40',
          location: { lat: 30.2856, lng: 120.1234, altitude: 28.0 },
          weather: '阴',
          temperature: 21.8,
          humidity: 78
        }
      }
    ]
  },

  async getTaskList(): Promise<ProcessingTask[]> {
    await delay(600)
    return [
      {
        id: 'task_001',
        type: 'downsampling',
        name: '体素下采样 - 220kV凤东线',
        pointCloudId: 'pc_001',
        status: 'completed',
        progress: 100,
        priority: 'high',
        config: { voxelSize: 0.05, adaptive: true },
        inputPoints: 12580000,
        outputPoints: 1258000,
        startTime: Date.now() - 86400000,
        endTime: Date.now() - 85800000,
        createdAt: Date.now() - 86400000,
        inputData: generateMockPointCloud(50000)
      },
      {
        id: 'task_002',
        type: 'denoising',
        name: '统计滤波去噪 - 500kV瓶武线',
        pointCloudId: 'pc_002',
        status: 'completed',
        progress: 100,
        priority: 'normal',
        config: { kNeighbors: 5, stdThreshold: 2.0 },
        inputPoints: 28450000,
        outputPoints: 27300000,
        startTime: Date.now() - 86000000,
        endTime: Date.now() - 85500000,
        createdAt: Date.now() - 86000000,
        inputData: generateMockPointCloud(80000)
      },
      {
        id: 'task_003',
        type: 'topology',
        name: '拓扑重建 - 220kV凤东线',
        pointCloudId: 'pc_001',
        status: 'running',
        progress: 67,
        priority: 'high',
        config: { maxDepth: 8, minPoints: 10 },
        inputPoints: 1258000,
        startTime: Date.now() - 300000,
        createdAt: Date.now() - 300000,
        inputData: generateMockPointCloud(50000)
      },
      {
        id: 'task_004',
        type: 'compression',
        name: '数据压缩 - 500kV瓶武线',
        pointCloudId: 'pc_002',
        status: 'pending',
        progress: 0,
        priority: 'low',
        config: { compressionLevel: 6, draco: true },
        inputPoints: 27300000,
        createdAt: Date.now() - 60000,
        inputData: generateMockPointCloud(80000)
      },
      {
        id: 'task_005',
        type: 'downsampling',
        name: '体素下采样 - 110kV滨文线',
        pointCloudId: 'pc_003',
        status: 'failed',
        progress: 45,
        priority: 'normal',
        config: { voxelSize: 0.03, adaptive: false },
        inputPoints: 8920000,
        startTime: Date.now() - 120000,
        endTime: Date.now() - 60000,
        errorMessage: '内存溢出：点云数据过大，请增大体素尺寸',
        createdAt: Date.now() - 120000,
        inputData: generateMockPointCloud(30000)
      }
    ]
  },

  async getSyncTaskList(): Promise<SyncTask[]> {
    await delay(500)
    return [
      {
        id: 'sync_001',
        pointCloudId: 'pc_001',
        name: '同步到省电网主数据库',
        targetEndpoint: 'https://grid-db.province.com/api/pointcloud',
        status: 'completed',
        progress: 100,
        priority: 'high',
        incremental: true,
        checksum: 'sha256:8a4b...c3e2',
        pointsSynced: 1258000,
        bytesTransferred: 23700000,
        startTime: Date.now() - 82800000,
        endTime: Date.now() - 81000000,
        createdAt: Date.now() - 82800000
      },
      {
        id: 'sync_002',
        pointCloudId: 'pc_002',
        name: '同步到省电网主数据库',
        targetEndpoint: 'https://grid-db.province.com/api/pointcloud',
        status: 'syncing',
        progress: 38,
        priority: 'high',
        incremental: true,
        pointsSynced: 1071000,
        bytesTransferred: 20330000,
        startTime: Date.now() - 600000,
        createdAt: Date.now() - 600000
      },
      {
        id: 'sync_003',
        pointCloudId: 'pc_003',
        name: '同步到区域备份节点',
        targetEndpoint: 'https://backup-zone1.grid.com/api/sync',
        status: 'pending',
        progress: 0,
        priority: 'low',
        incremental: false,
        createdAt: Date.now() - 300000
      }
    ]
  },

  async getSnapshotList(): Promise<TopologySnapshot[]> {
    await delay(400)
    const now = Date.now()
    return [
      {
        id: 'snap_001',
        pointCloudId: 'pc_001',
        name: '220kV凤东线#15塔精细快照',
        description: '重点关注绝缘子和金具区域',
        levelOfDetail: 'fine',
        pointCount: 125800,
        fileSize: 2.4,
        boundingBox: {
          minX: -15.2, minY: -8.5, minZ: 25.0,
          maxX: 15.2, maxY: 8.5, maxZ: 45.0
        },
        createdAt: now - 7200000,
        expiresAt: now + 86400000 * 30,
        accessedAt: now - 3600000,
        accessCount: 15,
        cached: true,
        data: generateMockPointCloud(10000)
      },
      {
        id: 'snap_002',
        pointCloudId: 'pc_001',
        name: '220kV凤东线全景概览',
        description: '全线路粗粒度快照',
        levelOfDetail: 'coarse',
        pointCount: 25800,
        fileSize: 0.5,
        boundingBox: {
          minX: -120.0, minY: -50.0, minZ: 10.0,
          maxX: 120.0, maxY: 50.0, maxZ: 80.0
        },
        createdAt: now - 86400000,
        expiresAt: now + 86400000 * 90,
        accessedAt: now - 43200000,
        accessCount: 8,
        cached: true,
        data: generateMockPointCloud(5000)
      },
      {
        id: 'snap_003',
        pointCloudId: 'pc_002',
        name: '500kV瓶武线跨江段',
        description: '大跨越段精细拓扑',
        levelOfDetail: 'fine',
        pointCount: 284500,
        fileSize: 5.7,
        boundingBox: {
          minX: -80.0, minY: -120.0, minZ: 30.0,
          maxX: 80.0, maxY: 120.0, maxZ: 150.0
        },
        createdAt: now - 172800000,
        expiresAt: now + 86400000 * 60,
        accessedAt: now - 86400000,
        accessCount: 23,
        cached: true,
        data: generateMockPointCloud(15000)
      }
    ]
  },

  async uploadPointCloud(file: File, onProgress?: (progress: number) => void): Promise<PointCloud> {
    const totalSteps = 10
    for (let i = 1; i <= totalSteps; i++) {
      await delay(200)
      onProgress?.(i * 10)
    }
    
    const id = `pc_${Date.now()}`
    const mockData = generateMockPointCloud(50000)
    
    return {
      id,
      name: file.name.replace(/\.[^/.]+$/, ''),
      description: '用户上传点云数据',
      originalPoints: Math.floor(Math.random() * 20000000) + 5000000,
      downsampledPoints: 0,
      fileSize: file.size / 1024 / 1024,
      compressedSize: 0,
      format: 'LAS 1.4',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'pending',
      data: mockData,
      metadata: {
        flightId: `FL-UPLOAD-${id.slice(-6)}`,
        droneModel: '未知',
        sensorModel: '未知',
        location: { lat: 0, lng: 0, altitude: 0 },
        weather: '未知',
        temperature: 0,
        humidity: 0
      }
    }
  },

  async startProcessing(taskType: string, pointCloudId: string, config: any): Promise<ProcessingTask> {
    await delay(500)
    const id = `task_${Date.now()}`
    return {
      id,
      type: taskType as any,
      name: `${taskType} - ${pointCloudId}`,
      pointCloudId,
      status: 'pending',
      progress: 0,
      priority: 'normal',
      config,
      inputPoints: 0,
      createdAt: Date.now(),
      inputData: generateMockPointCloud(10000)
    }
  },

  async getSystemMetrics() {
    await delay(300)
    return {
      cpuUsage: Math.floor(Math.random() * 40) + 20,
      memoryUsage: Math.floor(Math.random() * 30) + 40,
      gpuMemory: Math.floor(Math.random() * 50) + 30,
      diskIO: Math.floor(Math.random() * 200) + 50,
      networkIn: Math.floor(Math.random() * 100) + 10,
      networkOut: Math.floor(Math.random() * 80) + 5,
      workerPool: {
        active: Math.floor(Math.random() * 3) + 1,
        total: 4,
        queueSize: Math.floor(Math.random() * 5)
      },
      indexedDB: {
        used: Math.floor(Math.random() * 500) + 200,
        total: 2048
      }
    }
  },

  async getProcessingStats() {
    await delay(400)
    return {
      totalTasks: 156,
      completedTasks: 142,
      failedTasks: 8,
      runningTasks: 4,
      pendingTasks: 2,
      totalPointsProcessed: 1258000000,
      averageProcessingTime: 12500,
      successRate: 91.0,
      avgCompressionRatio: 89.5,
      dailyTrend: [
        { date: '12-01', tasks: 23, points: 125000000 },
        { date: '12-02', tasks: 31, points: 158000000 },
        { date: '12-03', tasks: 28, points: 142000000 },
        { date: '12-04', tasks: 35, points: 175000000 },
        { date: '12-05', tasks: 29, points: 148000000 },
        { date: '12-06', tasks: 20, points: 98000000 },
        { date: '12-07', tasks: 15, points: 82000000 }
      ]
    }
  }
}

export default mockApi
