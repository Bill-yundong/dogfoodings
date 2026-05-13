import { Package, WCSCommand, PLCStatus, AlignmentResult } from '../types/core';
import { SYSTEM_CONFIG, COMMAND_ACTION, COMMAND_STATUS } from '../config/constants';
import { v4 as uuidv4 } from 'uuid';

type EventHandler = (event: unknown) => void;

export class PlcSyncEngine {
  private commandQueue: WCSCommand[] = [];
  private plcStatusMap: Map<string, PLCStatus> = new Map();
  private packagePositionMap: Map<string, string> = new Map();
  private readonly alignmentThreshold: number;
  private readonly maxRetries: number;
  private readonly commandTimeout: number;

  private onCommandSent?: (command: WCSCommand) => void;
  private onMisalignment?: (result: AlignmentResult) => void;
  private onCommandExecuted?: (command: WCSCommand) => void;

  constructor() {
    const { THRESHOLD_MS, MAX_RETRIES, COMMAND_TIMEOUT } = SYSTEM_CONFIG.ALIGNMENT;
    this.alignmentThreshold = THRESHOLD_MS;
    this.maxRetries = MAX_RETRIES;
    this.commandTimeout = COMMAND_TIMEOUT;
  }

  setEventHandlers(handlers: {
    onCommandSent?: (command: WCSCommand) => void;
    onMisalignment?: (result: AlignmentResult) => void;
    onCommandExecuted?: (command: WCSCommand) => void;
  }): void {
    this.onCommandSent = handlers.onCommandSent;
    this.onMisalignment = handlers.onMisalignment;
    this.onCommandExecuted = handlers.onCommandExecuted;
  }

  updatePLCStatus(status: PLCStatus): void {
    this.plcStatusMap.set(status.nodeId, {
      ...status,
      lastUpdate: Date.now()
    });
  }

  updatePackagePosition(packageId: string, nodeId: string): void {
    this.packagePositionMap.set(packageId, nodeId);
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
      status: COMMAND_STATUS.PENDING
    };
  }

  enqueueCommand(command: WCSCommand): void {
    this.commandQueue.push(command);
    this.processQueue();
  }

  private processQueue(): void {
    const now = Date.now();
    const pendingCommands = this.commandQueue.filter(
      cmd => cmd.status === COMMAND_STATUS.PENDING && cmd.deadline > now
    );

    pendingCommands.sort((a, b) => {
      if (a.action === COMMAND_ACTION.EJECT && b.action !== COMMAND_ACTION.EJECT) return -1;
      if (b.action === COMMAND_ACTION.EJECT && a.action !== COMMAND_ACTION.EJECT) return 1;
      return a.timestamp - b.timestamp;
    });

    pendingCommands.forEach(cmd => this.sendToPLC(cmd));
  }

  private sendToPLC(command: WCSCommand): void {
    command.status = COMMAND_STATUS.SENT;
    
    if (this.onCommandSent) {
      this.onCommandSent(command);
    }

    setTimeout(() => {
      this.simulatePlcAck(command);
    }, Math.random() * 15 + 5);
  }

  private simulatePlcAck(command: WCSCommand): void {
    const now = Date.now();
    command.plcAckTime = now;
    command.status = COMMAND_STATUS.ACKNOWLEDGED;

    setTimeout(() => {
      const success = Math.random() > 0.02;
      if (success) {
        command.status = COMMAND_STATUS.EXECUTED;
        command.executionTime = Date.now();
        if (this.onCommandExecuted) {
          this.onCommandExecuted(command);
        }
      } else {
        command.status = COMMAND_STATUS.FAILED;
      }
    }, Math.random() * 20 + 10);
  }

  verifyAlignment(packageId: string, expectedNode: string): AlignmentResult {
    const actualNode = this.packagePositionMap.get(packageId);
    const wcsTime = Date.now();
    const plcTime = this.getLatestPlcTimestamp();

    const timeDiff = Math.abs(wcsTime - plcTime);
    const isAligned = actualNode === expectedNode && timeDiff < this.alignmentThreshold;

    const result: AlignmentResult = {
      isAligned,
      timeDiff,
      wcsTime,
      plcTime,
      packageId
    };

    if (!isAligned && this.onMisalignment) {
      this.onMisalignment(result);
    }

    return result;
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

  handleMisalignment(packageId: string, expectedPath: string[]): WCSCommand | null {
    const currentPosition = this.packagePositionMap.get(packageId);
    if (!currentPosition) return null;

    const expectedIndex = expectedPath.indexOf(currentPosition);

    if (expectedIndex === -1) {
      return this.createCommand(packageId, COMMAND_ACTION.EJECT, 'RECOVERY_CHUTE');
    }

    const nextExpected = expectedPath[expectedIndex + 1];
    if (nextExpected) {
      return this.createCommand(packageId, COMMAND_ACTION.REDIRECT, nextExpected);
    }

    return null;
  }

  getCommandStatus(commandId: string): WCSCommand | undefined {
    return this.commandQueue.find(cmd => cmd.id === commandId);
  }

  getPendingCommands(): WCSCommand[] {
    return this.commandQueue.filter(
      cmd => cmd.status === COMMAND_STATUS.PENDING || cmd.status === COMMAND_STATUS.SENT
    );
  }

  getExecutedCommands(): WCSCommand[] {
    return this.commandQueue.filter(cmd => cmd.status === COMMAND_STATUS.EXECUTED);
  }

  getAverageLatency(): number {
    const executedCommands = this.getExecutedCommands().filter(
      cmd => cmd.plcAckTime && cmd.executionTime
    );

    if (executedCommands.length === 0) return 0;

    const totalLatency = executedCommands.reduce((sum, cmd) => {
      return sum + ((cmd.executionTime || 0) - (cmd.plcAckTime || 0));
    }, 0);

    return totalLatency / executedCommands.length;
  }

  getAlignmentRate(): number {
    const recentCommands = this.getExecutedCommands().slice(-50);
    if (recentCommands.length === 0) return 1;

    let alignedCount = 0;
    recentCommands.forEach(cmd => {
      const actualPosition = this.packagePositionMap.get(cmd.packageId);
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
    return this.packagePositionMap.get(packageId);
  }

  getAllPackagePositions(): Map<string, string> {
    return new Map(this.packagePositionMap);
  }

  reset(): void {
    this.commandQueue = [];
    this.plcStatusMap.clear();
    this.packagePositionMap.clear();
  }
}

export default PlcSyncEngine;
