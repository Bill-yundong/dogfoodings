import { v4 as uuidv4 } from 'uuid';
import { Package, ConveyorNode, PLCStatus, PerformanceMetrics, ErrorEvent, SortingPath } from '../core/types';
import { SYSTEM_CONFIG, DESTINATIONS } from '../core/config';
import { createDefaultTopology, createDestinationMap } from '../core/topology';

export class SortingEngine {
  private packages: Package[] = [];
  private nodes: Map<string, ConveyorNode> = new Map();
  private destinationMap: Map<string, string> = new Map();
  private plcStatusMap: Map<string, PLCStatus> = new Map();
  private packagePositions: Map<string, string> = new Map();
  private errors: ErrorEvent[] = [];
  private pathCache: Map<string, SortingPath> = new Map();

  private isRunning: boolean = false;
  private animationId?: number;
  private lastPackageTime: number = 0;
  private lastMoveTime: number = 0;

  private onStateChange?: () => void;

  constructor() {
    this.initializeSystem();
  }

  private initializeSystem(): void {
    const topology = createDefaultTopology();
    topology.forEach(node => {
      this.nodes.set(node.id, node);
      this.plcStatusMap.set(node.id, {
        nodeId: node.id,
        isRunning: node.isActive,
        currentSpeed: 1.0,
        packageCount: 0,
        lastUpdate: Date.now()
      });
    });
    this.destinationMap = createDestinationMap();
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
    this.errors = [];
    this.pathCache.clear();
    this.packagePositions.clear();
    this.lastPackageTime = 0;
    this.lastMoveTime = 0;
    this.notifyStateChange();
  }

  setStateChangeHandler(handler: () => void): void {
    this.onStateChange = handler;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange();
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

    this.processPendingPackages();
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
    this.packagePositions.set(pkg.id, pkg.currentPosition);
  }

  private processPendingPackages(): void {
    const pendingPackages = this.packages.filter(p => p.status === 'pending');
    pendingPackages.forEach(pkg => this.processPackage(pkg));
  }

  private processPackage(pkg: Package): void {
    const targetNode = this.destinationMap.get(pkg.destination) || 'EXIT';
    const path = this.findOptimalPath(pkg.currentPosition, targetNode, pkg);

    if (!path) {
      this.addError('PATH_NOT_FOUND', `No path found for package ${pkg.id}`, 'high', { packageId: pkg.id });
      return;
    }

    const index = this.packages.findIndex(p => p.id === pkg.id);
    if (index !== -1) {
      this.packages[index] = { ...pkg, assignedPath: path.nodes, status: 'sorting' };
    }
  }

  private findOptimalPath(start: string, end: string, pkg: Package): SortingPath | null {
    const cacheKey = `${start}-${end}-${pkg.priority}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < SYSTEM_CONFIG.ALGORITHM.DIJKSTRA_CACHE_TTL) {
      return cached;
    }

    const path = this.dijkstra(start, end, pkg);
    if (path) {
      const result: SortingPath = {
        id: uuidv4(),
        packageId: pkg.id,
        nodes: path,
        totalDistance: this.calculatePathDistance(path),
        estimatedTime: path.length * 100,
        createdAt: Date.now(),
        priority: pkg.priority
      };
      this.pathCache.set(cacheKey, result);
      return result;
    }
    return null;
  }

  private dijkstra(start: string, end: string, pkg: Package): string[] | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();

    this.nodes.forEach((_, id) => {
      distances.set(id, Infinity);
      previous.set(id, null);
    });
    distances.set(start, 0);

    while (true) {
      let minNode: string | null = null;
      let minDist = Infinity;
      distances.forEach((dist, node) => {
        if (!visited.has(node) && dist < minDist) {
          minDist = dist;
          minNode = node;
        }
      });

      if (minNode === null || minNode === end) break;
      visited.add(minNode);

      const currentNode = this.nodes.get(minNode);
      if (!currentNode) continue;

      for (const neighbor of currentNode.neighbors) {
        const neighborNode = this.nodes.get(neighbor);
        if (!neighborNode || visited.has(neighbor)) continue;

        const cost = this.calculateEdgeCost(currentNode, neighborNode, pkg);
        const newDist = (distances.get(minNode) || 0) + cost;

        if (newDist < (distances.get(neighbor) || Infinity)) {
          distances.set(neighbor, newDist);
          previous.set(neighbor, minNode);
        }
      }
    }

    const path: string[] = [];
    let current: string | null = end;
    while (current) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    return path[0] === start ? path : null;
  }

  private calculateEdgeCost(from: ConveyorNode, to: ConveyorNode, pkg: Package): number {
    const baseDist = Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2));
    const loadFactor = to.currentLoad / Math.max(to.capacity, 1);
    const priorityFactor = 1 / (pkg.priority + 1);
    const inactivePenalty = to.isActive ? 0 : 1000;
    return baseDist * (1 + loadFactor * 2) * (1 + priorityFactor) + inactivePenalty;
  }

  private calculatePathDistance(path: string[]): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = this.nodes.get(path[i]);
      const to = this.nodes.get(path[i + 1]);
      if (from && to) {
        total += Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2));
      }
    }
    return total;
  }

  private movePackages(): void {
    this.packages = this.packages.map(pkg => {
      if (pkg.status !== 'sorting' || pkg.assignedPath.length === 0) return pkg;

      const currentIndex = pkg.assignedPath.indexOf(pkg.currentPosition);
      if (currentIndex === -1 || currentIndex >= pkg.assignedPath.length - 1) {
        return { ...pkg, status: 'sorted' };
      }

      const nextPosition = pkg.assignedPath[currentIndex + 1];

      if (Math.random() < SYSTEM_CONFIG.SIMULATION.MISALIGNMENT_RATE) {
        this.addError('MISALIGNMENT', `Package ${pkg.id} misaligned at ${pkg.currentPosition}`, 'high', { packageId: pkg.id });
        return pkg;
      }

      this.packagePositions.set(pkg.id, nextPosition);
      const newActualPath = [...pkg.actualPath, nextPosition];

      if (nextPosition.startsWith('CHUTE_') || nextPosition === 'EXIT') {
        return { ...pkg, currentPosition: nextPosition, actualPath: newActualPath, status: 'sorted' };
      }

      return { ...pkg, currentPosition: nextPosition, actualPath: newActualPath };
    });
  }

  private addError(type: ErrorEvent['type'], message: string, severity: ErrorEvent['severity'], context?: { packageId?: string; nodeId?: string }): void {
    const error: ErrorEvent = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      severity,
      message,
      packageId: context?.packageId,
      nodeId: context?.nodeId,
      resolved: false
    };
    this.errors.push(error);
    if (this.errors.length > 100) this.errors.shift();
  }

  getPackages(): Package[] { return this.packages; }
  getNodes(): ConveyorNode[] { return Array.from(this.nodes.values()); }
  getErrors(): ErrorEvent[] { return this.errors; }
  getPlcStatus(): PLCStatus[] { return Array.from(this.plcStatusMap.values()); }
  getPackagePosition(packageId: string): string | undefined { return this.packagePositions.get(packageId); }
  getIsRunning(): boolean { return this.isRunning; }

  getMetrics(): PerformanceMetrics {
    const total = this.packages.length;
    const sorted = this.packages.filter(p => p.status === 'sorted').length;
    const sorting = this.packages.filter(p => p.status === 'sorting').length;

    const crossBelts = Array.from(this.nodes.values()).filter(n => n.type === 'cross-belt');
    const totalCapacity = crossBelts.reduce((sum, n) => sum + n.capacity, 0);
    const utilization = sorting / Math.max(totalCapacity, 1);

    return {
      throughput: total > 0 ? sorted / ((Date.now() - (this.packages[0]?.entryTime || Date.now())) / 1000) || 0 : 0,
      averageSortTime: sorting > 0 ? 1500 : 0,
      errorRate: this.errors.filter(e => !e.resolved).length / Math.max(total, 1),
      utilizationRate: Math.min(utilization, 1),
      totalPackages: total,
      sortedPackages: sorted
    };
  }

  getAverageLatency(): number {
    return Math.random() * 15 + 10;
  }

  destroy(): void {
    this.stop();
  }
}
