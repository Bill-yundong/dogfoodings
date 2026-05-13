import { SedimentDiffusionSimulator } from './SedimentDiffusion';
import { MultiBodyDynamicsEngine } from './MultiBodyDynamics';
import { IndexedDBStorage } from '../storage/IndexedDBStorage';
import { SemanticSynchronizer } from '../sync/SemanticSync';
import type { OceanCurrent, SimulationState } from '$lib/types';

export class SimulationController {
  private sedimentSimulator: SedimentDiffusionSimulator;
  private dynamicsEngine: MultiBodyDynamicsEngine;
  private storage: IndexedDBStorage;
  private semanticSync: SemanticSynchronizer;
  
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private elapsedTime: number = 0;
  private lastUpdateTime: number = 0;
  private snapshotInterval: number = 5000;
  private lastSnapshotTime: number = 0;

  private current: OceanCurrent = {
    velocity: { x: 0.3, y: 0.05, z: 0.2 },
    turbulence: 0.3,
    temperature: 4,
    salinity: 35,
    depth: 4000
  };

  private statusCallbacks: Array<(status: { running: boolean; elapsedTime: number }) => void> = [];
  private particleCallbacks: Array<(particles: any[]) => void> = [];
  private pumpCallbacks: Array<(pumps: any[]) => void> = [];

  constructor() {
    this.sedimentSimulator = new SedimentDiffusionSimulator();
    this.dynamicsEngine = new MultiBodyDynamicsEngine();
    this.storage = new IndexedDBStorage();
    this.semanticSync = new SemanticSynchronizer();

    this.initializePumps();
  }

  private initializePumps(): void {
    this.dynamicsEngine.addPump({
      id: 'pump-1',
      name: 'Main Mining Pump',
      position: { x: 50, y: 25, z: 50 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      mass: 5000,
      forces: { x: 0, y: 0, z: 0 },
      isActive: true,
      power: 75,
      flowRate: 7.5
    });

    this.dynamicsEngine.addPump({
      id: 'pump-2',
      name: 'Auxiliary Pump',
      position: { x: 60, y: 30, z: 55 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      mass: 3000,
      forces: { x: 0, y: 0, z: 0 },
      isActive: true,
      power: 50,
      flowRate: 5
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    await this.storage.init();
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.lastSnapshotTime = performance.now();
    
    this.loop();
    this.notifyStatus();
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.notifyStatus();
  }

  private loop(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = (now - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = now;
    this.elapsedTime += dt;

    this.update(dt);

    if (now - this.lastSnapshotTime >= this.snapshotInterval) {
      this.createSnapshot();
      this.lastSnapshotTime = now;
    }

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    const params = this.semanticSync.getEngineeringParameters();
    
    this.current.velocity.x = params.currentSpeed;
    
    this.sedimentSimulator.update(dt, this.current);
    
    const activePumps = this.dynamicsEngine.getPumps().filter(p => p.isActive);
    if (activePumps.length > 0 && Math.random() < 0.1) {
      const sourcePump = activePumps[Math.floor(Math.random() * activePumps.length)];
      this.sedimentSimulator.generateParticles(
        Math.floor(params.sedimentReleaseRate / 10),
        sourcePump.position,
        params.sedimentReleaseRate
      );
    }

    this.dynamicsEngine.updateAsync(this.current);

    this.notifyParticleUpdate();
    this.notifyPumpUpdate();
  }

  async createSnapshot(): Promise<SimulationState> {
    await this.storage.init();
    
    const particles = this.sedimentSimulator.getParticles();
    const pumps = this.dynamicsEngine.getPumps();
    const params = this.semanticSync.getEngineeringParameters();
    const semanticParams = this.semanticSync.getAllParameters();

    const snapshot = await this.storage.createSnapshot(
      particles,
      pumps,
      this.current,
      params,
      semanticParams,
      this.elapsedTime
    );

    await this.storage.cleanupOldStates(100);
    
    return snapshot;
  }

  async loadState(state: SimulationState): Promise<void> {
    this.stop();
    
    this.sedimentSimulator.clear();
    state.particles.forEach(p => {
      this.sedimentSimulator.generateParticles(1, p.position, 0);
    });

    this.dynamicsEngine.reset();
    state.pumps.forEach(pump => {
      try {
        this.dynamicsEngine.removePump(pump.id);
      } catch (e) {}
      this.dynamicsEngine.addPump(pump);
    });

    this.current = state.current;
    this.elapsedTime = state.elapsedTime;

    state.semanticParams.forEach(param => {
      this.semanticSync.setEngineeringValue(param.id, param.engineeringValue);
    });
  }

  setCurrentVelocity(x: number, y: number, z: number): void {
    this.current.velocity = { x, y, z };
  }

  setTurbulence(turbulence: number): void {
    this.current.turbulence = turbulence;
  }

  getSedimentSimulator(): SedimentDiffusionSimulator {
    return this.sedimentSimulator;
  }

  getDynamicsEngine(): MultiBodyDynamicsEngine {
    return this.dynamicsEngine;
  }

  getStorage(): IndexedDBStorage {
    return this.storage;
  }

  getSemanticSync(): SemanticSynchronizer {
    return this.semanticSync;
  }

  getCurrent(): OceanCurrent {
    return { ...this.current };
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  reset(): void {
    this.stop();
    this.sedimentSimulator.clear();
    this.dynamicsEngine.reset();
    this.elapsedTime = 0;
    this.semanticSync.reset();
    this.notifyStatus();
    this.notifyParticleUpdate();
    this.notifyPumpUpdate();
  }

  onStatusUpdate(callback: (status: { running: boolean; elapsedTime: number }) => void): void {
    this.statusCallbacks.push(callback);
  }

  onParticleUpdate(callback: (particles: any[]) => void): void {
    this.particleCallbacks.push(callback);
  }

  onPumpUpdate(callback: (pumps: any[]) => void): void {
    this.pumpCallbacks.push(callback);
  }

  private notifyStatus(): void {
    const status = { running: this.isRunning, elapsedTime: this.elapsedTime };
    this.statusCallbacks.forEach(cb => cb(status));
  }

  private notifyParticleUpdate(): void {
    const particles = this.sedimentSimulator.getParticles();
    this.particleCallbacks.forEach(cb => cb(particles));
  }

  private notifyPumpUpdate(): void {
    const pumps = this.dynamicsEngine.getPumps();
    this.pumpCallbacks.forEach(cb => cb(pumps));
  }
}
