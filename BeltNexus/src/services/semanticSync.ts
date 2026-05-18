import type { SensorData, SemanticSensorData } from '@/types';

type TopicCallback = (data: any) => void;

export class SemanticSynchronizer {
  private subscribers = new Map<string, Set<TopicCallback>>();
  private lastPublishTime = new Map<string, number>();
  private minPublishInterval = 100;

  subscribe(topic: string, callback: TopicCallback): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(callback);
    
    return () => {
      this.subscribers.get(topic)?.delete(callback);
    };
  }

  publish(topic: string, data: SensorData): void {
    const now = Date.now();
    const lastTime = this.lastPublishTime.get(topic) || 0;
    
    if (now - lastTime < this.minPublishInterval) {
      return;
    }
    
    this.lastPublishTime.set(topic, now);
    
    const semanticData = this.enrichWithSemantics(data);
    const callbacks = this.subscribers.get(topic);
    
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(semanticData);
        } catch (e) {
          console.error('Semantic sync callback error:', e);
        }
      });
    }
  }

  publishBatch(topic: string, data: SensorData[]): void {
    data.forEach((d) => this.publish(topic, d));
  }

  private enrichWithSemantics(data: SensorData): SemanticSensorData {
    return {
      ...data,
      semantics: {
        domain: 'belt_conveyor',
        entity: 'fiber_sensor',
        quantity: this.getQuantityType(data),
        unit: this.getUnit(data),
        timestamp: new Date(data.timestamp).toISOString(),
      },
    };
  }

  private getQuantityType(data: SensorData): string {
    const maxValue = Math.max(data.tension, data.temperature, data.vibration, data.strain);
    if (maxValue === data.tension) return 'tension';
    if (maxValue === data.temperature) return 'temperature';
    if (maxValue === data.vibration) return 'vibration';
    return 'strain';
  }

  private getUnit(data: SensorData): string {
    const maxValue = Math.max(data.tension, data.temperature, data.vibration, data.strain);
    if (maxValue === data.tension) return 'kN';
    if (maxValue === data.temperature) return '°C';
    if (maxValue === data.vibration) return 'mm/s';
    return 'mm/mm';
  }

  clear(): void {
    this.subscribers.clear();
    this.lastPublishTime.clear();
  }
}

export const semanticSync = new SemanticSynchronizer();

export function syncToVFD(data: SemanticSensorData): void {
  console.debug('[VFD Sync]', data.semantics.quantity, data.semantics.timestamp);
}

export function syncToOperationSystem(data: SemanticSensorData): void {
  console.debug('[Ops Sync]', data.sensorId, data.position);
}
