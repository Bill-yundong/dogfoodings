import { db } from '@/db';
import { mockPlatforms, mockCables, mockSemanticTags, mockAlerts, mockHelicopters, generateWeatherData } from '@/mock/data';
import type { SyncLogEntry } from '@/types';

export class SeedDataService {
  private static isInitialized = false;
  private static readonly INIT_FLAG = 'helilink_seed_initialized';
  private static readonly INIT_VERSION = '1.0.0';

  static async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      const existingFlag = localStorage.getItem(this.INIT_FLAG);

      if (existingFlag === this.INIT_VERSION) {
        console.log('[SeedData] 种子数据已初始化，跳过');
        this.isInitialized = true;
        return true;
      }

      console.log('[SeedData] 开始初始化种子数据...');

      await this.seedPlatforms();
      await this.seedCables();
      await this.seedSemanticTags();
      await this.seedWeatherHistory();
      await this.seedAlerts();
      await this.seedHelicopters();
      await this.seedSyncLogs();

      localStorage.setItem(this.INIT_FLAG, this.INIT_VERSION);
      this.isInitialized = true;

      console.log('[SeedData] 种子数据初始化完成');
      return true;
    } catch (error) {
      console.error('[SeedData] 初始化失败:', error);
      return false;
    }
  }

  private static async seedPlatforms(): Promise<void> {
    const existingCount = await db.platformMetadata.count();
    if (existingCount > 0) {
      console.log(`[SeedData] 平台数据已存在 (${existingCount}条)，跳过`);
      return;
    }

    await db.platformMetadata.bulkAdd(mockPlatforms);
    console.log(`[SeedData] 已插入 ${mockPlatforms.length} 条平台数据`);
  }

  private static async seedCables(): Promise<void> {
    const existingCount = await db.submarineCables.count();
    if (existingCount > 0) {
      console.log(`[SeedData] 海缆数据已存在 (${existingCount}条)，跳过`);
      return;
    }

    await db.submarineCables.bulkAdd(mockCables);
    console.log(`[SeedData] 已插入 ${mockCables.length} 条海缆数据`);
  }

  private static async seedSemanticTags(): Promise<void> {
    const existingCount = await db.semanticTags.count();
    if (existingCount > 0) {
      console.log(`[SeedData] 语义标签已存在 (${existingCount}条)，跳过`);
      return;
    }

    await db.semanticTags.bulkAdd(mockSemanticTags);
    console.log(`[SeedData] 已插入 ${mockSemanticTags.length} 条语义标签`);
  }

  private static async seedWeatherHistory(): Promise<void> {
    const existingCount = await db.weatherHistory.count();
    if (existingCount > 0) {
      console.log(`[SeedData] 气象历史已存在 (${existingCount}条)，跳过`);
      return;
    }

    const now = Date.now();
    const allWeatherData: any[] = [];

    for (const platform of mockPlatforms) {
      if (platform.id === 'plat-006') continue;

      const weatherData = generateWeatherData(platform.id, now, 72, 5 * 60 * 1000);
      allWeatherData.push(...weatherData);
    }

    await db.weatherHistory.bulkAdd(allWeatherData);
    console.log(`[SeedData] 已插入 ${allWeatherData.length} 条气象历史数据`);
  }

  private static async seedAlerts(): Promise<void> {
    const existingCount = await db.alerts.count();
    if (existingCount > 0) {
      console.log(`[SeedData] 告警数据已存在 (${existingCount}条)，跳过`);
      return;
    }

    await db.alerts.bulkAdd(mockAlerts);
    console.log(`[SeedData] 已插入 ${mockAlerts.length} 条告警数据`);
  }

  private static async seedHelicopters(): Promise<void> {
    const existingCount = await db.helicopterPositions.count();
    if (existingCount > 0) {
      console.log(`[SeedData] 直升机数据已存在 (${existingCount}条)，跳过`);
      return;
    }

    await db.helicopterPositions.bulkAdd(mockHelicopters);
    console.log(`[SeedData] 已插入 ${mockHelicopters.length} 条直升机位置数据`);
  }

  private static async seedSyncLogs(): Promise<void> {
    const existingCount = await db.syncLog.count();
    if (existingCount > 0) {
      console.log(`[SeedData] 同步日志已存在 (${existingCount}条)，跳过`);
      return;
    }

    const now = Date.now();
    const systems: ('meteorology' | 'fleet' | 'platform')[] = ['meteorology', 'fleet', 'platform'];
    const logs: SyncLogEntry[] = [];

    for (let i = 0; i < 20; i++) {
      const sourceIdx = Math.floor(Math.random() * 3);
      let targetIdx = Math.floor(Math.random() * 3);
      while (targetIdx === sourceIdx) {
        targetIdx = Math.floor(Math.random() * 3);
      }

      const statuses: ('synced' | 'pending' | 'conflict' | 'failed')[] = ['synced', 'synced', 'synced', 'synced', 'conflict', 'failed'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      logs.push({
        id: `sync-log-${i}`,
        sourceSystem: systems[sourceIdx],
        targetSystem: systems[targetIdx],
        syncStatus: status,
        timestamp: now - (20 - i) * 60000,
        version: 1,
        latency: Math.floor(Math.random() * 500) + 50,
        message: status === 'synced' ? '数据同步成功' : status === 'conflict' ? '数据冲突需要人工干预' : '同步失败，网络连接超时',
      });
    }

    await db.syncLog.bulkAdd(logs);
    console.log(`[SeedData] 已插入 ${logs.length} 条同步日志`);
  }

  static async reset(): Promise<void> {
    console.log('[SeedData] 重置种子数据...');

    await Promise.all([
      db.platformMetadata.clear(),
      db.submarineCables.clear(),
      db.weatherHistory.clear(),
      db.landingHistory.clear(),
      db.semanticTags.clear(),
      db.syncLog.clear(),
      db.offlineQueue.clear(),
      db.alerts.clear(),
      db.helicopterPositions.clear(),
    ]);

    localStorage.removeItem(this.INIT_FLAG);
    this.isInitialized = false;

    console.log('[SeedData] 数据已清除，将重新初始化');
    await this.initialize();
  }
}
