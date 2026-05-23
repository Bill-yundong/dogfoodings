import type { DatabasePointCloudInfo, LinkStatus } from '@/types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const databaseApi = {
  async getLinkStatus(): Promise<LinkStatus> {
    await delay(500)
    return {
      id: 'main-db',
      name: '省电网主数据库',
      connected: Math.random() > 0.1,
      latency: Math.floor(Math.random() * 100) + 10,
      uploadSpeed: Math.floor(Math.random() * 500) + 100,
      downloadSpeed: Math.floor(Math.random() * 800) + 200,
      signalStrength: Math.floor(Math.random() * 100),
      lastCheckTime: Date.now()
    }
  },

  async getPointCloudList(): Promise<DatabasePointCloudInfo[]> {
    await delay(800)
    return [
      {
        id: 'db_001',
        name: '220kV凤东线#12-#18塔',
        description: '电力线路巡检点云数据',
        pointCount: 12580000,
        fileSize: 189.5,
        acquisitionTime: Date.now() - 86400000 * 2,
        uploadTime: Date.now() - 86400000,
        region: '华东-浙江省-杭州市',
        droneId: 'DJI-M300-001',
        status: 'available'
      },
      {
        id: 'db_002',
        name: '500kV瓶武线#45-#52塔',
        description: '跨江输电线路巡检',
        pointCount: 28450000,
        fileSize: 428.3,
        acquisitionTime: Date.now() - 86400000,
        uploadTime: Date.now() - 43200000,
        region: '华东-浙江省-宁波市',
        droneId: 'DJI-M300-002',
        status: 'processing'
      }
    ]
  },

  async getPointCloudInfo(id: string): Promise<DatabasePointCloudInfo | null> {
    await delay(300)
    return {
      id,
      name: '点云数据',
      description: '电力线路巡检点云数据',
      pointCount: 10000000,
      fileSize: 150,
      acquisitionTime: Date.now(),
      uploadTime: Date.now(),
      region: '华东-浙江省-杭州市',
      droneId: 'DJI-M300-001',
      status: 'available'
    }
  },

  async deletePointCloud(id: string): Promise<boolean> {
    await delay(300)
    return true
  },

  async searchPointCloud(query: string): Promise<DatabasePointCloudInfo[]> {
    await delay(500)
    return []
  }
}
