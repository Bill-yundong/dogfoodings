import * as Comlink from 'comlink';
import { TerrainPoint, FirePoint, WindVector } from '../types';

interface SimulationParams {
  terrain: TerrainPoint[][];
  initialFires: FirePoint[];
  windBase: { speed: number; direction: number };
  gridSize: number;
}

class FireSimulationWorker {
  private terrain: TerrainPoint[][] = [];
  private fires: FirePoint[] = [];
  private windField: WindVector[][] = [];
  private gridSize: number = 100;
  private time: number = 0;
  private isRunning: boolean = false;

  init(params: SimulationParams) {
    this.terrain = params.terrain;
    this.fires = [...params.initialFires];
    this.gridSize = params.gridSize;
    this.time = 0;
    this.generateWindField(params.windBase);
  }

  private generateWindField(windBase: { speed: number; direction: number }) {
    this.windField = [];
    
    for (let i = 0; i < this.gridSize; i++) {
      this.windField[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        const elevation = this.terrain[i]?.[j]?.elevation || 500;
        const terrainFactor = 1 + (elevation - 500) / 2000;
        
        const turbulence = (Math.sin(i * 0.5 + this.time * 0.01) * 
                           Math.cos(j * 0.5 + this.time * 0.01)) * 0.3;
        
        const speed = windBase.speed * terrainFactor * (1 + turbulence);
        const direction = windBase.direction + turbulence * Math.PI * 0.5;
        
        this.windField[i][j] = {
          u: Math.cos(direction) * speed,
          v: Math.sin(direction) * speed,
          speed,
          direction
        };
      }
    }
  }

  private calculateSpreadRate(
    fire: FirePoint,
    targetX: number,
    targetY: number
  ): number {
    const i = Math.floor(targetX / 10);
    const j = Math.floor(targetY / 10);
    
    if (i < 0 || i >= this.gridSize || j < 0 || j >= this.gridSize) {
      return 0;
    }

    const wind = this.windField[i][j];
    const elevation = this.terrain[i]?.[j]?.elevation || 500;
    
    const dx = targetX - fire.x;
    const dy = targetY - fire.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return 0;

    const windDot = (dx * wind.u + dy * wind.v) / (distance * wind.speed + 0.001);
    const windFactor = Math.max(0, 1 + windDot * 2);

    const targetElevation = this.terrain[i]?.[j]?.elevation || 500;
    const sourceI = Math.floor(fire.x / 10);
    const sourceJ = Math.floor(fire.y / 10);
    const sourceElevation = this.terrain[sourceI]?.[sourceJ]?.elevation || 500;
    const slope = (targetElevation - sourceElevation) / (distance + 0.001);
    const slopeFactor = Math.exp(slope * 3);

    const baseRate = 0.5;
    const intensityFactor = 0.5 + fire.intensity * 0.5;

    return baseRate * windFactor * slopeFactor * intensityFactor;
  }

  step(deltaTime: number = 1): { fires: FirePoint[]; windField: WindVector[][]; time: number } {
    this.time += deltaTime;
    this.generateWindField({
      speed: 5 + Math.sin(this.time * 0.01) * 2,
      direction: Math.PI / 4 + Math.sin(this.time * 0.005) * 0.5
    });

    const newFires: FirePoint[] = [];
    const spreadProbability = 0.3 * deltaTime;

    this.fires.forEach(fire => {
      const neighbors = [
        { x: fire.x + 10, y: fire.y },
        { x: fire.x - 10, y: fire.y },
        { x: fire.x, y: fire.y + 10 },
        { x: fire.x, y: fire.y - 10 },
        { x: fire.x + 10, y: fire.y + 10 },
        { x: fire.x - 10, y: fire.y + 10 },
        { x: fire.x + 10, y: fire.y - 10 },
        { x: fire.x - 10, y: fire.y - 10 }
      ];

      neighbors.forEach(neighbor => {
        const spreadRate = this.calculateSpreadRate(fire, neighbor.x, neighbor.y);
        const actualProbability = spreadProbability * spreadRate;

        if (Math.random() < actualProbability) {
          const existingFire = this.fires.find(f => 
            Math.abs(f.x - neighbor.x) < 5 && Math.abs(f.y - neighbor.y) < 5
          );

          if (!existingFire) {
            newFires.push({
              id: `fire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              x: neighbor.x,
              y: neighbor.y,
              intensity: Math.min(1, fire.intensity * 0.8 + Math.random() * 0.2),
              temperature: 800 + Math.random() * 200,
              spreadRate: spreadRate
            });
          }
        }
      });

      fire.intensity = Math.max(0.1, fire.intensity - 0.001 * deltaTime);
      fire.temperature = Math.max(400, fire.temperature - 0.5 * deltaTime);
    });

    this.fires = [...this.fires.filter(f => f.intensity > 0.1), ...newFires];

    return {
      fires: [...this.fires],
      windField: this.windField.map(row => [...row]),
      time: this.time
    };
  }

  getState() {
    return {
      fires: [...this.fires],
      windField: this.windField.map(row => [...row]),
      time: this.time
    };
  }

  addFire(x: number, y: number, intensity: number = 0.8) {
    this.fires.push({
      id: `fire-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      intensity,
      temperature: 800 + intensity * 200,
      spreadRate: 0
    });
  }

  clearFires() {
    this.fires = [];
  }
}

Comlink.expose(FireSimulationWorker);
