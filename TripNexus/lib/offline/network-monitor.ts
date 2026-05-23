import { NetworkState } from '@/lib/types';

type NetworkChangeListener = (state: NetworkState) => void;

let networkMonitorInstance: NetworkMonitor | null = null;

export class NetworkMonitor {
  private listeners: Set<NetworkChangeListener> = new Set();
  private currentState: NetworkState;
  private pingInterval: number | null = null;
  private lastLatency: number = 0;

  constructor() {
    this.currentState = {
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      since: new Date().toISOString(),
      latency: 0,
    };

    if (typeof window !== 'undefined') {
      this.setupEventListeners();
      this.startLatencyCheck();
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.currentState = {
      online: true,
      since: new Date().toISOString(),
      latency: this.lastLatency,
    };
    this.notifyListeners();
  }

  private handleOffline(): void {
    this.currentState = {
      online: false,
      since: new Date().toISOString(),
      latency: 0,
    };
    this.notifyListeners();
  }

  private startLatencyCheck(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = window.setInterval(() => {
      this.checkLatency();
    }, 10000);
  }

  private async checkLatency(): Promise<void> {
    if (!this.currentState.online) return;

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/ping', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeoutId);
      this.lastLatency = Math.round(performance.now() - start);
      this.currentState.latency = this.lastLatency;
    } catch {
      this.lastLatency = -1;
      this.currentState.latency = -1;
    }
  }

  subscribe(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): NetworkState {
    return { ...this.currentState };
  }

  isOnline(): boolean {
    return this.currentState.online;
  }

  isOffline(): boolean {
    return !this.currentState.online;
  }

  getLatency(): number {
    return this.currentState.latency;
  }

  isWeakConnection(): boolean {
    return this.currentState.online && 
           this.currentState.latency > 0 && 
           this.currentState.latency > 1000;
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentState);
      } catch (e) {
        console.error('Network listener error:', e);
      }
    }
  }

  destroy(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
    this.listeners.clear();
  }

  stop(): void {
    this.destroy();
  }

  static getInstance(): NetworkMonitor {
    return getNetworkMonitor();
  }
}

export const getNetworkMonitor = (): NetworkMonitor => {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor();
  }
  return networkMonitorInstance;
};

export const destroyNetworkMonitor = (): void => {
  if (networkMonitorInstance) {
    networkMonitorInstance.destroy();
    networkMonitorInstance = null;
  }
};
