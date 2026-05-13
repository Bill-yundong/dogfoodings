import { ConveyorNode, Package, SortingPath } from '../types/core';
import { SYSTEM_CONFIG } from '../config/constants';
import { v4 as uuidv4 } from 'uuid';

interface PriorityQueueItem {
  nodeId: string;
  priority: number;
  distance: number;
}

class PriorityQueue {
  private items: PriorityQueueItem[] = [];

  enqueue(nodeId: string, priority: number, distance: number): void {
    const index = this.items.findIndex(i => i.priority > priority);
    if (index === -1) {
      this.items.push({ nodeId, priority, distance });
    } else {
      this.items.splice(index, 0, { nodeId, priority, distance });
    }
  }

  dequeue(): PriorityQueueItem | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }
}

interface PathCacheEntry {
  path: SortingPath;
  timestamp: number;
}

export class DijkstraPathFinder {
  private nodes: Map<string, ConveyorNode> = new Map();
  private cache: Map<string, PathCacheEntry> = new Map();
  private readonly cacheTTL: number;
  private readonly maxCacheSize: number;
  private readonly costFactors: typeof SYSTEM_CONFIG.ALGORITHM.COST_FACTORS;

  constructor() {
    const { DIJKSTRA_CACHE_TTL, MAX_CACHE_SIZE, COST_FACTORS } = SYSTEM_CONFIG.ALGORITHM;
    this.cacheTTL = DIJKSTRA_CACHE_TTL;
    this.maxCacheSize = MAX_CACHE_SIZE;
    this.costFactors = COST_FACTORS;
  }

  updateTopology(nodes: ConveyorNode[]): void {
    this.nodes.clear();
    nodes.forEach(node => this.nodes.set(node.id, node));
    this.cache.clear();
  }

  async findOptimalPath(
    startNodeId: string,
    endNodeId: string,
    pkg: Package
  ): Promise<SortingPath | null> {
    const cacheKey = this.generateCacheKey(startNodeId, endNodeId, pkg.priority);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.path;
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.executeDijkstra(startNodeId, endNodeId, pkg);
        if (result) {
          this.addToCache(cacheKey, result);
        }
        resolve(result);
      }, 0);
    });
  }

  async batchPlan(
    packages: Package[],
    targetNodeMap: Map<string, string>
  ): Promise<Map<string, SortingPath>> {
    const results = new Map<string, SortingPath>();
    const { BATCH_SIZE } = SYSTEM_CONFIG.ALGORITHM;

    for (let i = 0; i < packages.length; i += BATCH_SIZE) {
      const batch = packages.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (pkg) => {
        const targetNode = targetNodeMap.get(pkg.destination);
        if (targetNode) {
          const path = await this.findOptimalPath(pkg.currentPosition, targetNode, pkg);
          if (path) {
            results.set(pkg.id, path);
          }
        }
      });

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    return results;
  }

  private executeDijkstra(
    startNodeId: string,
    endNodeId: string,
    pkg: Package
  ): SortingPath | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const pq = new PriorityQueue();

    this.nodes.forEach((_, id) => {
      distances.set(id, Infinity);
      previous.set(id, null);
    });

    distances.set(startNodeId, 0);
    pq.enqueue(startNodeId, 0, 0);

    while (!pq.isEmpty()) {
      const current = pq.dequeue();
      if (!current) break;

      const currentNodeId = current.nodeId;
      
      if (currentNodeId === endNodeId) {
        break;
      }

      const currentNode = this.nodes.get(currentNodeId);
      if (!currentNode || !currentNode.isActive) continue;

      for (const neighborId of currentNode.neighbors) {
        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;

        const cost = this.calculateEdgeCost(currentNode, neighborNode, pkg);
        const newDistance = (distances.get(currentNodeId) || 0) + cost;

        if (newDistance < (distances.get(neighborId) || Infinity)) {
          distances.set(neighborId, newDistance);
          previous.set(neighborId, currentNodeId);
          pq.enqueue(neighborId, newDistance, newDistance);
        }
      }
    }

    const path = this.reconstructPath(previous, startNodeId, endNodeId);
    if (!path) return null;

    const totalDistance = this.calculateTotalDistance(path);

    return {
      id: uuidv4(),
      packageId: pkg.id,
      nodes: path,
      totalDistance,
      estimatedTime: totalDistance * 10,
      createdAt: Date.now(),
      priority: pkg.priority
    };
  }

  private calculateEdgeCost(
    from: ConveyorNode,
    to: ConveyorNode,
    pkg: Package
  ): number {
    const baseDistance = this.euclideanDistance(from, to);
    const loadFactor = to.currentLoad / Math.max(to.capacity, 1);
    const priorityFactor = 1 / (pkg.priority + 1);
    const activePenalty = to.isActive ? 0 : this.costFactors.INACTIVE;

    return baseDistance * (1 + loadFactor * this.costFactors.LOAD) * 
           (1 + priorityFactor * this.costFactors.PRIORITY) + activePenalty;
  }

  private euclideanDistance(a: ConveyorNode, b: ConveyorNode): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private reconstructPath(
    previous: Map<string, string | null>,
    start: string,
    end: string
  ): string[] | null {
    const path: string[] = [];
    let current: string | null = end;

    while (current) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    return path[0] === start ? path : null;
  }

  private calculateTotalDistance(path: string[]): number {
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const nodeA = this.nodes.get(path[i]);
      const nodeB = this.nodes.get(path[i + 1]);
      if (nodeA && nodeB) {
        total += this.euclideanDistance(nodeA, nodeB);
      }
    }
    return total;
  }

  private generateCacheKey(start: string, end: string, priority: number): string {
    return `${start}-${end}-${priority}`;
  }

  private addToCache(key: string, path: SortingPath): void {
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { path, timestamp: Date.now() });
  }

  calculateUtilizationRate(): number {
    let totalCapacity = 0;
    let totalLoad = 0;

    this.nodes.forEach(node => {
      if (node.type === 'cross-belt') {
        totalCapacity += node.capacity;
        totalLoad += node.currentLoad;
      }
    });

    return totalCapacity > 0 ? totalLoad / totalCapacity : 0;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getNode(nodeId: string): ConveyorNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): ConveyorNode[] {
    return Array.from(this.nodes.values());
  }
}

export default DijkstraPathFinder;
