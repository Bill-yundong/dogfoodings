import type { LBMConfig, MoldGeometry, FlowFieldData, Gate } from '../types';

const D2Q9_WEIGHTS = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
const D2Q9_VELOCITIES = [
  [0, 0],
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
];

export interface LBMStepResult {
  step: number;
  density: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
  pressure: Float32Array;
  temperature: Float32Array;
  fillPercentage: number;
  flowFront: { x: number; y: number; time: number; velocity: number }[];
}

export class LBMFluidEngine {
  private width: number;
  private height: number;
  private relaxationTime: number;
  private initialDensity: number;

  private f0: Float32Array;
  private f1: Float32Array;
  private density: Float32Array;
  private velocityX: Float32Array;
  private velocityY: Float32Array;
  private temperature: Float32Array;
  private mask: Uint8Array;

  private stepCount: number = 0;
  private gates: Gate[] = [];
  private moldTemperature: number = 80;
  private meltTemperature: number = 220;
  private injectionSpeed: number = 1.0;

  constructor(config: LBMConfig, geometry: MoldGeometry) {
    this.width = config.gridWidth;
    this.height = config.gridHeight;
    this.relaxationTime = config.relaxationTime;
    this.initialDensity = config.initialDensity;

    const size = this.width * this.height;
    this.f0 = new Float32Array(size * 9);
    this.f1 = new Float32Array(size * 9);
    this.density = new Float32Array(size);
    this.velocityX = new Float32Array(size);
    this.velocityY = new Float32Array(size);
    this.temperature = new Float32Array(size);
    this.mask = new Uint8Array(size);

    this.initializeGeometry(geometry);
    this.initializeDistribution();
  }

  private initializeGeometry(geometry: MoldGeometry): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        let isWall = x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1;

        for (const obstacle of geometry.obstacles) {
          if (this.isPointInObstacle(x, y, obstacle)) {
            isWall = true;
            break;
          }
        }

        this.mask[idx] = isWall ? 1 : 0;
      }
    }

    this.gates = geometry.gates;

    for (let i = 0; i < this.density.length; i++) {
      this.temperature[i] = this.moldTemperature;
    }
  }

  private isPointInObstacle(x: number, y: number, obstacle: { type: string; x: number; y: number; radius?: number; width?: number; height?: number }): boolean {
    const dx = x - obstacle.x;
    const dy = y - obstacle.y;

    if (obstacle.type === 'circle' && obstacle.radius) {
      return dx * dx + dy * dy <= obstacle.radius * obstacle.radius;
    }

    if (obstacle.type === 'rectangle' && obstacle.width && obstacle.height) {
      return Math.abs(dx) <= obstacle.width / 2 && Math.abs(dy) <= obstacle.height / 2;
    }

    return false;
  }

  private initializeDistribution(): void {
    for (let i = 0; i < this.density.length; i++) {
      if (this.mask[i] === 0) {
        this.density[i] = 0;
      }
    }

    for (let i = 0; i < this.f0.length; i++) {
      this.f0[i] = 0;
      this.f1[i] = 0;
    }
  }

  public setParameters(params: {
    meltTemperature?: number;
    moldTemperature?: number;
    injectionSpeed?: number;
  }): void {
    if (params.meltTemperature !== undefined) this.meltTemperature = params.meltTemperature;
    if (params.moldTemperature !== undefined) this.moldTemperature = params.moldTemperature;
    if (params.injectionSpeed !== undefined) this.injectionSpeed = params.injectionSpeed;
  }

  public step(): LBMStepResult {
    this.applyInjection();
    this.collision();
    this.streaming();
    this.applyBoundaryConditions();
    this.computeMacroscopic();
    this.updateTemperature();

    this.stepCount++;

    const fillPercentage = this.calculateFillPercentage();
    const flowFront = this.detectFlowFront();

    return {
      step: this.stepCount,
      density: new Float32Array(this.density),
      velocityX: new Float32Array(this.velocityX),
      velocityY: new Float32Array(this.velocityY),
      pressure: this.calculatePressure(),
      temperature: new Float32Array(this.temperature),
      fillPercentage,
      flowFront,
    };
  }

  private applyInjection(): void {
    const speedFactor = this.injectionSpeed * 0.1;

    for (const gate of this.gates) {
      const startX = Math.max(0, Math.floor(gate.x - gate.width / 2));
      const endX = Math.min(this.width - 1, Math.ceil(gate.x + gate.width / 2));
      const startY = Math.max(0, Math.floor(gate.y - gate.height / 2));
      const endY = Math.min(this.height - 1, Math.ceil(gate.y + gate.height / 2));

      for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
          const idx = y * this.width + x;
          if (this.mask[idx] === 0) {
            this.density[idx] = Math.min(this.initialDensity, this.density[idx] + speedFactor);
            this.temperature[idx] = this.meltTemperature;

            const dirX = Math.cos(gate.injectionDirection);
            const dirY = Math.sin(gate.injectionDirection);
            this.velocityX[idx] = dirX * speedFactor;
            this.velocityY[idx] = dirY * speedFactor;

            this.equilibrateDistribution(idx);
          }
        }
      }
    }
  }

  private equilibrateDistribution(idx: number): void {
    const rho = this.density[idx];
    const ux = this.velocityX[idx];
    const uy = this.velocityY[idx];

    for (let k = 0; k < 9; k++) {
      const ex = D2Q9_VELOCITIES[k][0];
      const ey = D2Q9_VELOCITIES[k][1];
      const eu = ex * ux + ey * uy;
      const uu = ux * ux + uy * uy;

      const feq = D2Q9_WEIGHTS[k] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * uu);
      this.f0[idx * 9 + k] = feq;
    }
  }

  private collision(): void {
    const tau = this.relaxationTime;
    const invTau = 1 / tau;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1 || this.density[idx] <= 0.01) continue;

        const rho = this.density[idx];
        const ux = this.velocityX[idx];
        const uy = this.velocityY[idx];
        const uu = ux * ux + uy * uy;

        for (let k = 0; k < 9; k++) {
          const ex = D2Q9_VELOCITIES[k][0];
          const ey = D2Q9_VELOCITIES[k][1];
          const eu = ex * ux + ey * uy;

          const feq = D2Q9_WEIGHTS[k] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * uu);
          const f = this.f0[idx * 9 + k];

          this.f1[idx * 9 + k] = f + invTau * (feq - f);
        }
      }
    }
  }

  private streaming(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1) continue;

        for (let k = 0; k < 9; k++) {
          const ex = D2Q9_VELOCITIES[k][0];
          const ey = D2Q9_VELOCITIES[k][1];

          const nx = x - ex;
          const ny = y - ey;

          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
            const nidx = ny * this.width + nx;
            if (this.mask[nidx] === 0) {
              this.f0[idx * 9 + k] = this.f1[nidx * 9 + k];
            } else {
              const oppositeK = [0, 3, 4, 1, 2, 7, 8, 5, 6][k];
              this.f0[idx * 9 + k] = this.f1[idx * 9 + oppositeK];
            }
          } else {
            const oppositeK = [0, 3, 4, 1, 2, 7, 8, 5, 6][k];
            this.f0[idx * 9 + k] = this.f1[idx * 9 + oppositeK];
          }
        }
      }
    }
  }

  private applyBoundaryConditions(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1) {
          this.velocityX[idx] = 0;
          this.velocityY[idx] = 0;
        }
      }
    }
  }

  private computeMacroscopic(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1) continue;

        let rho = 0;
        let ux = 0;
        let uy = 0;

        for (let k = 0; k < 9; k++) {
          const f = this.f0[idx * 9 + k];
          rho += f;
          ux += f * D2Q9_VELOCITIES[k][0];
          uy += f * D2Q9_VELOCITIES[k][1];
        }

        if (rho > 0.01) {
          this.density[idx] = rho;
          this.velocityX[idx] = ux / rho;
          this.velocityY[idx] = uy / rho;
        } else {
          this.density[idx] = 0;
          this.velocityX[idx] = 0;
          this.velocityY[idx] = 0;
        }
      }
    }
  }

  private calculatePressure(): Float32Array {
    const pressure = new Float32Array(this.density.length);
    const cs2 = 1 / 3;

    for (let i = 0; i < this.density.length; i++) {
      if (this.mask[i] === 0) {
        pressure[i] = this.density[i] * cs2;
      }
    }

    return pressure;
  }

  private updateTemperature(): void {
    const alpha = 0.1;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1 || this.density[idx] <= 0.01) continue;

        const laplacian =
          this.temperature[(y - 1) * this.width + x] +
          this.temperature[(y + 1) * this.width + x] +
          this.temperature[y * this.width + (x - 1)] +
          this.temperature[y * this.width + (x + 1)] -
          4 * this.temperature[idx];

        this.temperature[idx] += alpha * laplacian;
      }
    }
  }

  private calculateFillPercentage(): number {
    let filledCount = 0;
    let totalCount = 0;

    for (let i = 0; i < this.density.length; i++) {
      if (this.mask[i] === 0) {
        totalCount++;
        if (this.density[i] > 0.1) {
          filledCount++;
        }
      }
    }

    return totalCount > 0 ? (filledCount / totalCount) * 100 : 0;
  }

  private detectFlowFront(): { x: number; y: number; time: number; velocity: number }[] {
    const front: { x: number; y: number; time: number; velocity: number }[] = [];
    const threshold = 0.1;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1 || this.density[idx] <= threshold) continue;

        const neighbors = [
          this.density[(y - 1) * this.width + x],
          this.density[(y + 1) * this.width + x],
          this.density[y * this.width + (x - 1)],
          this.density[y * this.width + (x + 1)],
        ];

        const hasEmptyNeighbor = neighbors.some(n => n < threshold * 0.5);

        if (hasEmptyNeighbor) {
          const velocity = Math.sqrt(
            this.velocityX[idx] ** 2 + this.velocityY[idx] ** 2
          );
          front.push({
            x,
            y,
            time: this.stepCount * 0.01,
            velocity,
          });
        }
      }
    }

    return front;
  }

  public getFlowFieldData(): FlowFieldData {
    return {
      density: new Float32Array(this.density),
      velocityX: new Float32Array(this.velocityX),
      velocityY: new Float32Array(this.velocityY),
      pressure: this.calculatePressure(),
      temperature: new Float32Array(this.temperature),
    };
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public getStep(): number {
    return this.stepCount;
  }

  public getMask(): Uint8Array {
    return new Uint8Array(this.mask);
  }

  public reset(): void {
    this.stepCount = 0;
    this.initializeDistribution();

    for (let i = 0; i < this.density.length; i++) {
      this.temperature[i] = this.moldTemperature;
    }
  }
}
