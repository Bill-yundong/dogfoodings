import type { GridCell, SimulationConfig, PipeNode, PipeConnection } from '../types';

export class RainfallRunoffModel {
  private config: SimulationConfig;
  private grid: GridCell[][];
  private nodes: Map<string, PipeNode>;
  private connections: PipeConnection[];

  constructor(config: SimulationConfig) {
    this.config = config;
    this.grid = [];
    this.nodes = new Map();
    this.connections = [];
    this.initializeGrid();
    this.initializePipeNetwork();
  }

  private initializeGrid(): void {
    const size = this.config.gridSize;
    for (let y = 0; y < size; y++) {
      this.grid[y] = [];
      for (let x = 0; x < size; x++) {
        const elevation = this.generateElevation(x, y);
        this.grid[y][x] = {
          id: `cell_${x}_${y}`,
          x,
          y,
          elevation,
          runoffCoefficient: 0.3 + Math.random() * 0.5,
          waterDepth: 0,
          drainageCapacity: 0.5 + Math.random() * 0.5
        };
      }
    }
  }

  private generateElevation(x: number, y: number): number {
    const centerX = this.config.gridSize / 2;
    const centerY = this.config.gridSize / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    return 5 + distance * 0.2 + Math.sin(x * 0.3) * 2 + Math.cos(y * 0.3) * 2;
  }

  private initializePipeNetwork(): void {
    const size = this.config.gridSize;
    const nodeCount = Math.floor(size / 2);

    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < nodeCount; j++) {
        const nodeId = `node_${i}_${j}`;
        this.nodes.set(nodeId, {
          id: nodeId,
          x: i * 2 + 1,
          y: j * 2 + 1,
          type: i === 0 && j === 0 ? 'outlet' : (i === nodeCount - 1 && j === nodeCount - 1 ? 'inlet' : 'junction'),
          capacity: 10,
          currentFlow: 0
        });
      }
    }

    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < nodeCount; j++) {
        if (i < nodeCount - 1) {
          this.connections.push({
            id: `pipe_h_${i}_${j}`,
            from: `node_${i}_${j}`,
            to: `node_${i + 1}_${j}`,
            diameter: 0.8,
            length: 100,
            slope: 0.005,
            maxFlow: 5
          });
        }
        if (j < nodeCount - 1) {
          this.connections.push({
            id: `pipe_v_${i}_${j}`,
            from: `node_${i}_${j}`,
            to: `node_${i}_${j + 1}`,
            diameter: 0.8,
            length: 100,
            slope: 0.005,
            maxFlow: 5
          });
        }
      }
    }
  }

  public step(rainfallIntensity: number): void {
    this.applyRainfall(rainfallIntensity);
    this.calculateRunoff();
    this.calculateDrainage();
    this.propagateWater();
  }

  private applyRainfall(intensity: number): void {
    for (let y = 0; y < this.config.gridSize; y++) {
      for (let x = 0; x < this.config.gridSize; x++) {
        this.grid[y][x].waterDepth += intensity * this.config.timeStep * 0.001;
      }
    }
  }

  private calculateRunoff(): void {
    for (let y = 0; y < this.config.gridSize; y++) {
      for (let x = 0; x < this.config.gridSize; x++) {
        const cell = this.grid[y][x];
        const infiltration = cell.waterDepth * (1 - cell.runoffCoefficient) * 0.1;
        cell.waterDepth -= infiltration;
        if (cell.waterDepth < 0) cell.waterDepth = 0;
      }
    }
  }

  private calculateDrainage(): void {
    for (let y = 0; y < this.config.gridSize; y++) {
      for (let x = 0; x < this.config.gridSize; x++) {
        const cell = this.grid[y][x];
        const drainage = Math.min(cell.waterDepth, cell.drainageCapacity * this.config.timeStep);
        cell.waterDepth -= drainage;
        this.addToPipeNetwork(x, y, drainage);
      }
    }
  }

  private addToPipeNetwork(x: number, y: number, volume: number): void {
    let nearestNode: PipeNode | null = null;
    let minDistance = Infinity;

    for (const node of this.nodes.values()) {
      const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }

    if (nearestNode) {
      nearestNode.currentFlow += volume;
    }
  }

  private propagateWater(): void {
    const size = this.config.gridSize;
    const newGrid: GridCell[][] = JSON.parse(JSON.stringify(this.grid));

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = this.grid[y][x];
        if (cell.waterDepth > 0.01) {
          const neighbors = this.getNeighbors(x, y);
          for (const neighbor of neighbors) {
            const nx = neighbor.x;
            const ny = neighbor.y;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
              const neighborCell = this.grid[ny][nx];
              const elevationDiff = (cell.elevation + cell.waterDepth) - (neighborCell.elevation + neighborCell.waterDepth);
              if (elevationDiff > 0.01) {
                const flow = Math.min(cell.waterDepth * 0.1, elevationDiff * 0.5);
                newGrid[y][x].waterDepth -= flow;
                newGrid[ny][nx].waterDepth += flow;
              }
            }
          }
        }
      }
    }

    this.grid = newGrid;
  }

  private getNeighbors(x: number, y: number): { x: number; y: number }[] {
    return [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 }
    ];
  }

  public getGrid(): GridCell[][] {
    return this.grid;
  }

  public getNodes(): PipeNode[] {
    return Array.from(this.nodes.values());
  }

  public getConnections(): PipeConnection[] {
    return this.connections;
  }

  public getFloodAreas(): { x: number; y: number; depth: number; severity: string }[] {
    const floodAreas: { x: number; y: number; depth: number; severity: string }[] = [];
    for (let y = 0; y < this.config.gridSize; y++) {
      for (let x = 0; x < this.config.gridSize; x++) {
        const cell = this.grid[y][x];
        if (cell.waterDepth > 0.1) {
          let severity = 'low';
          if (cell.waterDepth > 0.5) severity = 'medium';
          if (cell.waterDepth > 1.0) severity = 'high';
          if (cell.waterDepth > 1.5) severity = 'critical';
          floodAreas.push({ x, y, depth: cell.waterDepth, severity });
        }
      }
    }
    return floodAreas;
  }
}
