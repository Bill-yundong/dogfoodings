import type { DispatchCommand } from '@/types';

export interface ProtocolConfig {
  version: string;
  maxLatency: number;
  syncInterval: number;
  signatureKey: string;
}

const DEFAULT_CONFIG: ProtocolConfig = {
  version: '1.0.0',
  maxLatency: 50,
  syncInterval: 1000,
  signatureKey: 'aeronexus-protocol-key',
};

interface TimedMessage {
  timestamp: number;
  monotonicTime: number;
  sequence: number;
}

class ProtocolAlignmentManager {
  private config: ProtocolConfig;
  private ntpOffset: number = 0;
  private lastSyncTime: number = 0;
  private sequenceCounter: number = 0;
  private commandQueue: Map<string, { command: DispatchCommand; timeout: number }> = new Map();
  private onCommandTimeout?: (command: DispatchCommand) => void;

  constructor(config?: Partial<ProtocolConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getCurrentTimestamp(): number {
    return Date.now() + this.ntpOffset;
  }

  getMonotonicTime(): number {
    return performance.now();
  }

  async syncWithNTP(serverTime?: number): Promise<number> {
    const t1 = this.getMonotonicTime();
    
    if (serverTime !== undefined) {
      const t2 = this.getMonotonicTime();
      const roundTripTime = t2 - t1;
      const oneWayDelay = roundTripTime / 2;
      this.ntpOffset = serverTime - (Date.now() + oneWayDelay);
      this.lastSyncTime = Date.now();
    }
    
    return this.ntpOffset;
  }

  needsSync(): boolean {
    return Date.now() - this.lastSyncTime > this.config.syncInterval;
  }

  createTimedMessage<T>(payload: T): T & TimedMessage {
    this.sequenceCounter = (this.sequenceCounter + 1) % Number.MAX_SAFE_INTEGER;
    
    return {
      ...payload,
      timestamp: this.getCurrentTimestamp(),
      monotonicTime: this.getMonotonicTime(),
      sequence: this.sequenceCounter,
    };
  }

  validateTimedMessage(message: TimedMessage): { valid: boolean; latency: number; skew: number } {
    const now = this.getCurrentTimestamp();
    const latency = now - message.timestamp;
    const monotonicNow = this.getMonotonicTime();
    const monotonicDiff = monotonicNow - message.monotonicTime;
    
    const valid = latency <= this.config.maxLatency && monotonicDiff >= 0;
    
    return {
      valid,
      latency,
      skew: Math.abs(latency - monotonicDiff),
    };
  }

  async alignCommand(command: DispatchCommand): Promise<DispatchCommand> {
    const now = this.getCurrentTimestamp();
    const executionDelay = this.calculateExecutionDelay(command);
    
    const scheduledTime = now + executionDelay;
    const alignedCommand: DispatchCommand = {
      ...command,
      scheduledTime,
      protocolVersion: this.config.version,
      signature: this.generateSignature(command),
      createdAt: now,
    };
    
    return alignedCommand;
  }

  private calculateExecutionDelay(command: DispatchCommand): number {
    const baseDelay = 10;
    
    const priorityDelays: Record<string, number> = {
      emergency: 0,
      high: 5,
      normal: 20,
      low: 50,
    };
    
    return baseDelay + (priorityDelays[command.priority] || 20);
  }

  private generateSignature(command: DispatchCommand): string {
    const data = `${command.id}:${command.equipmentId}:${command.scheduledTime}:${this.config.signatureKey}`;
    return this.simpleHash(data);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  verifySignature(command: DispatchCommand): boolean {
    const expectedSignature = this.generateSignature(command);
    return command.signature === expectedSignature;
  }

  scheduleCommandExecution(
    command: DispatchCommand,
    onExecute: (command: DispatchCommand) => void,
    onTimeout?: (command: DispatchCommand) => void
  ): void {
    const now = this.getCurrentTimestamp();
    const delay = command.scheduledTime - now;
    
    if (delay <= 0) {
      onExecute(command);
      return;
    }
    
    this.onCommandTimeout = onTimeout;
    
    const timeoutId = window.setTimeout(() => {
      const validation = this.validateTimedMessage({
        timestamp: command.scheduledTime,
        monotonicTime: 0,
        sequence: 0,
      });
      
      if (validation.valid) {
        onExecute(command);
      } else if (onTimeout) {
        onTimeout(command);
      }
      
      this.commandQueue.delete(command.id);
    }, Math.max(0, delay));
    
    this.commandQueue.set(command.id, { command, timeout: timeoutId });
  }

  cancelScheduledCommand(commandId: string): boolean {
    const entry = this.commandQueue.get(commandId);
    if (entry) {
      clearTimeout(entry.timeout);
      this.commandQueue.delete(commandId);
      return true;
    }
    return false;
  }

  getScheduledCommands(): DispatchCommand[] {
    return Array.from(this.commandQueue.values()).map((e) => e.command);
  }

  measureLatency(sendTime: number, receiveTime: number, replyTime: number): number {
    const now = this.getCurrentTimestamp();
    const roundTripTime = now - sendTime;
    const processingTime = replyTime - receiveTime;
    return (roundTripTime - processingTime) / 2;
  }

  getTimeAlignmentStats(): {
    ntpOffset: number;
    lastSyncTime: number;
    pendingCommands: number;
    sequence: number;
  } {
    return {
      ntpOffset: this.ntpOffset,
      lastSyncTime: this.lastSyncTime,
      pendingCommands: this.commandQueue.size,
      sequence: this.sequenceCounter,
    };
  }

  reset(): void {
    this.commandQueue.forEach((entry) => clearTimeout(entry.timeout));
    this.commandQueue.clear();
    this.sequenceCounter = 0;
  }
}

export const protocolManager = new ProtocolAlignmentManager();
