import * as Comlink from 'comlink';
import { TerrainPoint, FirePoint, WindVector } from '../types';

type SimulationWorker = {
  init: (params: {
    terrain: TerrainPoint[][];
    initialFires: FirePoint[];
    windBase: { speed: number; direction: number };
    gridSize: number;
  }) => void;
  step: (deltaTime: number) => { fires: FirePoint[]; windField: WindVector[][]; time: number };
  getState: () => { fires: FirePoint[]; windField: WindVector[][]; time: number };
  addFire: (x: number, y: number, intensity?: number) => void;
  clearFires: () => void;
};

export class SimulationService {
  private worker: Worker | null = null;
  private simulation: SimulationWorker | null = null;
  private animationId: number | null = null;
  private callbacks: ((state: { fires: FirePoint[]; windField: WindVector[][]; time: number }) => void)[] = [];

  async init(terrain: TerrainPoint[][], initialFires: FirePoint[]) {
    if (this.worker) {
      this.worker.terminate();
    }

    this.worker = new Worker(new URL('../workers/fireSimulation.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.simulation = Comlink.wrap<SimulationWorker>(this.worker);

    await this.simulation.init({
      terrain,
      initialFires,
      windBase: { speed: 5, direction: Math.PI / 4 },
      gridSize: terrain.length
    });
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

  private step() {
    if (!this.simulation) return;
    
    this.simulation.step(0.1).then(state => {
      this.callbacks.forEach(cb => cb(state));
    });
  }

  onUpdate(callback: (state: { fires: FirePoint[]; windField: WindVector[][]; time: number }) => void) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  addFire(x: number, y: number, intensity: number = 0.8) {
    if (this.simulation) {
      this.simulation.addFire(x, y, intensity);
    }
  }

  clearFires() {
    if (this.simulation) {
      this.simulation.clearFires();
    }
  }

  getState() {
    return this.simulation?.getState();
  }

  destroy() {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.simulation = null;
  }
}
