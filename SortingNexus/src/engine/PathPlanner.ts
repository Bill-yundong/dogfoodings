import { ConveyorNode, SortingPath, Package } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface PriorityQueueItem {
  nodeId: string;
  priority: number;
  distance: number;
}

class PriorityQueue {
  private items: PriorityQueueItem[] = [];

  enqueue(nodeId: string, priority: number, distance: number): void {
    const item: PriorityQueueItem = { nodeId, priority, distance };
    const index = this.items.findIndex(i => i.priority > priority);
    if (index === -1) {
      this.items.push(item);
    } else {
      this.items.splice(index, 0, item);
    }
  }

  dequeue(): PriorityQueueItem | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  decreasePriority(nodeId: string, newPriority: number, newDistance: number): void {
    const index = this.items.findIndex(i => i.nodeId === nodeId);
    if (index !== -1 && this.items[index].priority > newPriority) {
      this.items.splice(index, 1);
      this.enqueue(nodeId, newPriority, newDistance);
    }
  }
}

export class AsyncDijkstraPlanner {
  private nodes: Map<string, ConveyorNode> = new Map();
  private cache: Map<string, SortingPath> = new Map();
  private maxCacheSize = 1000;

  updateNodes(nodes: ConveyorNode[]): void {
    this.nodes.clear();
    nodes.forEach(node => this.nodes.set(node.id, node));
    this.cache.clear();
  }

  private calculateDistance(nodeA: ConveyorNode, nodeB: ConveyorNode): number {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateCost(current: ConveyorNode, neighbor: ConveyorNode, pkg: Package): number {
    const baseDistance = this.calculateDistance(current, neighbor);
    const loadFactor = neighbor.currentLoad / neighbor.capacity;
    const priorityFactor = 1 / (pkg.priority + 1);
    const activePenalty = neighbor.isActive ? 0 : 1000;
    return baseDistance * (1 + loadFactor * 2) * priorityFactor + activePenalty;
  }

  async findOptimalPath(
    startNodeId: string,
    endNodeId: string,
    pkg: Package
  ): Promise<SortingPath | null> {
    const cacheKey = `${startNodeId}-${endNodeId}-${pkg.priority}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < 5000) {
      return cached;
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this.runDijkstra(startNodeId, endNodeId, pkg);
        if (result) {
          if (this.cache.size >= this.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
          }
          this.cache.set(cacheKey, result);
        }
        resolve(result);
      }, 0);
    });
  }

  private runDijkstra(
    startNodeId: string,
    endNodeId: string,
    pkg: Package
  ): SortingPath | null {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
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
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      if (currentNodeId === endNodeId) {
        break;
      }

      const currentNode = this.nodes.get(currentNodeId);
      if (!currentNode) continue;

      for (const neighborId of currentNode.neighbors) {
        if (visited.has(neighborId)) continue;

        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;

        const cost = this.calculateCost(currentNode, neighborNode, pkg);
        const newDistance = (distances.get(currentNodeId) || 0) + cost;

        if (newDistance < (distances.get(neighborId) || Infinity)) {
          distances.set(neighborId, newDistance);
          previous.set(neighborId, currentNodeId);
          pq.enqueue(neighborId, newDistance, newDistance);
        }
      }
    }

    const path: string[] = [];
    let current: string | null = endNodeId;

    while (current) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    if (path[0] !== startNodeId) {
      return null;
    }

    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const nodeA = this.nodes.get(path[i]);
      const nodeB = this.nodes.get(path[i + 1]);
      if (nodeA && nodeB) {
        totalDistance += this.calculateDistance(nodeA, nodeB);
      }
    }

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

  async batchPlan(
    packages: Package[],
    targetNodes: Map<string, string>
  ): Promise<Map<string, SortingPath>> {
    const results = new Map<string, SortingPath>();
    const batchSize = 10;

    for (let i = 0; i < packages.length; i += batchSize) {
      const batch = packages.slice(i, i + batchSize);
      const promises = batch.map(async (pkg) => {
        const targetNode = targetNodes.get(pkg.destination);
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

  getUtilizationRate(): number {
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
}

export default AsyncDijkstraPlanner;
