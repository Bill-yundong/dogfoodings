import { mockPlatforms, mockHelicopters } from '@/mock/data';
import type { WeatherData, HelicopterPosition, Alert } from '@/types';

type MessageType = 'weather' | 'helicopter' | 'alert' | 'sync_status';

interface WebSocketMessage<T = unknown> {
  type: MessageType;
  data: T;
  timestamp: number;
}

type MessageHandler = (message: WebSocketMessage) => void;

class MockWebSocketService {
  private handlers: Set<MessageHandler> = new Set();
  private intervals: Map<MessageType, number> = new Map();
  private connected: boolean = false;

  connect() {
    if (this.connected) return;
    this.connected = true;

    this.startWeatherStream();
    this.startHelicopterStream();

    console.log('[WebSocket] Mock connection established');
  }

  disconnect() {
    this.connected = false;
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();
    this.handlers.clear();
    console.log('[WebSocket] Mock connection closed');
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private broadcast(message: WebSocketMessage) {
    this.handlers.forEach(handler => {
      try {
        handler(message);
      } catch (e) {
        console.error('[WebSocket] Handler error:', e);
      }
    });
  }

  private startWeatherStream() {
    if (this.intervals.has('weather')) return;

    const interval = window.setInterval(() => {
      mockPlatforms.slice(0, 3).forEach(platform => {
        const baseWind = 8 + Math.random() * 12;
        const baseWave = 1.5 + Math.random() * 2.5;
        const windSpeed = Number((baseWind + Math.sin(Date.now() * 0.0001) * 3).toFixed(1));
        const waveHeight = Number((baseWave + Math.cos(Date.now() * 0.00008) * 1.2).toFixed(1));
        const visibility = Math.max(0.5, Number((12 - waveHeight * 0.8 + Math.random() * 2).toFixed(1)));

        let dataQuality: 'good' | 'warning' | 'critical' = 'good';
        if (windSpeed > 15 || waveHeight > 3 || visibility < 2) {
          dataQuality = windSpeed > 22 || waveHeight > 5 || visibility < 1 ? 'critical' : 'warning';
        }

        const weatherData: WeatherData = {
          id: `weather-${platform.id}-${Date.now()}`,
          timestamp: Date.now(),
          platformId: platform.id,
          windSpeed,
          windDirection: Math.floor(Math.random() * 360),
          waveHeight,
          wavePeriod: Number((7 + Math.random() * 6).toFixed(1)),
          temperature: Number((20 + Math.random() * 8).toFixed(1)),
          pressure: Number((1015 + Math.random() * 15 - 7.5).toFixed(0)),
          visibility,
          dataQuality,
        };

        const message: WebSocketMessage<WeatherData> = {
          type: 'weather',
          data: weatherData,
          timestamp: Date.now(),
        };

        this.broadcast(message);
      });
    }, 3000);

    this.intervals.set('weather', interval);
  }

  private startHelicopterStream() {
    if (this.intervals.has('helicopter')) return;

    const positions = new Map(mockHelicopters.map(h => [h.id, { ...h }]));

    const interval = window.setInterval(() => {
      positions.forEach(heli => {
        const latDelta = (Math.random() - 0.5) * 0.05;
        const lngDelta = (Math.random() - 0.5) * 0.05;

        const updated: HelicopterPosition = {
          ...heli,
          latitude: Number((heli.latitude + latDelta).toFixed(4)),
          longitude: Number((heli.longitude + lngDelta).toFixed(4)),
          altitude: Math.max(100, Math.min(1500, heli.altitude + Math.floor(Math.random() * 40 - 20))),
          heading: Math.floor((heli.heading + (Math.random() - 0.5) * 10 + 360) % 360),
          speed: Math.max(150, Math.min(280, heli.speed + Math.floor(Math.random() * 20 - 10))),
          timestamp: Date.now(),
        };

        positions.set(heli.id, updated);

        const message: WebSocketMessage<HelicopterPosition> = {
          type: 'helicopter',
          data: updated,
          timestamp: Date.now(),
        };

        this.broadcast(message);
      });
    }, 2000);

    this.intervals.set('helicopter', interval);
  }

  sendAlert(alert: Alert) {
    const message: WebSocketMessage<Alert> = {
      type: 'alert',
      data: alert,
      timestamp: Date.now(),
    };
    this.broadcast(message);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const mockWebSocket = new MockWebSocketService();
