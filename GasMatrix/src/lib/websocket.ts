import type { RealtimeMessage, PressureData, Command, Alert } from '@/types';
import { mockStations } from './mockData';

type MessageHandler = (message: RealtimeMessage) => void;

class MockWebSocketService {
  private handlers: Set<MessageHandler> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private pressureIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isConnected: boolean = false;

  connect(): void {
    if (this.isConnected) return;
    
    this.isConnected = true;
    this.startPressureUpdates();
    
    setTimeout(() => {
      this.broadcast({
        type: 'pressure_update',
        timestamp: Date.now(),
        payload: { connected: true },
      });
    }, 100);
  }

  disconnect(): void {
    this.isConnected = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.pressureIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pressureIntervals.clear();
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private broadcast(message: RealtimeMessage): void {
    this.handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (e) {
        console.error('Error in WebSocket handler:', e);
      }
    });
  }

  private startPressureUpdates(): void {
    mockStations.forEach((station) => {
      const interval = setInterval(() => {
        if (!this.isConnected) return;
        
        const basePressure = station.normalPressure;
        const variation = (Math.random() - 0.5) * 0.03;
        const pressure = Math.round(basePressure * (1 + variation));
        const flowRate = Math.round((80 + Math.random() * 60) * 10) / 10;
        const temperature = Math.round((15 + Math.random() * 15) * 10) / 10;

        const pressureData: PressureData = {
          id: `${station.id}-${Date.now()}`,
          stationId: station.id,
          pressure,
          flowRate,
          temperature,
          timestamp: Date.now(),
        };

        this.broadcast({
          type: 'pressure_update',
          timestamp: Date.now(),
          payload: pressureData,
        });

        if (pressure < station.minPressure * 1.02) {
          const alert: Alert = {
            id: `ALT-${Date.now()}`,
            stationId: station.id,
            type: 'pressure_low',
            level: 'warning',
            message: `${station.name}压力接近下限`,
            timestamp: Date.now(),
            acknowledged: false,
          };
          this.broadcast({
            type: 'alert',
            timestamp: Date.now(),
            payload: alert,
          });
        } else if (pressure > station.maxPressure * 0.98) {
          const alert: Alert = {
            id: `ALT-${Date.now()}`,
            stationId: station.id,
            type: 'pressure_high',
            level: 'warning',
            message: `${station.name}压力接近上限`,
            timestamp: Date.now(),
            acknowledged: false,
          };
          this.broadcast({
            type: 'alert',
            timestamp: Date.now(),
            payload: alert,
          });
        }
      }, 2000 + Math.random() * 3000);

      this.pressureIntervals.set(station.id, interval);
    });
  }

  sendCommand(command: Command): void {
    setTimeout(() => {
      const updatedCommand: Command = {
        ...command,
        status: 'executing',
        executedAt: Date.now(),
      };
      
      this.broadcast({
        type: 'command_status',
        timestamp: Date.now(),
        payload: updatedCommand,
      });

      setTimeout(() => {
        const completedCommand: Command = {
          ...updatedCommand,
          status: 'completed',
          completedAt: Date.now(),
        };
        
        this.broadcast({
          type: 'command_status',
          timestamp: Date.now(),
          payload: completedCommand,
        });
      }, 5000 + Math.random() * 5000);
    }, 500);
  }

  createSnapshot(): void {
    setTimeout(() => {
      this.broadcast({
        type: 'snapshot_created',
        timestamp: Date.now(),
        payload: {
          id: `SNAP-${Date.now()}`,
          timestamp: Date.now(),
        },
      });
    }, 1000);
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const websocketService = new MockWebSocketService();

export function useWebSocket(handler: MessageHandler): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  websocketService.connect();
  return websocketService.subscribe(handler);
}
