import { Package, WCSCommand, PLCStatus, AlignmentResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class WCSPLCAligner {
  private commandQueue: WCSCommand[] = [];
  private plcStatusMap: Map<string, PLCStatus> = new Map();
  private packagePositionMap: Map<string, string> = new Map();
  private alignmentThreshold = 50;
  private maxRetries = 3;
  private commandTimeout = 1000;

  private onCommandSent?: (command: WCSCommand) => void;
  private onMisalignment?: (result: AlignmentResult) => void;

  setEventHandlers(
    onCommandSent?: (command: WCSCommand) => void,
    onMisalignment?: (result: AlignmentResult) => void
  ): void {
    this.onCommandSent = onCommandSent;
    this.onMisalignment = onMisalignment;
  }

  updatePLCStatus(status: PLCStatus): void {
    this.plcStatusMap.set(status.nodeId, {
      ...status,
      lastUpdate: Date.now()
    });
  }

  updatePackagePosition(packageId: string, nodeId: string, timestamp: number): void {
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
      status: 'pending'
    };
  }

  enqueueCommand(command: WCSCommand): void {
    this.commandQueue.push(command);
    this.processQueue();
  }

  private processQueue(): void {
    const now = Date.now();
    const pendingCommands = this.commandQueue.filter(
      cmd => cmd.status === 'pending' && cmd.deadline > now
    );

    pendingCommands.sort((a, b) => {
      if (a.action === 'eject' && b.action !== 'eject') return -1;
      if (b.action === 'eject' && a.action !== 'eject') return 1;
      return a.timestamp - b.timestamp;
    });

    pendingCommands.forEach(cmd => {
      this.sendToPLC(cmd);
    });
  }

  private sendToPLC(command: WCSCommand): void {
    command.status = 'sent';
    if (this.onCommandSent) {
      this.onCommandSent(command);
    }

    setTimeout(() => {
      this.simulatePLCAck(command);
    }, Math.random() * 20 + 5);
  }

  private simulatePLCAck(command: WCSCommand): void {
    const now = Date.now();
    command.plcAckTime = now;
    command.status = 'acknowledged';

    setTimeout(() => {
      const success = Math.random() > 0.02;
      if (success) {
        command.status = 'executed';
        command.executionTime = Date.now();
      } else {
        command.status = 'failed';
      }
    }, Math.random() * 30 + 10);
  }

  verifyAlignment(packageId: string, expectedNode: string): AlignmentResult {
    const actualNode = this.packagePositionMap.get(packageId);
    const wcsTime = Date.now();
    const plcTime = this.getLatestPLCTime();

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

  private getLatestPLCTime(): number {
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
      return this.createCommand(packageId, 'eject', 'RECOVERY_CHUTE');
    }

    const nextExpected = expectedPath[expectedIndex + 1];
    if (nextExpected) {
      return this.createCommand(packageId, 'redirect', nextExpected);
    }

    return null;
  }

  getCommandStatus(commandId: string): WCSCommand | undefined {
    return this.commandQueue.find(cmd => cmd.id === commandId);
  }

  getPendingCommands(): WCSCommand[] {
    return this.commandQueue.filter(cmd => cmd.status === 'pending' || cmd.status === 'sent');
  }

  getAverageLatency(): number {
    const executedCommands = this.commandQueue.filter(
      cmd => cmd.status === 'executed' && cmd.plcAckTime && cmd.executionTime
    );

    if (executedCommands.length === 0) return 0;

    const totalLatency = executedCommands.reduce((sum, cmd) => {
      return sum + ((cmd.executionTime || 0) - (cmd.plcAckTime || 0));
    }, 0);

    return totalLatency / executedCommands.length;
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
}

export default WCSPLCAligner;
