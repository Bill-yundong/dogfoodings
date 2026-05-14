import { v4 as uuidv4 } from 'uuid';
import { Package, ConveyorNode, PLCStatus, PerformanceMetrics } from '../types';
import { SYSTEM_CONFIG, DESTINATIONS, ERROR_TYPES } from '../config/constants';
import { createDefaultTopology, createDestinationMap } from '../config/topology';
import { PathPlannerEngine } from './PathPlannerEngine';
import { WCSPlcAlignEngine } from './WCSPlcAlignEngine';
import { SnapshotStoreEngine } from './SnapshotStoreEngine';

export class SortCoordinatorEngine {
  private pathPlanner: PathPlannerEngine;
  private plcAlignEngine: WCSPlcAlignEngine;
  private snapshotStore: SnapshotStoreEngine;

  private packages: Package[] = [];
  private nodes: Map<string, ConveyorNode> = new Map();
  private destinationMap: Map<string, string> = new Map();
  private isRunning: boolean = false;
  private animationId?: number;
  private lastPackageTime: number = 0;
  private lastMoveTime: number = 0;

  private onStateChange?: () => void;

  constructor() {
    this.pathPlanner = new PathPlannerEngine();
    this.plcAlignEngine = new WCSPlcAlignEngine();
    this.snapshotStore = new SnapshotStoreEngine();

    this.initializeSystem();
  }

  private initializeSystem(): void {
    const topology = createDefaultTopology();
    topology.forEach(node => {
      this.nodes.set(node.id, node);
      this.plcAlignEngine.updatePLCStatus({
        nodeId: node.id,
        isRunning: node.isActive,
        currentSpeed: 1.0,
        packageCount: 0,
        lastUpdate: Date.now()
      });
    });

    this.destinationMap = createDestinationMap();
    this.pathPlanner.updateTopology(topology);
  }

  setOnStateChange(callback: () => void): void {
    this.onStateChange = callback;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.runSimulationLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  reset(): void {
    this.stop();
    this.packages = [];
    this.snapshotStore.clear();
    this.plcAlignEngine.reset();
    this.lastPackageTime = 0;
    this.lastMoveTime = 0;
    this.notifyStateChange();
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

    this.processPendingPackages();
    this.createSnapshotIfNeeded();
    this.notifyStateChange();

    this.animationId = requestAnimationFrame(this.runSimulationLoop);
  };

  private generatePackage(): void {
    const destination = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
    const entryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'entry');
    const entryNode = entryNodes[Math.floor(Math.random() * entryNodes.length)];

    const pkg: Package = {
      id: uuidv4(),
      barcode: `BC${Date.now()}${Math.floor(Math.random() * 1000)}`,
      destination,
      weight: Math.random() * 10 + 0.5,
      volume: Math.random() * 0.1 + 0.01,
      entryTime: Date.now(),
      priority: Math.floor(Math.random() * 3),
      status: 'pending',
      currentPosition: entryNode.id,
      assignedPath: [],
      actualPath: [entryNode.id]
    };

    this.packages.push(pkg);
    this.plcAlignEngine.updatePackagePosition(pkg.id, pkg.currentPosition);
  }

  private processPendingPackages(): void {
    const pendingPackages = this.packages.filter(p => p.status === 'pending');
    pendingPackages.forEach(pkg => this.processPackage(pkg));
  }

  private async processPackage(pkg: Package): Promise<void> {
    const targetNode = this.destinationMap.get(pkg.destination) || 'EXIT';
    const path = await this.pathPlanner.findOptimalPath(pkg.currentPosition, targetNode, pkg);

    if (!path) {
      this.snapshotStore.addError(
        ERROR_TYPES.PATH_NOT_FOUND,
        `No path found for package ${pkg.id} to ${pkg.destination}`,
        'high',
        { packageId: pkg.id }
      );
      return;
    }

    const index = this.packages.findIndex(p => p.id === pkg.id);
    if (index !== -1) {
      this.packages[index] = { ...pkg, assignedPath: path.nodes, status: 'sorting' };
    }
  }

  private movePackages(): void {
    this.packages = this.packages.map(pkg => {
      if (pkg.status !== 'sorting' || pkg.assignedPath.length === 0) return pkg;

      const currentIndex = pkg.assignedPath.indexOf(pkg.currentPosition);
      if (currentIndex === -1 || currentIndex >= pkg.assignedPath.length - 1) {
        return { ...pkg, status: 'sorted' };
      }

      const nextPosition = pkg.assignedPath[currentIndex + 1];
      const isAligned = this.plcAlignEngine.verifyAlignment(pkg.id, nextPosition);

      if (!isAligned && Math.random() < SYSTEM_CONFIG.SIMULATION.MISALIGNMENT_RATE) {
        this.snapshotStore.addError(
          ERROR_TYPES.MISALIGNMENT,
          `Package ${pkg.id} misaligned at ${pkg.currentPosition}`,
          'high',
          { packageId: pkg.id }
        );
        return pkg;
      }

      this.plcAlignEngine.updatePackagePosition(pkg.id, nextPosition);
      const newActualPath = [...pkg.actualPath, nextPosition];

      if (nextPosition.startsWith('CHUTE_') || nextPosition === 'EXIT') {
        return { ...pkg, currentPosition: nextPosition, actualPath: newActualPath, status: 'sorted' };
      }

      return { ...pkg, currentPosition: nextPosition, actualPath: newActualPath };
    });
  }

  private createSnapshotIfNeeded(): void {
    if (this.snapshotStore.shouldCreateSnapshot()) {
      const metrics = this.calculateMetrics();
      this.snapshotStore.createSnapshot(
        this.packages,
        [],
        this.plcAlignEngine.getAllPLCStatus(),
        metrics
      );
    }
  }

  private calculateMetrics(): PerformanceMetrics {
    const total = this.packages.length;
    const sorted = this.packages.filter(p => p.status === 'sorted').length;
    const sorting = this.packages.filter(p => p.status === 'sorting').length;
    const utilization = this.pathPlanner.calculateUtilizationRate();
    const errorStats = this.snapshotStore.getErrorStats();

    return {
      throughput: total > 0 ? sorted / ((Date.now() - (this.packages[0]?.entryTime || Date.now())) / 1000) || 0 : 0,
      averageSortTime: sorting > 0 ? 1500 : 0,
      errorRate: errorStats.unresolved / Math.max(total, 1),
      utilizationRate: Math.min(utilization, 1),
      totalPackages: total,
      sortedPackages: sorted,
      averageLatency: this.plcAlignEngine.getAverageLatency(),
      alignmentRate: this.plcAlignEngine.getAlignmentRate()
    };
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }

  getPackages(): Package[] {
    return [...this.packages];
  }

  getNodes(): ConveyorNode[] {
    return Array.from(this.nodes.values());
  }

  getMetrics(): PerformanceMetrics {
    return this.calculateMetrics();
  }

  getErrors() {
    return this.snapshotStore.getErrors();
  }

  getPLCStatus(): PLCStatus[] {
    return this.plcAlignEngine.getAllPLCStatus();
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getSnapshotCount(): number {
    return this.snapshotStore.getSnapshotCount();
  }

  destroy(): void {
    this.stop();
  }
}

export default SortCoordinatorEngine;
