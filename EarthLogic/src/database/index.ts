import Dexie, { Table } from 'dexie'
import type { SpatialTemporalData, SamplingPoint } from '../types'

export class SoilDatabase extends Dexie {
  spatialTemporalData!: Table<SpatialTemporalData>
  samplingPoints!: Table<SamplingPoint & { cachedAt?: Date }>

  constructor() {
    super('SoilMonitoringDB')
    
    this.version(1).stores({
      spatialTemporalData: '++id, [pointId+year+month], pointId, year, month, createdAt',
      samplingPoints: 'id, samplingDate, qualityGrade, cachedAt'
    })
  }
}

export const db = new SoilDatabase()

export class SpatialTemporalCache {
  private db: SoilDatabase

  constructor() {
    this.db = db
  }

  async saveData(data: SpatialTemporalData): Promise<number> {
    data.createdAt = new Date()
    return await this.db.spatialTemporalData.add(data)
  }

  async bulkSaveData(dataList: SpatialTemporalData[]): Promise<number> {
    const now = new Date()
    dataList.forEach(data => {
      data.createdAt = now
    })
    return await this.db.spatialTemporalData.bulkAdd(dataList)
  }

  async getDataByPoint(pointId: string): Promise<SpatialTemporalData[]> {
    return await this.db.spatialTemporalData
      .where('pointId')
      .equals(pointId)
      .reverse()
      .sortBy('createdAt')
  }

  async getDataByYearRange(startYear: number, endYear: number): Promise<SpatialTemporalData[]> {
    return await this.db.spatialTemporalData
      .where('year')
      .between(startYear, endYear)
      .toArray()
  }

  async getDataByPointAndYear(pointId: string, year: number): Promise<SpatialTemporalData[]> {
    return await this.db.spatialTemporalData
      .where('[pointId+year]')
      .equals([pointId, year])
      .toArray()
  }

  async getLatestData(pointId: string): Promise<SpatialTemporalData | undefined> {
    return await this.db.spatialTemporalData
      .where('pointId')
      .equals(pointId)
      .reverse()
      .first()
  }

  async getAllData(): Promise<SpatialTemporalData[]> {
    return await this.db.spatialTemporalData.toArray()
  }

  async deleteData(id: number): Promise<void> {
    await this.db.spatialTemporalData.delete(id)
  }

  async clearAll(): Promise<void> {
    await this.db.spatialTemporalData.clear()
  }

  async saveSamplingPoint(point: SamplingPoint): Promise<string> {
    const cachedPoint = { ...point, cachedAt: new Date() }
    await this.db.samplingPoints.put(cachedPoint)
    return point.id
  }

  async getSamplingPoint(id: string): Promise<SamplingPoint | undefined> {
    return await this.db.samplingPoints.get(id)
  }

  async getAllSamplingPoints(): Promise<SamplingPoint[]> {
    return await this.db.samplingPoints.toArray()
  }

  async getStatistics(): Promise<{
    totalPoints: number
    totalRecords: number
    yearRange: { min: number; max: number } | null
  }> {
    const totalPoints = await this.db.samplingPoints.count()
    const totalRecords = await this.db.spatialTemporalData.count()
    
    const allYears = await this.db.spatialTemporalData.orderBy('year').uniqueKeys()
    const yearRange = allYears.length > 0 
      ? { min: allYears[0] as number, max: allYears[allYears.length - 1] as number }
      : null

    return { totalPoints, totalRecords, yearRange }
  }
}

export const cache = new SpatialTemporalCache()
