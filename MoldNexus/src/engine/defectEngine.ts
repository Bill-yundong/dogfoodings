import type { Defect, DefectType, FlowFieldData } from '../types';

export interface DefectDetectionConfig {
  weldLineThreshold: number;
  airTrapPressureThreshold: number;
  shortShotFillThreshold: number;
  burnMarkShearThreshold: number;
  temperatureThreshold: number;
}

const DEFAULT_CONFIG: DefectDetectionConfig = {
  weldLineThreshold: 0.3,
  airTrapPressureThreshold: 0.05,
  shortShotFillThreshold: 95,
  burnMarkShearThreshold: 0.8,
  temperatureThreshold: 180,
};

export class DefectPredictionEngine {
  private config: DefectDetectionConfig;
  private width: number;
  private height: number;
  private mask: Uint8Array;

  constructor(
    width: number,
    height: number,
    mask: Uint8Array,
    config?: Partial<DefectDetectionConfig>
  ) {
    this.width = width;
    this.height = height;
    this.mask = mask;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public detectDefects(
    flowField: FlowFieldData,
    fillPercentage: number,
    _step: number,
    snapshotId: string
  ): Defect[] {
    const defects: Defect[] = [];

    const weldLines = this.detectWeldLines(flowField, snapshotId);
    defects.push(...weldLines);

    const airTraps = this.detectAirTraps(flowField, snapshotId);
    defects.push(...airTraps);

    const shortShots = this.detectShortShots(fillPercentage, flowField, snapshotId);
    defects.push(...shortShots);

    const burnMarks = this.detectBurnMarks(flowField, snapshotId);
    defects.push(...burnMarks);

    const sinkMarks = this.detectSinkMarks(flowField, snapshotId);
    defects.push(...sinkMarks);

    return defects;
  }

  private detectWeldLines(flowField: FlowFieldData, snapshotId: string): Defect[] {
    const defects: Defect[] = [];
    const { velocityX, velocityY, density, temperature } = flowField;

    for (let y = 2; y < this.height - 2; y++) {
      for (let x = 2; x < this.width - 2; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1 || density[idx] < 0.1) continue;

        const vx = velocityX[idx];
        const vy = velocityY[idx];
        const speed = Math.sqrt(vx * vx + vy * vy);

        if (speed < 0.01) continue;

        let angleDiffSum = 0;
        let neighborCount = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nidx = (y + dy) * this.width + (x + dx);
            if (this.mask[nidx] === 1 || density[nidx] < 0.1) continue;

            const nvx = velocityX[nidx];
            const nvy = velocityY[nidx];
            const nspeed = Math.sqrt(nvx * nvx + nvy * nvy);

            if (nspeed < 0.01) continue;

            const dot = (vx * nvx + vy * nvy) / (speed * nspeed);
            const angleDiff = Math.acos(Math.max(-1, Math.min(1, dot)));
            angleDiffSum += angleDiff;
            neighborCount++;
          }
        }

        if (neighborCount > 0) {
          const avgAngleDiff = angleDiffSum / neighborCount;

          if (avgAngleDiff > this.config.weldLineThreshold && temperature[idx] < this.config.temperatureThreshold) {
            const severity = Math.min(1, avgAngleDiff / Math.PI);

            defects.push({
              id: '',
              snapshotId,
              type: 'weld_line',
              severity,
              position: { x, y },
              description: `熔接痕 - 流速方向差异: ${(avgAngleDiff * 180 / Math.PI).toFixed(1)}°`,
              confidence: 0.7 + severity * 0.3,
            });
          }
        }
      }
    }

    return this.suppressNearbyDefects(defects, 5);
  }

  private detectAirTraps(flowField: FlowFieldData, snapshotId: string): Defect[] {
    const defects: Defect[] = [];
    const { density } = flowField;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1) continue;

        if (density[idx] > 0.05) continue;

        let surroundedByFluid = true;
        let neighborDensitySum = 0;
        let neighborCount = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
              surroundedByFluid = false;
              break;
            }

            const nidx = ny * this.width + nx;
            if (this.mask[nidx] === 1) continue;

            neighborDensitySum += density[nidx];
            neighborCount++;

            if (density[nidx] < 0.3) {
              surroundedByFluid = false;
              break;
            }
          }
          if (!surroundedByFluid) break;
        }

        if (surroundedByFluid && neighborCount > 0) {
          const avgNeighborDensity = neighborDensitySum / neighborCount;
          const severity = Math.min(1, avgNeighborDensity);

          if (avgNeighborDensity > 0.5) {
            defects.push({
              id: '',
              snapshotId,
              type: 'air_trap',
              severity,
              position: { x, y },
              area: this.countConnectedEmptyCells(x, y, density),
              description: `气泡 - 周围平均密度: ${avgNeighborDensity.toFixed(3)}`,
              confidence: 0.8,
            });
          }
        }
      }
    }

    return this.suppressNearbyDefects(defects, 3);
  }

  private countConnectedEmptyCells(startX: number, startY: number, density: Float32Array): number {
    const visited = new Set<number>();
    const stack: [number, number][] = [[startX, startY]];
    let count = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * this.width + x;

      if (visited.has(idx)) continue;
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
      if (this.mask[idx] === 1 || density[idx] > 0.1) continue;

      visited.add(idx);
      count++;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return count;
  }

  private detectShortShots(fillPercentage: number, flowField: FlowFieldData, snapshotId: string): Defect[] {
    const defects: Defect[] = [];

    if (fillPercentage >= this.config.shortShotFillThreshold) return defects;

    const { density } = flowField;
    const emptyRegions: { x: number; y: number; size: number }[] = [];
    const visited = new Set<number>();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1 || visited.has(idx) || density[idx] > 0.05) continue;

        const region = this.floodFillRegion(x, y, density, visited);
        if (region.size > 10) {
          emptyRegions.push(region);
        }
      }
    }

    for (const region of emptyRegions) {
      const severity = Math.min(1, region.size / 100);
      defects.push({
        id: '',
        snapshotId,
        type: 'short_shot',
        severity,
        position: { x: region.x, y: region.y },
        area: region.size,
        description: `短射 - 未充填区域大小: ${region.size} 格`,
        confidence: 0.9,
      });
    }

    return defects;
  }

  private floodFillRegion(
    startX: number,
    startY: number,
    density: Float32Array,
    visited: Set<number>
  ): { x: number; y: number; size: number } {
    const stack: [number, number][] = [[startX, startY]];
    let size = 0;
    let sumX = 0;
    let sumY = 0;

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const idx = y * this.width + x;

      if (visited.has(idx)) continue;
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
      if (this.mask[idx] === 1 || density[idx] > 0.05) continue;

      visited.add(idx);
      size++;
      sumX += x;
      sumY += y;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return {
      x: size > 0 ? Math.round(sumX / size) : startX,
      y: size > 0 ? Math.round(sumY / size) : startY,
      size,
    };
  }

  private detectBurnMarks(flowField: FlowFieldData, snapshotId: string): Defect[] {
    const defects: Defect[] = [];
    const { velocityX, velocityY, density, temperature } = flowField;

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1 || density[idx] < 0.1) continue;

        const shearRate = this.calculateShearRate(x, y, velocityX, velocityY);

        if (shearRate > this.config.burnMarkShearThreshold && temperature[idx] > this.config.temperatureThreshold) {
          const severity = Math.min(1, (shearRate - this.config.burnMarkShearThreshold) * 2);

          defects.push({
            id: '',
            snapshotId,
            type: 'burn_mark',
            severity,
            position: { x, y },
            description: `焦烧 - 剪切速率: ${shearRate.toFixed(3)}, 温度: ${temperature[idx].toFixed(1)}°C`,
            confidence: 0.75,
          });
        }
      }
    }

    return this.suppressNearbyDefects(defects, 4);
  }

  private calculateShearRate(
    x: number,
    y: number,
    velocityX: Float32Array,
    velocityY: Float32Array
  ): number {
    const idxX1 = y * this.width + (x + 1);
    const idxX2 = y * this.width + (x - 1);
    const idxY1 = (y + 1) * this.width + x;
    const idxY2 = (y - 1) * this.width + x;

    const dudx = (velocityX[idxX1] - velocityX[idxX2]) / 2;
    const dudy = (velocityX[idxY1] - velocityX[idxY2]) / 2;
    const dvdx = (velocityY[idxX1] - velocityY[idxX2]) / 2;
    const dvdy = (velocityY[idxY1] - velocityY[idxY2]) / 2;

    const shearRate = Math.sqrt(2 * (dudx * dudx + dvdy * dvdy) + (dudy + dvdx) * (dudy + dvdx));

    return shearRate;
  }

  private detectSinkMarks(flowField: FlowFieldData, snapshotId: string): Defect[] {
    const defects: Defect[] = [];
    const { density, temperature } = flowField;

    for (let y = 2; y < this.height - 2; y++) {
      for (let x = 2; x < this.width - 2; x++) {
        const idx = y * this.width + x;

        if (this.mask[idx] === 1 || density[idx] < 0.5) continue;

        let nearWall = false;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
              if (this.mask[ny * this.width + nx] === 1) {
                nearWall = true;
                break;
              }
            }
          }
          if (nearWall) break;
        }

        if (!nearWall) continue;

        const densityGradient = this.calculateDensityGradient(x, y, density);

        if (densityGradient > 0.02 && temperature[idx] < 150) {
          const wallDist = this.moldWallDistance(x, y);
          const severity = Math.min(1, densityGradient * 20 + (1 / (wallDist + 1)) * 0.2);

          defects.push({
            id: '',
            snapshotId,
            type: 'sink_mark',
            severity,
            position: { x, y },
            description: `缩痕 - 密度梯度: ${densityGradient.toFixed(4)}`,
            confidence: 0.6,
          });
        }
      }
    }

    return this.suppressNearbyDefects(defects, 6);
  }

  private calculateDensityGradient(x: number, y: number, density: Float32Array): number {
    let maxGradient = 0;

    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          const nidx = ny * this.width + nx;
          if (this.mask[nidx] === 0) {
            const gradient = Math.abs(density[y * this.width + x] - density[nidx]);
            maxGradient = Math.max(maxGradient, gradient);
          }
        }
      }
    }

    return maxGradient;
  }

  private moldWallDistance(x: number, y: number): number {
    let minDist = Infinity;

    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          if (this.mask[ny * this.width + nx] === 1) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            minDist = Math.min(minDist, dist);
          }
        }
      }
    }

    return minDist === Infinity ? 0 : minDist;
  }

  private suppressNearbyDefects(defects: Defect[], minDistance: number): Defect[] {
    if (defects.length <= 1) return defects;

    const sorted = [...defects].sort((a, b) => b.severity - a.severity);
    const result: Defect[] = [];

    for (const defect of sorted) {
      let shouldKeep = true;

      for (const kept of result) {
        const dx = defect.position.x - kept.position.x;
        const dy = defect.position.y - kept.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          shouldKeep = false;
          break;
        }
      }

      if (shouldKeep) {
        result.push(defect);
      }
    }

    return result;
  }

  public updateConfig(config: Partial<DefectDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export function getDefectTypeName(type: DefectType): string {
  const names: Record<DefectType, string> = {
    weld_line: '熔接痕',
    air_trap: '气泡',
    short_shot: '短射',
    burn_mark: '焦烧',
    sink_mark: '缩痕',
  };
  return names[type];
}

export function getDefectTypeColor(type: DefectType): string {
  const colors: Record<DefectType, string> = {
    weld_line: '#F97316',
    air_trap: '#06B6D4',
    short_shot: '#EF4444',
    burn_mark: '#F59E0B',
    sink_mark: '#8B5CF6',
  };
  return colors[type];
}
