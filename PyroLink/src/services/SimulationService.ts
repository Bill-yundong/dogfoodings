import { TerrainPoint, FirePoint, WindVector } from '../types';

export class SimulationService {
  private terrain: TerrainPoint[][] = [];
  private fires: FirePoint[] = [];
  private windField: WindVector[][] = [];
  private gridSize: number = 100;
  private time: number = 0;
  private animationId: number | null = null;
  private callbacks: ((state: { fires: FirePoint[]; windField: WindVector[][]; time: number }) => void)[] = [];

  async init(terrain: TerrainPoint[][], initialFires: FirePoint[]) {
    this.terrain = terrain;
    this.fires = [...initialFires];
    this.gridSize = terrain.length;
    this.time = 0;
    this.generateWindField({ speed: 5, direction: Math.PI / 4 });
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

  private step() {
    this.time += 0.1;
    this.generateWindField({
      speed: 5 + Math.sin(this.time * 0.01) * 2,
      direction: Math.PI / 4 + Math.sin(this.time * 0.005) * 0.5
    });

    const newFires: FirePoint[] = [];
    const spreadProbability = 0.3 * 0.1;

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

          if (!existingFire && !newFires.find(f => 
            Math.abs(f.x - neighbor.x) < 5 && Math.abs(f.y - neighbor.y) < 5
          )) {
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

      fire.intensity = Math.max(0.1, fire.intensity - 0.001 * 0.1);
      fire.temperature = Math.max(400, fire.temperature - 0.5 * 0.1);
    });

    this.fires = [...this.fires.filter(f => f.intensity > 0.1), ...newFires];

    const state = {
      fires: [...this.fires],
      windField: this.windField.map(row => [...row]),
      time: this.time
    };

    this.callbacks.forEach(cb => cb(state));
  }

  start() {
    if (this.animationId) return;
    
    const loop = () => {
      this.step();
      this.animationId = requestAnimationFrame(loop);
    };
    
    loop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  onUpdate(callback: (state: { fires: FirePoint[]; windField: WindVector[][]; time: number }) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
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
    this.step();
  }

  clearFires() {
    this.fires = [];
    this.step();
  }

  getState() {
    return {
      fires: [...this.fires],
      windField: this.windField.map(row => [...row]),
      time: this.time
    };
  }

  destroy() {
    this.stop();
  }
}
