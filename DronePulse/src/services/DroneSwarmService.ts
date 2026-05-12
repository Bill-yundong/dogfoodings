import { v4 as uuidv4 } from 'uuid';
import { Drone, Point, VoronoiCell, CoverageSnapshot, Waypoint } from '../types';
import { AsyncVoronoiSolver, calculateCoveragePercentage } from '../algorithms/voronoi';
import { dbStore } from '../store/indexedDB';
import { syncService } from './SemanticSyncService';

export class DroneSwarmService {
  private drones: Map<string, Drone> = new Map();
  private voronoiSolver: AsyncVoronoiSolver;
  private cells: Map<string, VoronoiCell> = new Map();
  private waypoints: Map<string, Point[]> = new Map();
  private visitedWaypoints: Map<string, Point[]> = new Map();
  private animationFrame: number | null = null;
  private coverageRadius: number = 50;

  constructor(width: number, height: number) {
    this.voronoiSolver = new AsyncVoronoiSolver(width, height);
  }

  initializeDrones(count: number, width: number, height: number): void {
    this.drones.clear();
    this.cells.clear();
    this.waypoints.clear();
    this.visitedWaypoints = new Map();
    
    const margin = 80;
    
    for (let i = 0; i < count; i++) {
      const drone: Drone = {
        id: `drone-${uuidv4().slice(0, 8)}`,
        position: {
          x: margin + Math.random() * (width - margin * 2),
          y: margin + Math.random() * (height - margin * 2),
        },
        velocity: { x: 0, y: 0 },
        battery: 70 + Math.random() * 30,
        status: 'idle',
        coverageArea: 0,
        lastUpdate: Date.now(),
      };
      this.drones.set(drone.id, drone);
      this.visitedWaypoints.set(drone.id, []);
      dbStore.saveDrone(drone);
    }
  }

  getDrone(id: string): Drone | undefined {
    return this.drones.get(id);
  }

  getAllDrones(): Drone[] {
    return Array.from(this.drones.values());
  }

  getCells(): VoronoiCell[] {
    return Array.from(this.cells.values());
  }

  getWaypoints(droneId: string): Point[] {
    return this.waypoints.get(droneId) || [];
  }

  async updateVoronoi(): Promise<void> {
    const drones = this.getAllDrones();
    const newCells = await this.voronoiSolver.compute(drones);

    this.cells.clear();
    newCells.forEach(cell => {
      this.cells.set(cell.droneId, cell);
    });

    for (const drone of drones) {
      const cell = this.cells.get(drone.id);
      if (cell) {
        const wp = await this.voronoiSolver.optimizeWaypoints(
          cell,
          drone.position,
          this.coverageRadius
        );
        this.waypoints.set(drone.id, wp);
      }
    }
  }

  startSimulation(): void {
    if (this.animationFrame) return;
    this.animate();
  }

  stopSimulation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private animate = (): void => {
    this.updateDrones();
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private updateDrones(): void {
    this.drones.forEach((drone, id) => {
      const waypoints = this.waypoints.get(id);
      
      if (waypoints && waypoints.length > 0 && drone.status === 'patrolling') {
        const target = waypoints[0];
        const dx = target.x - drone.position.x;
        const dy = target.y - drone.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          const visited = this.visitedWaypoints.get(id) || [];
          visited.push(waypoints.shift()!);
          this.visitedWaypoints.set(id, visited);
          this.createCoverageSnapshot(drone);
        } else {
          const speed = 2;
          drone.velocity = { x: (dx / dist) * speed, y: (dy / dist) * speed };
          drone.position.x += drone.velocity.x;
          drone.position.y += drone.velocity.y;
        }

        drone.battery -= 0.01;
        if (drone.battery < 20) {
          drone.status = 'charging';
          syncService.sendAlert('LOW_BATTERY', { droneId: id, battery: drone.battery });
        }
      } else if (drone.status === 'charging') {
        drone.battery += 0.1;
        if (drone.battery >= 95) {
          drone.status = 'patrolling';
        }
      }

      drone.lastUpdate = Date.now();
      dbStore.saveDrone(drone);
      syncService.broadcastDroneUpdate(drone);
    });
  }

  private createCoverageSnapshot(drone: Drone): void {
    const cell = this.cells.get(drone.id);
    const visited = this.visitedWaypoints.get(drone.id) || [];

    const waypoints: Waypoint[] = visited.map(p => ({
      ...p,
      altitude: 100,
      timestamp: Date.now(),
    }));

    const snapshot: CoverageSnapshot = {
      id: `snap-${uuidv4()}`,
      droneId: drone.id,
      timestamp: Date.now(),
      coverageArea: cell?.area || 0,
      position: { ...drone.position },
      waypoints,
      coveragePercentage: calculateCoveragePercentage(visited, cell?.area || 0, this.coverageRadius),
    };

    dbStore.saveCoverageSnapshot(snapshot);
    syncService.broadcastCoverageUpdate(snapshot);
  }

  startPatrolling(): void {
    this.drones.forEach(drone => {
      if (drone.battery > 20) {
        drone.status = 'patrolling';
      }
    });
  }

  stopPatrolling(): void {
    this.drones.forEach(drone => {
      if (drone.status === 'patrolling') {
        drone.status = 'idle';
        drone.velocity = { x: 0, y: 0 };
      }
    });
  }

  getTotalCoverage(): number {
    const cells = this.getCells();
    const totalArea = cells.reduce((sum, cell) => sum + cell.area, 0);
    
    let coveredArea = 0;
    this.drones.forEach(drone => {
      const visited = this.visitedWaypoints.get(drone.id) || [];
      const cell = this.cells.get(drone.id);
      if (cell) {
        coveredArea += visited.length * Math.PI * this.coverageRadius ** 2;
      }
    });

    return totalArea > 0 ? Math.min(100, (coveredArea / totalArea) * 100) : 0;
  }

  setCoverageRadius(radius: number): void {
    this.coverageRadius = radius;
  }

  destroy(): void {
    this.stopSimulation();
    this.drones.clear();
    this.cells.clear();
    this.waypoints.clear();
    this.visitedWaypoints.clear();
  }
}
