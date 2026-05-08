import type { SyncMessage, CrowdPressure, TrainSchedule, CapacityPrediction, TrafficSnapshot } from "@/types";
import { useSubwayStore } from "@/store/subwayStore";

type MessageHandler = (message: SyncMessage) => void;

class DataSyncService {
  private handlers: Map<string, MessageHandler[]> = new Map();
  private messageQueue: SyncMessage[] = [];
  private isProcessing: boolean = false;
  private syncInterval: number | null = null;
  
  constructor() {
    this.setupInternalSync();
  }
  
  private setupInternalSync(): void {
    this.subscribe("crowd-pressure", this.handleCrowdPressure.bind(this));
    this.subscribe("train-schedule", this.handleTrainSchedule.bind(this));
    this.subscribe("capacity-prediction", this.handleCapacityPrediction.bind(this));
    this.subscribe("snapshot", this.handleSnapshot.bind(this));
  }
  
  private handleCrowdPressure(message: SyncMessage): void {
    const pressure = message.data as CrowdPressure;
    useSubwayStore.getState().updateCrowdPressure(pressure);
    useSubwayStore.getState().setSyncing(false);
  }
  
  private handleTrainSchedule(message: SyncMessage): void {
    const schedules = message.data as TrainSchedule[];
    if (schedules.length > 0) {
      useSubwayStore.getState().updateTrainSchedules(schedules[0].stationId, schedules);
    }
    useSubwayStore.getState().setSyncing(false);
  }
  
  private handleCapacityPrediction(message: SyncMessage): void {
    const prediction = message.data as CapacityPrediction;
    useSubwayStore.getState().updateCapacityPrediction(prediction);
    useSubwayStore.getState().setSyncing(false);
  }
  
  private handleSnapshot(message: SyncMessage): void {
    const snapshot = message.data as TrafficSnapshot;
    useSubwayStore.getState().addSnapshot(snapshot);
    useSubwayStore.getState().setSyncing(false);
  }
  
  subscribe(type: SyncMessage["type"], handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }
  
  unsubscribe(type: SyncMessage["type"], handler: MessageHandler): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      const index = typeHandlers.indexOf(handler);
      if (index > -1) {
        typeHandlers.splice(index, 1);
      }
    }
  }
  
  async publish(message: SyncMessage): Promise<void> {
    useSubwayStore.getState().setSyncing(true);
    this.messageQueue.push(message);
    await this.processQueue();
  }
  
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      const handlers = this.handlers.get(message.type);
      
      if (handlers) {
        for (const handler of handlers) {
          try {
            await handler(message);
          } catch (error) {
            console.error(`Error processing message of type ${message.type}:`, error);
          }
        }
      }
      
      useSubwayStore.getState().syncFromMessage(message);
    }
    
    this.isProcessing = false;
  }
  
  startMockDataSync(intervalMs: number = 3000): void {
    if (this.syncInterval) {
      this.stopMockDataSync();
    }
    
    this.syncInterval = window.setInterval(() => {
      const { stations } = useSubwayStore.getState();
      
      for (const station of stations) {
        const crowdPressureEvent: CustomEvent<SyncMessage> = new CustomEvent("data-sync", {
          detail: {
            type: "crowd-pressure",
            data: {
              stationId: station.id,
              timestamp: Date.now(),
              currentDensity: 0.3 + Math.random() * 0.5,
              maxDensity: 1.0,
              riskLevel: ["low", "medium", "high", "critical"][Math.floor(Math.random() * 4)] as CrowdPressure["riskLevel"],
              entryRate: Math.floor(50 + Math.random() * 100),
              exitRate: Math.floor(40 + Math.random() * 90),
              platformLoad: Array(station.platforms).fill(0).map(() => 0.2 + Math.random() * 0.6),
            } as CrowdPressure,
            timestamp: Date.now(),
            source: "security",
          }
        });
        
        window.dispatchEvent(crowdPressureEvent);
      }
    }, intervalMs);
  }
  
  stopMockDataSync(): void {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const dataSyncService = new DataSyncService();
