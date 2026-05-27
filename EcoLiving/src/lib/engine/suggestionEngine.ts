import type { EnergySuggestion, EnergySnapshot, Device, LoadFeature } from '@/lib/types/energy';
import { eventBus } from '@/lib/bus/eventBus';
import { dbService } from '@/lib/db/indexedDB';
import { generateId } from '@/lib/utils/formatters';

class SuggestionEngine {
  private suggestions: EnergySuggestion[] = [];
  private maxSuggestions: number = 50;
  private isInitialized: boolean = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    this.isInitialized = true;
    
    eventBus.subscribe('waste:detected', this.handleWasteDetected.bind(this));
    eventBus.subscribe('snapshot:created', this.handleSnapshotCreated.bind(this));
    
    const stored = await dbService.getMetadata<EnergySuggestion[]>('activeSuggestions');
    if (stored) {
      this.suggestions = stored.filter(s => !s.implemented);
    }

    eventBus.send('engine:status', { engine: 'suggestion-engine', status: 'running' }, 'engine');
  }

  private handleWasteDetected(event: { type: string; payload: unknown }): void {
    const waste = event.payload as LoadFeature & { deviceId: string; deviceName: string };
    if (!waste || !waste.isWaste) return;

    const existing = this.suggestions.find(
      s => s.deviceId === waste.deviceId && !s.implemented
    );
    
    if (!existing || Date.now() - existing.timestamp > 3600000) {
      this.addSuggestion({
        timestamp: waste.timestamp,
        deviceId: waste.deviceId,
        deviceName: waste.deviceName,
        type: this.mapWasteType(waste.wasteLevel),
        title: `优化 ${waste.deviceName} 用电`,
        description: waste.description,
        potentialSaving: this.calculatePotentialSaving(waste),
        savingUnit: 'kWh',
        priority: waste.wasteLevel === 'critical' || waste.wasteLevel === 'high' ? 'high' : 'medium',
        implemented: false,
      });
    }
  }

  private handleSnapshotCreated(event: { type: string; payload: unknown }): void {
    const snapshot = event.payload as EnergySnapshot;
    if (!snapshot) return;

    this.generateSnapshotSuggestions(snapshot);
  }

  private mapWasteType(level: string): 'standby' | 'efficiency' | 'schedule' | 'replacement' {
    const typeMap: Record<string, 'standby' | 'efficiency' | 'schedule' | 'replacement'> = {
      low: 'efficiency',
      medium: 'standby',
      high: 'standby',
      critical: 'schedule',
    };
    return typeMap[level] || 'efficiency';
  }

  private calculatePotentialSaving(waste: LoadFeature & { power?: number }): number {
    const power = waste.power || (waste.waveform ? waste.waveform[waste.waveform.length - 1] : 100);
    return (power * 8) / 1000;
  }

  private async addSuggestion(suggestion: Omit<EnergySuggestion, 'id'>): Promise<string> {
    const id = generateId();
    const suggestionWithId = { ...suggestion, id };
    
    this.suggestions.unshift(suggestionWithId);
    
    if (this.suggestions.length > this.maxSuggestions) {
      this.suggestions.pop();
    }
    
    this.persistSuggestions();
    
    eventBus.send('suggestion:generated', suggestionWithId, 'engine', undefined, 'high');
    
    return id;
  }

  private async generateSnapshotSuggestions(snapshot: EnergySnapshot): Promise<void> {
    if (snapshot.efficiencyScore < 60) {
      this.addSuggestion({
        timestamp: Date.now(),
        deviceId: 'system',
        deviceName: '全屋系统',
        type: 'efficiency',
        title: '整体能效提升',
        description: `当前能效评分 ${snapshot.efficiencyScore.toFixed(0)}分，待机占比偏高`,
        potentialSaving: snapshot.standbyConsumption * 0.5,
        savingUnit: 'kWh',
        priority: 'medium',
        implemented: false,
      });
    }

    const highStandbyDevices = snapshot.deviceBreakdown.filter(
      d => d.standbyHours > 12 && d.consumption > 0.5
    );

    highStandbyDevices.slice(0, 3).forEach(device => {
      const existing = this.suggestions.find(
        s => s.deviceId === device.deviceId && !s.implemented
      );
      
      if (!existing) {
        this.addSuggestion({
          timestamp: Date.now(),
          deviceId: device.deviceId,
          deviceName: device.name,
          type: 'standby',
          title: `减少 ${device.name} 待机时间`,
          description: `该设备日均待机 ${device.standbyHours.toFixed(1)}小时，占比较高`,
          potentialSaving: device.consumption * 0.3,
          savingUnit: 'kWh',
          priority: device.standbyHours > 18 ? 'high' : 'medium',
          implemented: false,
        });
      }
    });
  }

  private persistSuggestions(): void {
    dbService.setMetadata('activeSuggestions', this.suggestions);
  }

  async implementSuggestion(id: string): Promise<void> {
    const suggestion = this.suggestions.find(s => s.id === id);
    if (suggestion) {
      suggestion.implemented = true;
      suggestion.timestamp = Date.now();
      this.persistSuggestions();
      
      eventBus.send('suggestion:generated', suggestion, 'engine', undefined, 'normal');
    }
  }

  async dismissSuggestion(id: string): Promise<void> {
    const index = this.suggestions.findIndex(s => s.id === id);
    if (index !== -1) {
      this.suggestions.splice(index, 1);
      this.persistSuggestions();
    }
  }

  getSuggestions(options: {
    implemented?: boolean;
    priority?: string;
    deviceId?: string;
    limit?: number;
  } = {}): EnergySuggestion[] {
    let result = [...this.suggestions];
    
    if (options.implemented !== undefined) {
      result = result.filter(s => s.implemented === options.implemented);
    }
    
    if (options.priority) {
      result = result.filter(s => s.priority === options.priority);
    }
    
    if (options.deviceId) {
      result = result.filter(s => s.deviceId === options.deviceId);
    }
    
    if (options.limit) {
      result = result.slice(0, options.limit);
    }
    
    return result.sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.timestamp - a.timestamp;
    });
  }

  getStats(): {
    total: number;
    active: number;
    implemented: number;
    totalPotentialSaving: number;
  } {
    const active = this.suggestions.filter(s => !s.implemented);
    const implemented = this.suggestions.filter(s => s.implemented);
    const totalPotentialSaving = active.reduce((sum, s) => sum + s.potentialSaving, 0);
    
    return {
      total: this.suggestions.length,
      active: active.length,
      implemented: implemented.length,
      totalPotentialSaving,
    };
  }

  async generatePersonalizedSuggestions(
    devices: Device[],
    snapshots: EnergySnapshot[]
  ): Promise<EnergySuggestion[]> {
    const suggestions: EnergySuggestion[] = [];
    
    if (snapshots.length < 7) {
      return suggestions;
    }

    const recentSnapshots = snapshots.slice(-7);
    recentSnapshots.reduce((sum, s) => sum + s.efficiencyScore, 0) / recentSnapshots.length;
    const trend = snapshots.length >= 14 
      ? (snapshots.slice(-7).reduce((sum, s) => sum + s.efficiencyScore, 0) - 
         snapshots.slice(-14, -7).reduce((sum, s) => sum + s.efficiencyScore, 0)) / 7
      : 0;

    if (trend < -5) {
      suggestions.push({
        id: generateId(),
        timestamp: Date.now(),
        deviceId: 'system',
        deviceName: '全屋系统',
        type: 'efficiency',
        title: '能效呈下降趋势',
        description: '近两周能效评分持续下降，建议检查用电习惯',
        potentialSaving: 50,
        savingUnit: 'kWh',
        priority: 'high',
        implemented: false,
      });
    }

    const highConsumption = [...devices].sort((a, b) => b.ratedPower - a.ratedPower).slice(0, 3);
    highConsumption.forEach(device => {
      suggestions.push({
        id: generateId(),
        timestamp: Date.now(),
        deviceId: device.id,
        deviceName: device.name,
        type: 'schedule',
        title: `智能调度 ${device.name}`,
        description: `该设备功率较高(${device.ratedPower}W)，建议错峰使用`,
        potentialSaving: (device.ratedPower * 20) / 1000,
        savingUnit: 'kWh',
        priority: 'medium',
        implemented: false,
      });
    });

    return suggestions;
  }

  destroy(): void {
    eventBus.unsubscribe('waste:detected', this.handleWasteDetected);
    eventBus.unsubscribe('snapshot:created', this.handleSnapshotCreated);
    this.suggestions = [];
    this.isInitialized = false;
  }
}

export const suggestionEngine = new SuggestionEngine();

export function useSuggestionEngine() {
  return suggestionEngine;
}
