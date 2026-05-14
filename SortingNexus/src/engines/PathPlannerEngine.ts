import { v4 as uuidv4 } from 'uuid';
import { ConveyorNode, Package, SortingPath } from '../types';
import { SYSTEM_CONFIG } from '../config/constants';

export class PathPlannerEngine {
  private nodes: Map<string, ConveyorNode> = new Map();
  private cache: Map<string, SortingPath> = new Map();
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
    
    if (cached && Date.now() - cached.createdAt < this.cacheTTL) {
      return cached;
    }

    const path = this.executeDijkstra(startNodeId, endNodeId, pkg);
    if (path) {
      this.addToCache(cacheKey, path);
      return path;
    }

    return null;
  }

  private executeDijkstra(
    startNodeId: string,
    endNodeId: string,
    pkg: Package
  ): SortingPath | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();

    this.nodes.forEach((_, id) => {
      distances.set(id, Infinity);
      previous.set(id, null);
    });
    distances.set(startNodeId, 0);

    while (true) {
      let minNode: string | null = null;
      let minDist = Infinity;
      
      distances.forEach((dist, node) => {
        if (!visited.has(node) && dist < minDist) {
          minDist = dist;
          minNode = node;
        }
      });

      if (minNode === null || minNode === endNodeId) break;
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

    const nodePath = this.reconstructPath(previous, startNodeId, endNodeId);
    if (!nodePath) return null;

    return {
      id: uuidv4(),
      packageId: pkg.id,
      nodes: nodePath,
      totalDistance: this.calculateTotalDistance(nodePath),
      estimatedTime: nodePath.length * 100,
      createdAt: Date.now(),
      priority: pkg.priority
    };
  }

  private calculateEdgeCost(
    from: ConveyorNode,
    to: ConveyorNode,
    pkg: Package
  ): number {
    const baseDist = Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2));
    const loadFactor = to.currentLoad / Math.max(to.capacity, 1);
    const priorityFactor = 1 / (pkg.priority + 1);
    const inactivePenalty = to.isActive ? 0 : this.costFactors.INACTIVE;

    return baseDist * (1 + loadFactor * this.costFactors.LOAD) * 
           (1 + priorityFactor * this.costFactors.PRIORITY) + inactivePenalty;
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
      const from = this.nodes.get(path[i]);
      const to = this.nodes.get(path[i + 1]);
      if (from && to) {
        total += Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2));
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
    this.cache.set(key, path);
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

export default PathPlannerEngine;
