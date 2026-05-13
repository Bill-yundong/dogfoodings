import { Package, ConveyorNode, WCSCommand, SortingSnapshot } from '../types/core';
import { SYSTEM_CONFIG, ERROR_TYPES, ERROR_SEVERITY, COMMAND_ACTION } from '../config/constants';
import { v4 as uuidv4 } from 'uuid';

export interface ErrorEvent {
  id: string;
  type: typeof ERROR_TYPES[keyof typeof ERROR_TYPES];
  timestamp: number;
  severity: typeof ERROR_SEVERITY[keyof typeof ERROR_SEVERITY];
  message: string;
  packageId?: string;
  nodeId?: string;
  commandId?: string;
  resolved: boolean;
  resolvedAt?: number;
  resolution?: string;
}

type ErrorHandler = (error: ErrorEvent) => void;

export class ErrorRecoveryEngine {
  private errorHistory: ErrorEvent[] = [];
  private readonly maxHistorySize: number = 1000;
  private readonly commandTimeout: number;

  private onError?: ErrorHandler;
  private onRecovery?: ErrorHandler;

  constructor() {
    this.commandTimeout = SYSTEM_CONFIG.ALIGNMENT.COMMAND_TIMEOUT;
  }

  setEventHandlers(handlers: {
    onError?: ErrorHandler;
    onRecovery?: ErrorHandler;
  }): void {
    this.onError = handlers.onError;
    this.onRecovery = handlers.onRecovery;
  }

  reportError(
    type: ErrorEvent['type'],
    message: string,
    severity: ErrorEvent['severity'] = ERROR_SEVERITY.MEDIUM,
    context?: {
      packageId?: string;
      nodeId?: string;
      commandId?: string;
    }
  ): ErrorEvent {
    const error: ErrorEvent = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      severity,
      message,
      packageId: context?.packageId,
      nodeId: context?.nodeId,
      commandId: context?.commandId,
      resolved: false
    };

    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    if (this.onError) {
      this.onError(error);
    }

    return error;
  }

  async handleMisalignment(
    packageId: string,
    expectedPath: string[],
    currentPosition: string,
    nodes: Map<string, ConveyorNode>
  ): Promise<WCSCommand | null> {
    const error = this.reportError(
      ERROR_TYPES.MISALIGNMENT,
      `Package ${packageId} misaligned. Expected path node, found at ${currentPosition}`,
      ERROR_SEVERITY.HIGH,
      { packageId }
    );

    const expectedIndex = expectedPath.indexOf(currentPosition);

    if (expectedIndex === -1) {
      const recoveryCommand: WCSCommand = {
        id: uuidv4(),
        packageId,
        action: COMMAND_ACTION.EJECT,
        targetNode: 'RECOVERY_CHUTE',
        timestamp: Date.now(),
        deadline: Date.now() + this.commandTimeout,
        status: 'pending'
      };

      this.markResolved(error.id, 'Ejected to recovery chute');
      return recoveryCommand;
    }

    const nextNode = expectedPath[expectedIndex + 1];
    if (nextNode && nodes.has(nextNode)) {
      const redirectCommand: WCSCommand = {
        id: uuidv4(),
        packageId,
        action: COMMAND_ACTION.REDIRECT,
        targetNode: nextNode,
        timestamp: Date.now(),
        deadline: Date.now() + this.commandTimeout,
        status: 'pending'
      };

      this.markResolved(error.id, `Redirected to ${nextNode}`);
      return redirectCommand;
    }

    return null;
  }

  handleNodeFailure(
    nodeId: string,
    nodes: Map<string, ConveyorNode>
  ): string[] {
    const node = nodes.get(nodeId);
    if (!node) return [];

    this.reportError(
      ERROR_TYPES.NODE_FAILURE,
      `Node ${nodeId} (${node.name}) has failed`,
      ERROR_SEVERITY.CRITICAL,
      { nodeId }
    );

    const affectedNeighbors: string[] = [];
    nodes.forEach((n, id) => {
      if (n.neighbors.includes(nodeId)) {
        affectedNeighbors.push(id);
      }
    });

    return affectedNeighbors;
  }

  handlePackageJam(
    nodeId: string,
    packages: Package[]
  ): Package[] {
    const jammedPackages = packages.filter(p => p.currentPosition === nodeId);

    if (jammedPackages.length > 3) {
      this.reportError(
        ERROR_TYPES.PACKAGE_JAM,
        `Potential jam detected at node ${nodeId}. ${jammedPackages.length} packages present`,
        ERROR_SEVERITY.HIGH,
        { nodeId }
      );
    }

    return jammedPackages;
  }

  handleCommandTimeout(command: WCSCommand): WCSCommand | null {
    this.reportError(
      ERROR_TYPES.COMMAND_TIMEOUT,
      `Command ${command.id} for package ${command.packageId} timed out`,
      ERROR_SEVERITY.MEDIUM,
      { commandId: command.id, packageId: command.packageId }
    );

    const retryCommand: WCSCommand = {
      ...command,
      id: uuidv4(),
      timestamp: Date.now(),
      deadline: Date.now() + this.commandTimeout,
      status: 'pending'
    };

    return retryCommand;
  }

  findAlternativePath(
    startNode: string,
    endNode: string,
    failedNodes: Set<string>,
    nodes: Map<string, ConveyorNode>
  ): string[] | null {
    const visited = new Set<string>();
    const queue: string[][] = [[startNode]];

    while (queue.length > 0) {
      const path = queue.shift();
      if (!path) continue;

      const current = path[path.length - 1];

      if (current === endNode) {
        return path;
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const currentNode = nodes.get(current);
      if (!currentNode) continue;

      for (const neighbor of currentNode.neighbors) {
        if (!visited.has(neighbor) && !failedNodes.has(neighbor)) {
          const neighborNode = nodes.get(neighbor);
          if (neighborNode && neighborNode.isActive) {
            queue.push([...path, neighbor]);
          }
        }
      }
    }

    return null;
  }

  markResolved(errorId: string, resolution: string): void {
    const error = this.errorHistory.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = Date.now();
      error.resolution = resolution;

      if (this.onRecovery) {
        this.onRecovery(error);
      }
    }
  }

  getErrorHistory(type?: ErrorEvent['type'], resolved?: boolean): ErrorEvent[] {
    let filtered = this.errorHistory;

    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }

    if (resolved !== undefined) {
      filtered = filtered.filter(e => e.resolved === resolved);
    }

    return filtered;
  }

  getActiveErrors(): ErrorEvent[] {
    return this.errorHistory.filter(e => !e.resolved);
  }

  getErrorStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    unresolved: number;
    recoveryRate: number;
  } {
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      unresolved: 0,
      recoveryRate: 0
    };

    let resolvedCount = 0;
    this.errorHistory.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      if (!error.resolved) {
        stats.unresolved++;
      } else {
        resolvedCount++;
      }
    });

    stats.recoveryRate = stats.total > 0 ? resolvedCount / stats.total : 1;

    return stats;
  }

  async recoverFromSnapshot(
    snapshot: SortingSnapshot,
    onPackageRecovered?: (pkg: Package) => void
  ): Promise<boolean> {
    try {
      for (const pkg of snapshot.packages) {
        if (onPackageRecovered) {
          onPackageRecovered(pkg);
        }
      }

      this.reportError(
        ERROR_TYPES.SENSOR_ERROR,
        `System recovered from snapshot version ${snapshot.version}`,
        ERROR_SEVERITY.MEDIUM
      );

      return true;
    } catch {
      return false;
    }
  }

  clearHistory(): void {
    this.errorHistory = [];
  }
}

export default ErrorRecoveryEngine;
