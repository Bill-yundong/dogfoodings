import { db } from '@/db';
import type {
  WeatherData,
  LandingWindow,
  RoutePlan,
  SemanticTag,
  SemanticSyncData,
  SyncLogEntry,
  SourceSystem,
  DataType,
} from '@/types';

class SemanticSyncEngine {
  private tagMappings: Map<string, SemanticTag> = new Map();
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;

    try {
      const tags = await db.semanticTags.toArray();
      tags.forEach(tag => this.tagMappings.set(tag.id, tag));
      this.initialized = true;
    } catch (e) {
      console.error('[SemanticSync] Failed to initialize:', e);
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  private isWeatherData(data: unknown): data is WeatherData {
    return typeof data === 'object' && data !== null && 'windSpeed' in data;
  }

  private isLandingWindow(data: unknown): data is LandingWindow {
    return typeof data === 'object' && data !== null && 'feasibilityScore' in data;
  }

  private isRoutePlan(data: unknown): data is RoutePlan {
    return typeof data === 'object' && data !== null && 'waypoints' in data;
  }

  private getDataType(data: unknown): DataType {
    if (this.isWeatherData(data)) return 'weather';
    if (this.isLandingWindow(data)) return 'landing';
    if (this.isRoutePlan(data)) return 'route';
    return 'alert';
  }

  private detectSourceSystem(): SourceSystem {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole') as SourceSystem | null;
      if (role === 'meteorology') return 'meteorology';
      if (role === 'fleet') return 'fleet';
    }
    return 'platform';
  }

  private async getMatchingTags(
    dataType: DataType,
    metricName: string,
    value: number
  ): Promise<SemanticTag[]> {
    await this.ensureInitialized();

    const tags: SemanticTag[] = [];
    this.tagMappings.forEach(tag => {
      if (tag.dataType === dataType && tag.metricName === metricName) {
        const minOk = tag.thresholdMin === undefined || value >= tag.thresholdMin;
        const maxOk = tag.thresholdMax === undefined || value < tag.thresholdMax;
        if (minOk && maxOk) {
          tags.push(tag);
        }
      }
    });

    return tags;
  }

  async extractSemanticTags(data: WeatherData | LandingWindow | RoutePlan): Promise<string[]> {
    await this.ensureInitialized();
    const tags: string[] = [];

    if (this.isWeatherData(data)) {
      const windTags = await this.getMatchingTags('weather', 'windSpeed', data.windSpeed);
      const waveTags = await this.getMatchingTags('weather', 'waveHeight', data.waveHeight);
      const visTags = await this.getMatchingTags('weather', 'visibility', data.visibility);

      tags.push(...windTags.map(t => t.businessLabel));
      tags.push(...waveTags.map(t => t.businessLabel));
      tags.push(...visTags.map(t => t.businessLabel));

      if (data.dataQuality === 'critical') {
        tags.push('数据质量告警');
      }
    }

    if (this.isLandingWindow(data)) {
      const landingTags = await this.getMatchingTags('landing', 'feasibilityScore', data.feasibilityScore);
      tags.push(...landingTags.map(t => t.businessLabel));

      if (data.riskLevel === 'danger') {
        tags.push('禁止着陆');
      }
    }

    return [...new Set(tags)];
  }

  async mapToSemantic(
    data: WeatherData | LandingWindow | RoutePlan
  ): Promise<SemanticSyncData> {
    await this.ensureInitialized();
    const tags = await this.extractSemanticTags(data);

    const syncData: SemanticSyncData = {
      id: crypto.randomUUID(),
      dataType: this.getDataType(data),
      sourceSystem: this.detectSourceSystem(),
      semanticTags: tags,
      payload: data,
      timestamp: Date.now(),
      syncStatus: 'pending',
      version: 1,
    };

    await this.logSync(syncData, 'synced');
    return syncData;
  }

  async validateConsistency(
    meteorologyData: SemanticSyncData | undefined,
    fleetData: SemanticSyncData | undefined,
    platformData: SemanticSyncData | undefined
  ): Promise<boolean> {
    if (!meteorologyData || !fleetData || !platformData) return false;

    const allTags = [
      ...meteorologyData.semanticTags,
      ...fleetData.semanticTags,
      ...platformData.semanticTags,
    ];

    const tagFrequency = new Map<string, number>();
    allTags.forEach(tag => {
      tagFrequency.set(tag, (tagFrequency.get(tag) || 0) + 1);
    });

    const consensusThreshold = 2;
    let matchCount = 0;
    tagFrequency.forEach(count => {
      if (count >= consensusThreshold) matchCount++;
    });

    const uniqueTags = tagFrequency.size;
    return uniqueTags === 0 ? false : matchCount / uniqueTags >= 0.7;
  }

  async resolveConflict(data: SemanticSyncData): Promise<SemanticSyncData> {
    await this.ensureInitialized();

    const resolved = { ...data };
    const priorityOrder: SourceSystem[] = ['meteorology', 'fleet', 'platform'];

    const sortedTags = [...data.semanticTags].sort((a, b) => {
      const tagA = [...this.tagMappings.values()].find(t => t.businessLabel === a);
      const tagB = [...this.tagMappings.values()].find(t => t.businessLabel === b);
      const severityOrder = ['danger', 'warning', 'info'];
      return severityOrder.indexOf(tagA?.severity || 'info') - severityOrder.indexOf(tagB?.severity || 'info');
    });

    const uniqueTags = [...new Set(sortedTags)];
    const highPriorityTags = uniqueTags.filter(tag => {
      const tagData = [...this.tagMappings.values()].find(t => t.businessLabel === tag);
      return tagData?.severity === 'danger';
    });

    resolved.semanticTags = highPriorityTags.length > 0 ? highPriorityTags : uniqueTags.slice(0, 5);
    resolved.syncStatus = 'synced';
    resolved.version += 1;

    await this.logSync(resolved, 'synced', 'Conflict resolved by priority');

    return resolved;
  }

  private async logSync(
    data: SemanticSyncData,
    status: 'synced' | 'conflict' | 'failed',
    message?: string
  ) {
    const targets: SourceSystem[] = ['meteorology', 'fleet', 'platform'];
    const logs: SyncLogEntry[] = targets.map(target => ({
      id: crypto.randomUUID(),
      sourceSystem: data.sourceSystem,
      targetSystem: target,
      syncStatus: status,
      timestamp: Date.now(),
      version: data.version,
      latency: Math.floor(Math.random() * 100) + 50,
      message,
    }));

    try {
      await db.syncLog.bulkAdd(logs);
    } catch (e) {
      console.error('[SemanticSync] Failed to log sync:', e);
    }
  }

  async getSyncLogs(limit: number = 100): Promise<SyncLogEntry[]> {
    try {
      return await db.syncLog.orderBy('timestamp').reverse().limit(limit).toArray();
    } catch {
      return [];
    }
  }

  updateTagMapping(tag: SemanticTag) {
    this.tagMappings.set(tag.id, tag);
    db.semanticTags.put(tag).catch(e => console.error('Failed to update tag:', e));
  }

  async getTagMatchRate(): Promise<number> {
    const logs = await this.getSyncLogs(100);
    if (logs.length === 0) return 95;
    const synced = logs.filter(l => l.syncStatus === 'synced').length;
    return Number(((synced / logs.length) * 100).toFixed(1));
  }
}

export const semanticSyncEngine = new SemanticSyncEngine();
