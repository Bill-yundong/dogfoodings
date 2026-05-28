import type {
  ClientMessage,
  ServerMessage,
  ClientState,
  ProbeResult,
  SyncHandshake,
  AcceleratorNode,
} from '@shared/protocol';
import { PROTOCOL_VERSION, CLIENT_VERSION } from '@shared/protocol';
import { generateId } from '@/utils/math';

export interface SyncConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface SyncStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  reconnectCount: number;
  lastMessageTime: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  url: 'ws://localhost:3001/ws',
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

export class SemanticSyncService {
  private config: SyncConfig;
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts: number = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private lastSyncTime: number = 0;
  private pendingMessages: ClientMessage[] = [];

  private stats: SyncStats = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    reconnectCount: 0,
    lastMessageTime: 0,
  };

  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private messageListeners: Set<(message: ServerMessage) => void> = new Set();
  private nodeListeners: Set<(nodes: AcceleratorNode[]) => void> = new Set();

  constructor(config?: Partial<SyncConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => this.onOpen();
      this.ws.onmessage = (event) => this.onMessage(event);
      this.ws.onerror = (error) => this.onError(error);
      this.ws.onclose = (event) => this.onClose(event);
    } catch (e) {
      console.error('WebSocket connection error:', e);
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();
    this.reconnectAttempts = 0;

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  sendProbeResults(results: ProbeResult[]): void {
    if (!results.length) return;

    const message: ClientMessage = {
      type: 'PROBE_REPORT',
      data: results,
    };

    this.sendMessage(message);
  }

  sendStatusSync(clientState: ClientState): void {
    const message: ClientMessage = {
      type: 'STATUS_SYNC',
      clientState,
    };

    this.sendMessage(message);
  }

  requestPathSwitch(targetPathId: string, reason: string): string {
    const message: ClientMessage = {
      type: 'PATH_SWITCH_REQUEST',
      targetPathId,
      reason,
    };

    this.sendMessage(message);
    return generateId();
  }

  requestNodeDiscovery(): void {
    const message: ClientMessage = {
      type: 'NODE_DISCOVERY',
    };

    this.sendMessage(message);
  }

  private sendHandshake(): void {
    const handshake: SyncHandshake = {
      clientVersion: CLIENT_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      supportedMetrics: ['latency', 'jitter', 'packetLoss', 'bandwidth'],
      syncInterval: 5000,
    };

    const message: ClientMessage = {
      type: 'HANDSHAKE',
      handshake,
    };

    this.sendMessage(message);
  }

  private sendMessage(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const data = JSON.stringify(message);
        this.ws.send(data);
        this.stats.messagesSent++;
        this.stats.bytesSent += data.length;
        this.stats.lastMessageTime = Date.now();
      } catch (e) {
        console.error('Send message error:', e);
        this.pendingMessages.push(message);
      }
    } else {
      this.pendingMessages.push(message);
      if (this.pendingMessages.length > 100) {
        this.pendingMessages.shift();
      }
    }
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private onOpen(): void {
    this.setStatus('connected');
    this.reconnectAttempts = 0;
    this.lastSyncTime = Date.now();
    this.stats.reconnectCount = 0;

    this.sendHandshake();
    this.startHeartbeat();
    this.flushPendingMessages();
  }

  private onMessage(event: MessageEvent): void {
    this.stats.messagesReceived++;
    this.stats.bytesReceived += event.data.length;
    this.stats.lastMessageTime = Date.now();

    try {
      const message: ServerMessage = JSON.parse(event.data);
      this.handleMessage(message);
    } catch (e) {
      console.error('Parse message error:', e);
    }
  }

  private handleMessage(message: ServerMessage): void {
    for (const listener of this.messageListeners) {
      try {
        listener(message);
      } catch (e) {
        console.error('Message listener error:', e);
      }
    }

    switch (message.type) {
      case 'NODE_STATUS':
        this.notifyNodeListeners(message.nodes);
        break;
      case 'HANDSHAKE_ACK':
        this.lastSyncTime = message.serverTime;
        break;
      case 'QUALITY_ALERT':
        console.log('Quality alert:', message);
        break;
      case 'PATH_SWITCH_ACK':
        console.log('Path switch ACK:', message);
        break;
      case 'OPTIMIZATION_SUGGESTION':
        console.log('Optimization suggestion:', message);
        break;
    }
  }

  private onError(event: Event): void {
    console.error('WebSocket error:', event);
    this.setStatus('error');
  }

  private onClose(_event: CloseEvent): void {
    if (this.status !== 'disconnected') {
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    }
    this.stopHeartbeat();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.setStatus('disconnected');
      return;
    }

    this.stopReconnect();

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      60000
    );

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.stats.reconnectCount++;
      void this.connect();
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status !== status) {
      this.status = status;
      for (const listener of this.statusListeners) {
        try {
          listener(status);
        } catch (e) {
          console.error('Status listener error:', e);
        }
      }
    }
  }

  private notifyNodeListeners(nodes: AcceleratorNode[]): void {
    for (const listener of this.nodeListeners) {
      try {
        listener(nodes);
      } catch (e) {
        console.error('Node listener error:', e);
      }
    }
  }

  addStatusListener(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  addMessageListener(listener: (message: ServerMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  addNodeListener(listener: (nodes: AcceleratorNode[]) => void): () => void {
    this.nodeListeners.add(listener);
    return () => this.nodeListeners.delete(listener);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }

  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  updateConfig(config: Partial<SyncConfig>): void {
    const wasConnected = this.status === 'connected';
    this.config = { ...this.config, ...config };

    if (wasConnected && config.url) {
      this.disconnect();
      void this.connect();
    }
  }

  dispose(): void {
    this.disconnect();
    this.statusListeners.clear();
    this.messageListeners.clear();
    this.nodeListeners.clear();
    this.pendingMessages = [];
  }
}

export const semanticSyncService = new SemanticSyncService();
