import {
  Direction,
  GridCell,
  Vehicle,
  Intersection,
  TrafficLevel,
  TrafficIndex,
  SimulationConfig,
} from '../types/traffic';

export class TrafficSimulation {
  private grid: GridCell[][];
  private vehicles: Vehicle[];
  private intersections: Intersection[];
  private config: SimulationConfig;
  private stepCount: number = 0;
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.grid = [];
    this.vehicles = [];
    this.intersections = [];
    this.initializeGrid();
    this.initializeIntersections();
    this.generateInitialTraffic();
  }

  private initializeGrid(): void {
    for (let y = 0; y < this.config.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.config.gridWidth; x++) {
        const isRoad = y % 4 === 0 || x % 4 === 0;
        const isIntersection = y % 4 === 0 && x % 4 === 0;
        const isBuilding = !isRoad && Math.random() > 0.3;
        
        this.grid[y][x] = {
          x,
          y,
          type: isIntersection ? 'intersection' : isRoad ? 'road' : isBuilding ? 'building' : 'park',
          vehicle: null,
          trafficLevel: TrafficLevel.SMOOTH,
          flowRate: 0,
        };
      }
    }
  }

  private initializeIntersections(): void {
    for (let y = 0; y < this.config.gridHeight; y += 4) {
      for (let x = 0; x < this.config.gridWidth; x += 4) {
        if (this.grid[y][x].type === 'intersection') {
          this.intersections.push({
            id: `intersection-${x}-${y}`,
            x,
            y,
            northSouthLight: 'green',
            eastWestLight: 'red',
            lightTimer: 0,
            lightDuration: this.config.lightCycleDuration,
            queueLength: { north: 0, south: 0, east: 0, west: 0 },
          });
        }
      }
    }
  }

  private generateInitialTraffic(): void {
    const vehicleCount = Math.floor(
      this.config.gridWidth * this.config.gridHeight * 0.08 * this.config.vehicleDensity
    );

    for (let i = 0; i < vehicleCount; i++) {
      this.addRandomVehicle();
    }
  }

  private addRandomVehicle(): void {
    const roads = this.getAllRoadCells();
    if (roads.length === 0) return;

    const attempts = 50;
    for (let i = 0; i < attempts; i++) {
      const road = roads[Math.floor(Math.random() * roads.length)];
      if (!this.grid[road.y][road.x].vehicle) {
        const vehicle: Vehicle = {
          id: `vehicle-${Date.now()}-${Math.random()}`,
          x: road.x,
          y: road.y,
          direction: this.getRandomDirection(road.x, road.y),
          speed: 1,
          maxSpeed: this.config.maxSpeed,
          lane: Math.floor(Math.random() * 2),
          waitTime: 0,
        };

        this.vehicles.push(vehicle);
        this.grid[road.y][road.x].vehicle = vehicle;
        return;
      }
    }
  }

  private getAllRoadCells(): { x: number; y: number }[] {
    const roads: { x: number; y: number }[] = [];
    for (let y = 0; y < this.config.gridHeight; y++) {
      for (let x = 0; x < this.config.gridWidth; x++) {
        if (this.grid[y][x].type === 'road' || this.grid[y][x].type === 'intersection') {
          roads.push({ x, y });
        }
      }
    }
    return roads;
  }

  private getRandomDirection(x: number, y: number): Direction {
    const directions: Direction[] = [];
    
    if (y % 4 === 0) {
      directions.push(Direction.LEFT, Direction.RIGHT);
    }
    if (x % 4 === 0) {
      directions.push(Direction.UP, Direction.DOWN);
    }
    
    if (directions.length === 0) {
      directions.push(Direction.RIGHT);
    }
    
    return directions[Math.floor(Math.random() * directions.length)];
  }

  public async step(): Promise<void> {
    this.updateTrafficLights();
    await this.updateVehicles();
    this.updateTrafficLevels();
    this.stepCount++;
    
    if (Math.random() < 0.1) {
      this.addRandomVehicle();
    }
  }

  private updateTrafficLights(): void {
    this.intersections.forEach(intersection => {
      intersection.lightTimer++;
      if (intersection.lightTimer >= intersection.lightDuration) {
        intersection.lightTimer = 0;
        
        if (intersection.northSouthLight === 'green') {
          intersection.northSouthLight = 'yellow';
        } else if (intersection.northSouthLight === 'yellow') {
          intersection.northSouthLight = 'red';
          intersection.eastWestLight = 'green';
        } else if (intersection.eastWestLight === 'green') {
          intersection.eastWestLight = 'yellow';
        } else {
          intersection.eastWestLight = 'red';
          intersection.northSouthLight = 'green';
        }
      }
    });
  }

  private async updateVehicles(): Promise<void> {
    const updatePromises = this.vehicles.map(async (vehicle) => {
      return this.updateSingleVehicle(vehicle);
    });

    await Promise.all(updatePromises);
    this.vehicles = this.vehicles.filter(v => !v.id.includes('removed'));
  }

  private updateSingleVehicle(vehicle: Vehicle): void {
    const { nextX, nextY } = this.getNextPosition(vehicle);
    
    if (!this.isValidPosition(nextX, nextY)) {
      this.removeVehicle(vehicle);
      return;
    }

    const nextCell = this.grid[nextY][nextX];
    const canProceed = this.canVehicleProceed(vehicle, nextX, nextY);

    if (canProceed && !nextCell.vehicle) {
      this.moveVehicle(vehicle, nextX, nextY);
      vehicle.waitTime = 0;
    } else {
      vehicle.speed = 0;
      vehicle.waitTime++;
      
      if (Math.random() < 0.02 && vehicle.waitTime > 10) {
        this.changeVehicleDirection(vehicle);
      }
    }
  }

  private getNextPosition(vehicle: Vehicle): { nextX: number; nextY: number } {
    const speed = vehicle.speed;
    switch (vehicle.direction) {
      case Direction.UP:
        return { nextX: vehicle.x, nextY: vehicle.y - speed };
      case Direction.DOWN:
        return { nextX: vehicle.x, nextY: vehicle.y + speed };
      case Direction.LEFT:
        return { nextX: vehicle.x - speed, nextY: vehicle.y };
      case Direction.RIGHT:
        return { nextX: vehicle.x + speed, nextY: vehicle.y };
    }
  }

  private isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < this.config.gridWidth && y >= 0 && y < this.config.gridHeight;
  }

  private canVehicleProceed(vehicle: Vehicle, nextX: number, nextY: number): boolean {
    const nextCell = this.grid[nextY][nextX];
    
    if (nextCell.type !== 'road' && nextCell.type !== 'intersection') {
      return false;
    }

    const intersection = this.getIntersectionAt(nextX, nextY);
    if (intersection) {
      const isVertical = vehicle.direction === Direction.UP || vehicle.direction === Direction.DOWN;
      const lightColor = isVertical ? intersection.northSouthLight : intersection.eastWestLight;
      
      if (lightColor === 'red') {
        return false;
      }
    }

    return true;
  }

  private getIntersectionAt(x: number, y: number): Intersection | undefined {
    return this.intersections.find(i => i.x === x && i.y === y);
  }

  private moveVehicle(vehicle: Vehicle, newX: number, newY: number): void {
    this.grid[vehicle.y][vehicle.x].vehicle = null;
    vehicle.x = newX;
    vehicle.y = newY;
    this.grid[newY][newX].vehicle = vehicle;
    
    vehicle.speed = Math.min(vehicle.speed + 1, vehicle.maxSpeed);
  }

  private removeVehicle(vehicle: Vehicle): void {
    this.grid[vehicle.y][vehicle.x].vehicle = null;
    vehicle.id = `removed-${vehicle.id}`;
  }

  private changeVehicleDirection(vehicle: Vehicle): void {
    const currentDir = vehicle.direction;
    const alternatives: Direction[] = [];
    
    for (let d = 0; d < 4; d++) {
      if (d !== currentDir) {
        alternatives.push(d as Direction);
      }
    }
    
    vehicle.direction = alternatives[Math.floor(Math.random() * alternatives.length)];
  }

  private updateTrafficLevels(): void {
    for (let y = 0; y < this.config.gridHeight; y++) {
      for (let x = 0; x < this.config.gridWidth; x++) {
        const cell = this.grid[y][x];
        if (cell.type !== 'road' && cell.type !== 'intersection') {
          continue;
        }

        const nearbyVehicles = this.countNearbyVehicles(x, y);
        const maxVehicles = 8;
        const density = Math.min(nearbyVehicles / maxVehicles, 1);

        if (density < 0.25) {
          cell.trafficLevel = TrafficLevel.SMOOTH;
        } else if (density < 0.5) {
          cell.trafficLevel = TrafficLevel.SLOW;
        } else if (density < 0.75) {
          cell.trafficLevel = TrafficLevel.CONGESTED;
        } else {
          cell.trafficLevel = TrafficLevel.SEVERE;
        }

        cell.flowRate = this.calculateFlowRate(density);
      }
    }
  }

  private countNearbyVehicles(x: number, y: number): number {
    let count = 0;
    const radius = 2;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (this.isValidPosition(nx, ny)) {
          if (this.grid[ny][nx].vehicle) {
            count++;
          }
        }
      }
    }
    
    return count;
  }

  private calculateFlowRate(density: number): number {
    const inverseDensity = 1 - density;
    return Math.round(inverseDensity * 100);
  }

  public getTrafficIndex(): TrafficIndex {
    const gridData: number[][] = [];
    const hotspots: Array<{ x: number; y: number; level: TrafficLevel }> = [];
    let totalLevel = 0;
    let roadCellCount = 0;

    for (let y = 0; y < this.config.gridHeight; y++) {
      gridData[y] = [];
      for (let x = 0; x < this.config.gridWidth; x++) {
        const cell = this.grid[y][x];
        gridData[y][x] = cell.trafficLevel;
        
        if (cell.type === 'road' || cell.type === 'intersection') {
          totalLevel += cell.trafficLevel;
          roadCellCount++;
          
          if (cell.trafficLevel >= TrafficLevel.CONGESTED) {
            hotspots.push({ x, y, level: cell.trafficLevel });
          }
        }
      }
    }

    const overall = roadCellCount > 0 ? Math.round((totalLevel / (roadCellCount * TrafficLevel.SEVERE)) * 100) : 0;

    return {
      timestamp: Date.now(),
      overall,
      gridData,
      hotspots,
    };
  }

  public getGrid(): GridCell[][] {
    return this.grid;
  }

  public getIntersections(): Intersection[] {
    return this.intersections;
  }

  public getStepCount(): number {
    return this.stepCount;
  }

  public getConfig(): SimulationConfig {
    return this.config;
  }

  public start(): void {
    this.isRunning = true;
  }

  public stop(): void {
    this.isRunning = false;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}