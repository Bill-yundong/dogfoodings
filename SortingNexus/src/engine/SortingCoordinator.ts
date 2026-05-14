import { Package, ConveyorNode, WCSCommand, PLCStatus, PerformanceMetrics } from '../types/core';
import { DijkstraPathFinder } from '../algorithms/DijkstraPathFinder';
import { PlcSyncEngine } from '../alignment/PlcSyncEngine';
import { SnapshotStore } from '../persistence/SnapshotStore';
import { ErrorRecoveryEngine } from './ErrorRecovery';
import { createDefaultTopology, createDestinationMap } from '../config/topology';
import { PACKAGE_STATUS, COMMAND_ACTION, SYSTEM_CONFIG } from '../config/constants';
import { v4 as uuidv4 } from 'uuid';

export class SortingCoordinator {
  private pathFinder: DijkstraPathFinder;
  private plcEngine: PlcSyncEngine;
  private snapshotStore: SnapshotStore;
  private errorEngine: ErrorRecoveryEngine;

  private packages: Package[] = [];
  private nodes: Map<string, ConveyorNode> = new Map();
  private destinationMap: Map<string, string> = new Map();
  private commands: WCSCommand[] = [];

  private isRunning: boolean = false;
  private animationFrameId?: number;
  private lastPackageTime: number = 0;
  private lastMoveTime: number = 0;
  private lastMetricsTime: number = 0;

  private onStateChange?: (state: {
    packages: Package[];
    metrics: PerformanceMetrics;
    errors: typeof this.errorEngine.getActiveErrors;
  }) => void;

  constructor() {
    this.pathFinder = new DijkstraPathFinder();
    this.plcEngine = new PlcSyncEngine();
    this.snapshotStore = new SnapshotStore();
    this.errorEngine = new ErrorRecoveryEngine();
  }

  async init(): Promise<void> {
    await this.snapshotStore.init();
    this.initializeTopology();
    this.setupEventHandlers();
  }

  private initializeTopology(): void {
    const topology = createDefaultTopology();
    topology.forEach(node => this.nodes.set(node.id, node));
    this.destinationMap = createDestinationMap();
    this.pathFinder.updateTopology(topology);
    this.initializePLCStatus();
  }

  private initializePLCStatus(): void {
    this.nodes.forEach((node, nodeId) => {
      this.plcEngine.updatePLCStatus({
        nodeId,
        isRunning: node.isActive,
        currentSpeed: 1.0,
        packageCount: 0,
        lastUpdate: Date.now()
      });
    });
  }

  private setupEventHandlers(): void {
    this.plcEngine.setEventHandlers({
      onCommandSent: (command) => this.commands.push(command),
      onMisalignment: (result) => {
        this.errorEngine.reportError(
          'MISALIGNMENT',
          `Package ${result.packageId} misaligned by ${result.timeDiff}ms`,
          'high',
          { packageId: result.packageId }
        );
      },
      onCommandExecuted: () => {}
    });

    this.errorEngine.setEventHandlers({
      onError: () => this.triggerStateChange(),
      onRecovery: () => this.triggerStateChange()
    });
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.runSimulationLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private runSimulationLoop = (): void => {
    if (!this.isRunning) return;

    const now = Date.now();

    if (now - this.lastPackageTime > SYSTEM_CONFIG.SIMULATION.PACKAGE_GENERATION_INTERVAL) {
      this.generatePackage();
      this.lastPackageTime = now;
    }

    if (now - this.lastMoveTime > SYSTEM_CONFIG.SIMULATION.PACKAGE_MOVE_INTERVAL) {
      this.movePackages();
      this.lastMoveTime = now;
    }

    if (now - this.lastMetricsTime > SYSTEM_CONFIG.SIMULATION.METRICS_UPDATE_INTERVAL) {
      this.updateMetrics();
      this.createSnapshotIfNeeded();
      this.lastMetricsTime = now;
    }

    this.processPendingPackages();
    this.triggerStateChange();

    this.animationFrameId = requestAnimationFrame(this.runSimulationLoop);
  };

  private generatePackage(): void {
    const destinations = Array.from(this.destinationMap.keys());
    const entryNodes = Array.from(this.nodes.values())
      .filter(n => n.type === 'entry')
      .map(n => n.id);
    
    const destination = destinations[Math.floor(Math.random() * destinations.length)];
    const entryNode = entryNodes[Math.floor(Math.random() * entryNodes.length)];

    const pkg: Package = {
      id: uuidv4(),
      barcode: `BC${Date.now()}${Math.floor(Math.random() * 1000)}`,
      destination,
      weight: Math.random() * 10 + 0.5,
      volume: Math.random() * 0.1 + 0.01,
      entryTime: Date.now(),
      priority: Math.floor(Math.random() * 3),
      status: PACKAGE_STATUS.PENDING,
      currentPosition: entryNode,
      assignedPath: [],
      actualPath: [entryNode]
    };

    this.packages.push(pkg);
    this.plcEngine.updatePackagePosition(pkg.id, pkg.currentPosition);
  }

  private processPendingPackages(): void {
    const pendingPackages = this.packages.filter(p => p.status === PACKAGE_STATUS.PENDING);
    pendingPackages.forEach(pkg => this.processPackage(pkg));
  }

  private async processPackage(pkg: Package): Promise<void> {
    const targetNode = this.destinationMap.get(pkg.destination) || 'EXIT';
    const path = await this.pathFinder.findOptimalPath(pkg.currentPosition, targetNode, pkg);

    if (!path) {
      this.errorEngine.reportError(
        'PATH_NOT_FOUND',
        `No path found for package ${pkg.id} to destination ${pkg.destination}`,
        'high',
        { packageId: pkg.id }
      );
      return;
    }

    const packageIndex = this.packages.findIndex(p => p.id === pkg.id);
    if (packageIndex !== -1) {
      this.packages[packageIndex] = {
        ...pkg,
        assignedPath: path.nodes,
        status: PACKAGE_STATUS.SORTING
      };

      const command = this.plcEngine.createCommand(pkg.id, COMMAND_ACTION.ROUTE, path.nodes[1] || targetNode);
      this.plcEngine.enqueueCommand(command);
    }
  }

  private movePackages(): void {
    this.packages = this.packages.map(pkg => {
      if (pkg.status !== PACKAGE_STATUS.SORTING || pkg.assignedPath.length === 0) {
        return pkg;
      }

      const currentIndex = pkg.assignedPath.indexOf(pkg.currentPosition);
      if (currentIndex === -1 || currentIndex >= pkg.assignedPath.length - 1) {
        return { ...pkg, status: PACKAGE_STATUS.SORTED };
      }

      const nextPosition = pkg.assignedPath[currentIndex + 1];
      const alignment = this.plcEngine.verifyAlignment(pkg.id, nextPosition);

      if (!alignment.isAligned && Math.random() < SYSTEM_CONFIG.SIMULATION.MISALIGNMENT_RATE) {
        const recoveryCmd = this.plcEngine.handleMisalignment(pkg.id, pkg.assignedPath);
        if (recoveryCmd) {
          this.plcEngine.enqueueCommand(recoveryCmd);
        }
        return pkg;
      }

      this.plcEngine.updatePackagePosition(pkg.id, nextPosition);

      const newActualPath = [...pkg.actualPath, nextPosition];

      if (nextPosition.startsWith('CHUTE_') || nextPosition === 'EXIT') {
        return {
          ...pkg,
          currentPosition: nextPosition,
          actualPath: newActualPath,
          status: PACKAGE_STATUS.SORTED
        };
      }

      return {
        ...pkg,
        currentPosition: nextPosition,
        actualPath: newActualPath
      };
    });
  }

  private updateMetrics(): PerformanceMetrics {
    const total = this.packages.length;
    const sorted = this.packages.filter(p => p.status === PACKAGE_STATUS.SORTED).length;
    const sorting = this.packages.filter(p => p.status === PACKAGE_STATUS.SORTING).length;
    const utilization = this.pathFinder.calculateUtilizationRate();
    const avgTime = sorting > 0 ? 1500 : 0;

    const metrics: PerformanceMetrics = {
      throughput: sorted / Math.max((Date.now() - (this.packages[0]?.entryTime || Date.now())) / 1000, 1),
      averageSortTime: avgTime,
      errorRate: total > 0 ? this.errorEngine.getActiveErrors().length / total : 0,
      utilizationRate: utilization,
      totalPackages: total,
      sortedPackages: sorted
    };

    return metrics;
  }

  private async createSnapshotIfNeeded(): Promise<void> {
    if (this.snapshotStore.shouldCreateSnapshot()) {
      const metrics = this.updateMetrics();
      await this.snapshotStore.createSnapshot(
        this.packages,
        this.commands,
        this.plcEngine.getAllPLCStatus(),
        metrics
      );
    }
  }

  private triggerStateChange(): void {
    if (this.onStateChange) {
      const metrics = this.updateMetrics();
      const errors = this.errorEngine.getActiveErrors();
      this.onStateChange({
        packages: this.packages,
        metrics,
        errors
      });
    }
  }

  setStateChangeHandler(handler: typeof this.onStateChange): void {
    this.onStateChange = handler;
  }

  getPackages(): Package[] {
    return this.packages;
  }

  getNodes(): ConveyorNode[] {
    return Array.from(this.nodes.values());
  }

  getNodeMap(): Map<string, ConveyorNode> {
    return new Map(this.nodes);
  }

  getMetrics(): PerformanceMetrics {
    return this.updateMetrics();
  }

  getActiveErrors() {
    return this.errorEngine.getActiveErrors();
  }

  getPlcStatus(): PLCStatus[] {
    return this.plcEngine.getAllPLCStatus();
  }

  getAverageLatency(): number {
    return this.plcEngine.getAverageLatency();
  }

  getSnapshotStore(): SnapshotStore {
    return this.snapshotStore;
  }

  getPathFinder(): DijkstraPathFinder {
    return this.pathFinder;
  }

  getPlcEngine(): PlcSyncEngine {
    return this.plcEngine;
  }

  getErrorEngine(): ErrorRecoveryEngine {
    return this.errorEngine;
  }

  clearPackages(): void {
    this.packages = [];
    this.commands = [];
    this.lastPackageTime = 0;
    this.lastMoveTime = 0;
  }

  async reset(): Promise<void> {
    this.stop();
    this.clearPackages();
    this.plcEngine.reset();
    this.errorEngine.clearHistory();
    await this.snapshotStore.clearAll();
    this.initializeTopology();
  }

  destroy(): void {
    this.stop();
  }
}

export default SortingCoordinator;
