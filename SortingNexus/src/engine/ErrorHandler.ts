import { Package, ConveyorNode, WCSCommand, SortingSnapshot } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type ErrorType = 
  | 'MISALIGNMENT'
  | 'NODE_FAILURE'
  | 'PACKAGE_JAM'
  | 'PATH_NOT_FOUND'
  | 'COMMAND_TIMEOUT'
  | 'SENSOR_ERROR';

export interface ErrorEvent {
  id: string;
  type: ErrorType;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  packageId?: string;
  nodeId?: string;
  commandId?: string;
  resolved: boolean;
  resolvedAt?: number;
  resolution?: string;
}

export class ErrorHandler {
  private errorHistory: ErrorEvent[] = [];
  private maxHistorySize = 1000;
  private onError?: (error: ErrorEvent) => void;
  private onRecovery?: (error: ErrorEvent) => void;

  setEventHandlers(
    onError?: (error: ErrorEvent) => void,
    onRecovery?: (error: ErrorEvent) => void
  ): void {
    this.onError = onError;
    this.onRecovery = onRecovery;
  }

  reportError(
    type: ErrorType,
    message: string,
    severity: ErrorEvent['severity'] = 'medium',
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
      'MISALIGNMENT',
      `Package ${packageId} misaligned. Expected path node, found at ${currentPosition}`,
      'high',
      { packageId }
    );

    const expectedIndex = expectedPath.indexOf(currentPosition);

    if (expectedIndex === -1) {
      const recoveryCommand: WCSCommand = {
        id: uuidv4(),
        packageId,
        action: 'eject',
        targetNode: 'RECOVERY_CHUTE',
        timestamp: Date.now(),
        deadline: Date.now() + 5000,
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
        action: 'redirect',
        targetNode: nextNode,
        timestamp: Date.now(),
        deadline: Date.now() + 3000,
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
      'NODE_FAILURE',
      `Node ${nodeId} (${node.name}) has failed`,
      'critical',
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
        'PACKAGE_JAM',
        `Potential jam detected at node ${nodeId}. ${jammedPackages.length} packages present`,
        'high',
        { nodeId }
      );
    }

    return jammedPackages;
  }

  handleCommandTimeout(command: WCSCommand): WCSCommand | null {
    this.reportError(
      'COMMAND_TIMEOUT',
      `Command ${command.id} for package ${command.packageId} timed out`,
      'medium',
      { commandId: command.id, packageId: command.packageId }
    );

    const retryCommand: WCSCommand = {
      ...command,
      id: uuidv4(),
      timestamp: Date.now(),
      deadline: Date.now() + 3000,
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

  getErrorHistory(type?: ErrorType, resolved?: boolean): ErrorEvent[] {
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
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorEvent['severity'], number>;
    unresolved: number;
  } {
    const stats = {
      total: this.errorHistory.length,
      byType: {
        MISALIGNMENT: 0,
        NODE_FAILURE: 0,
        PACKAGE_JAM: 0,
        PATH_NOT_FOUND: 0,
        COMMAND_TIMEOUT: 0,
        SENSOR_ERROR: 0
      } as Record<ErrorType, number>,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      } as Record<ErrorEvent['severity'], number>,
      unresolved: 0
    };

    this.errorHistory.forEach(error => {
      stats.byType[error.type]++;
      stats.bySeverity[error.severity]++;
      if (!error.resolved) stats.unresolved++;
    });

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
        'SENSOR_ERROR',
        `System recovered from snapshot version ${snapshot.version}`,
        'medium'
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

export default ErrorHandler;
