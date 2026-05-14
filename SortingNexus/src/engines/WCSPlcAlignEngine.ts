import { v4 as uuidv4 } from 'uuid';
import { WCSCommand, PLCStatus } from '../types';
import { SYSTEM_CONFIG } from '../config/constants';

export class WCSPlcAlignEngine {
  private commandQueue: WCSCommand[] = [];
  private plcStatusMap: Map<string, PLCStatus> = new Map();
  private packagePositions: Map<string, string> = new Map();
  private readonly alignmentThreshold: number;
  private readonly commandTimeout: number;

  private onCommandSent?: (command: WCSCommand) => void;
  private onMisalignment?: (packageId: string) => void;

  constructor() {
    const { THRESHOLD_MS, COMMAND_TIMEOUT } = SYSTEM_CONFIG.ALIGNMENT;
    this.alignmentThreshold = THRESHOLD_MS;
    this.commandTimeout = COMMAND_TIMEOUT;
  }

  setEventHandlers(handlers: {
    onCommandSent?: (command: WCSCommand) => void;
    onMisalignment?: (packageId: string) => void;
  }): void {
    this.onCommandSent = handlers.onCommandSent;
    this.onMisalignment = handlers.onMisalignment;
  }

  updatePLCStatus(status: PLCStatus): void {
    this.plcStatusMap.set(status.nodeId, {
      ...status,
      lastUpdate: Date.now()
    });
  }

  updatePackagePosition(packageId: string, nodeId: string): void {
    this.packagePositions.set(packageId, nodeId);
  }

  createCommand(
    packageId: string,
    action: WCSCommand['action'],
    targetNode: string
  ): WCSCommand {
    const now = Date.now();
    return {
      id: uuidv4(),
      packageId,
      action,
      targetNode,
      timestamp: now,
      deadline: now + this.commandTimeout,
      status: 'pending'
    };
  }

  enqueueCommand(command: WCSCommand): void {
    this.commandQueue.push(command);
    this.processQueue();
  }

  private processQueue(): void {
    const pendingCommands = this.commandQueue.filter(cmd => cmd.status === 'pending');
    
    pendingCommands.sort((a, b) => {
      if (a.action === 'eject' && b.action !== 'eject') return -1;
      if (b.action === 'eject' && a.action !== 'eject') return 1;
      return a.timestamp - b.timestamp;
    });

    pendingCommands.forEach(cmd => this.sendToPLC(cmd));
  }

  private sendToPLC(command: WCSCommand): void {
    command.status = 'sent';
    
    if (this.onCommandSent) {
      this.onCommandSent(command);
    }

    setTimeout(() => {
      command.plcAckTime = Date.now();
      command.status = 'acknowledged';

      setTimeout(() => {
        command.status = 'executed';
        command.executionTime = Date.now();
      }, Math.random() * 20 + 10);
    }, Math.random() * 15 + 5);
  }

  verifyAlignment(packageId: string, expectedNode: string, timestamp?: number): boolean {
    const actualNode = this.packagePositions.get(packageId);
    const isPosition = actualNode === expectedNode;
    
    const now = timestamp || Date.now();
    const latestPlcTime = this.getLatestPlcTimestamp();
    const timeDiff = Math.abs(now - latestPlcTime);
    const isTimeAligned = timeDiff < this.alignmentThreshold;
    const isAligned = isPosition && isTimeAligned;

    if (!isAligned && this.onMisalignment) {
      this.onMisalignment(packageId);
    }

    return isAligned;
  }

  private getLatestPlcTimestamp(): number {
    let latest = 0;
    this.plcStatusMap.forEach(status => {
      if (status.lastUpdate > latest) {
        latest = status.lastUpdate;
      }
    });
    return latest || Date.now();
  }

  handleMisalignment(packageId: string): WCSCommand {
    return this.createCommand(packageId, 'eject', 'RECOVERY_CHUTE');
  }

  getAverageLatency(): number {
    const executedCommands = this.commandQueue.filter(
      cmd => cmd.status === 'executed' && cmd.plcAckTime && cmd.executionTime
    );

    if (executedCommands.length === 0) return 15;

    const totalLatency = executedCommands.reduce((sum, cmd) => {
      return sum + ((cmd.executionTime || 0) - (cmd.plcAckTime || 0));
    }, 0);

    return totalLatency / executedCommands.length;
  }

  getAlignmentRate(): number {
    const recentCommands = this.commandQueue.filter(
      cmd => cmd.status === 'executed'
    ).slice(-50);

    if (recentCommands.length === 0) return 1;

    let alignedCount = 0;
    recentCommands.forEach(cmd => {
      const actualPosition = this.packagePositions.get(cmd.packageId);
      if (actualPosition === cmd.targetNode) {
        alignedCount++;
      }
    });

    return alignedCount / recentCommands.length;
  }

  cleanupOldCommands(): void {
    const cutoffTime = Date.now() - 60000;
    this.commandQueue = this.commandQueue.filter(
      cmd => cmd.timestamp > cutoffTime
    );
  }

  getPLCStatus(nodeId: string): PLCStatus | undefined {
    return this.plcStatusMap.get(nodeId);
  }

  getAllPLCStatus(): PLCStatus[] {
    return Array.from(this.plcStatusMap.values());
  }

  getPackagePosition(packageId: string): string | undefined {
    return this.packagePositions.get(packageId);
  }

  reset(): void {
    this.commandQueue = [];
    this.plcStatusMap.clear();
    this.packagePositions.clear();
  }
}

export default WCSPlcAlignEngine;
