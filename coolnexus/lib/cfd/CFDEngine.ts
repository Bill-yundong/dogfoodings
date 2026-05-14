import { TemperaturePoint, Rack, PrecisionAC, AirflowRisk } from '../types/datacenter';

export interface CFDConfig {
  gridSize: { x: number; y: number; z: number };
  cellSize: number;
  iterations: number;
  relaxationFactor: number;
}

export class AsyncCFDEngine {
  private config: CFDConfig;
  private temperatureGrid: number[][][] = [];
  private velocityGrid: { x: number; y: number; z: number }[][][] = [];

  constructor(config: Partial<CFDConfig> = {}) {
    this.config = {
      gridSize: { x: 20, y: 10, z: 15 },
      cellSize: 1,
      iterations: 50,
      relaxationFactor: 0.3,
      ...config
    };
  }

  async computeTemperatureField(
    racks: Rack[],
    acs: PrecisionAC[],
    onProgress?: (progress: number) => void
  ): Promise<TemperaturePoint[]> {
    return new Promise((resolve) => {
      this.initializeGrid();
      this.applyBoundaryConditions(racks, acs);

      let iteration = 0;
      const totalIterations = this.config.iterations;

      const performIteration = () => {
        if (iteration < totalIterations) {
          this.performHeatTransferIteration();
          this.updateVelocityField(racks, acs);
          iteration++;
          
          if (iteration % 5 === 0 && onProgress) {
            onProgress((iteration / totalIterations) * 100);
          }
          
          setTimeout(performIteration, 0);
        } else {
          const result = this.generateTemperaturePoints();
          resolve(result);
        }
      };

      setTimeout(performIteration, 0);
    });
  }

  private initializeGrid(): void {
    const { x: sizeX, y: sizeY, z: sizeZ } = this.config.gridSize;
    this.temperatureGrid = [];
    this.velocityGrid = [];

    for (let i = 0; i < sizeX; i++) {
      this.temperatureGrid[i] = [];
      this.velocityGrid[i] = [];
      for (let j = 0; j < sizeY; j++) {
        this.temperatureGrid[i][j] = new Array(sizeZ).fill(24);
        this.velocityGrid[i][j] = new Array(sizeZ).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));
      }
    }
  }

  private applyBoundaryConditions(racks: Rack[], acs: PrecisionAC[]): void {
    const { x: sizeX, y: sizeY, z: sizeZ } = this.config.gridSize;

    racks.forEach(rack => {
      const gridX = Math.floor((rack.position.col / 8) * sizeX);
      const gridZ = Math.floor((rack.position.row / 4) * sizeZ);

      for (let j = 0; j < sizeY; j++) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            const x = Math.min(Math.max(gridX + dx, 0), sizeX - 1);
            const z = Math.min(Math.max(gridZ + dz, 0), sizeZ - 1);
            const heatFactor = 1 - (Math.abs(dx) + Math.abs(dz)) * 0.3;
            this.temperatureGrid[x][j][z] += (rack.outletTemperature - 24) * heatFactor * 0.5;
          }
        }
      }
    });

    acs.forEach(ac => {
      const gridX = Math.floor((ac.position.col / 8) * sizeX);
      const gridZ = Math.floor((ac.position.row / 5) * sizeZ);

      for (let j = 0; j < sizeY; j++) {
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            const x = Math.min(Math.max(gridX + dx, 0), sizeX - 1);
            const z = Math.min(Math.max(gridZ + dz, 0), sizeZ - 1);
            const coolFactor = 1 - (Math.abs(dx) + Math.abs(dz)) * 0.2;
            this.temperatureGrid[x][j][z] -= (24 - ac.supplyTemperature) * coolFactor * 0.4;
          }
        }
      }
    });
  }

  private performHeatTransferIteration(): void {
    const { x: sizeX, y: sizeY, z: sizeZ } = this.config.gridSize;
    const alpha = this.config.relaxationFactor;

    const newTempGrid: number[][][] = JSON.parse(JSON.stringify(this.temperatureGrid));

    for (let i = 1; i < sizeX - 1; i++) {
      for (let j = 1; j < sizeY - 1; j++) {
        for (let k = 1; k < sizeZ - 1; k++) {
          const laplacian = 
            this.temperatureGrid[i + 1][j][k] + this.temperatureGrid[i - 1][j][k] +
            this.temperatureGrid[i][j + 1][k] + this.temperatureGrid[i][j - 1][k] +
            this.temperatureGrid[i][j][k + 1] + this.temperatureGrid[i][j][k - 1] -
            6 * this.temperatureGrid[i][j][k];

          newTempGrid[i][j][k] = this.temperatureGrid[i][j][k] + alpha * laplacian * 0.1;
        }
      }
    }

    this.temperatureGrid = newTempGrid;
  }

  private updateVelocityField(racks: Rack[], acs: PrecisionAC[]): void {
    const { x: sizeX, y: sizeY, z: sizeZ } = this.config.gridSize;

    for (let i = 0; i < sizeX; i++) {
      for (let j = 0; j < sizeY; j++) {
        for (let k = 0; k < sizeZ; k++) {
          let vx = 0, vy = 0, vz = 0;

          acs.forEach(ac => {
            const acX = (ac.position.col / 8) * sizeX;
            const acZ = (ac.position.row / 5) * sizeZ;
            const dist = Math.sqrt((i - acX) ** 2 + (k - acZ) ** 2);
            if (dist < 5) {
              vx += (i - acX) * (1 - dist / 5) * 0.1;
              vz += (k - acZ) * (1 - dist / 5) * 0.1;
              vy += 0.05;
            }
          });

          racks.forEach(rack => {
            const rackX = (rack.position.col / 8) * sizeX;
            const rackZ = (rack.position.row / 4) * sizeZ;
            const dist = Math.sqrt((i - rackX) ** 2 + (k - rackZ) ** 2);
            if (dist < 3) {
              vy -= 0.03;
            }
          });

          this.velocityGrid[i][j][k] = { x: vx, y: vy, z: vz };
        }
      }
    }
  }

  private generateTemperaturePoints(): TemperaturePoint[] {
    const points: TemperaturePoint[] = [];
    const { x: sizeX, y: sizeY, z: sizeZ } = this.config.gridSize;

    for (let i = 0; i < sizeX; i++) {
      for (let j = 0; j < sizeY; j++) {
        for (let k = 0; k < sizeZ; k++) {
          points.push({
            x: i * this.config.cellSize,
            y: j * this.config.cellSize,
            z: k * this.config.cellSize,
            temperature: this.temperatureGrid[i][j][k],
            velocity: this.velocityGrid[i][j][k]
          });
        }
      }
    }

    return points;
  }

  detectAirflowRisks(temperaturePoints: TemperaturePoint[], racks: Rack[]): AirflowRisk[] {
    const risks: AirflowRisk[] = [];
    const threshold = 38;

    const hotSpots = temperaturePoints.filter(p => p.temperature > threshold);
    
    hotSpots.forEach((point, idx) => {
      const nearbyRacks = racks.filter(r => {
        const rackX = r.position.col * 2.5;
        const rackZ = r.position.row * 3;
        return Math.abs(point.x - rackX) < 3 && Math.abs(point.z - rackZ) < 3;
      });

      let type: AirflowRisk['type'] = 'hot_spot';
      let severity: AirflowRisk['severity'] = 'low';

      if (point.temperature > 45) {
        severity = 'critical';
        type = 'short_circuit';
      } else if (point.temperature > 42) {
        severity = 'high';
      } else if (point.temperature > 40) {
        severity = 'medium';
      }

      risks.push({
        id: `risk-${idx}`,
        type,
        severity,
        location: { x: point.x, y: point.y, z: point.z },
        affectedRacks: nearbyRacks.map(r => r.id),
        description: type === 'short_circuit' 
          ? '检测到潜在气流短路风险' 
          : type === 'recirculation' 
            ? '检测到热空气回流' 
            : '局部热点预警',
        temperature: point.temperature
      });
    });

    return risks.slice(0, 10);
  }

  getTemperatureGrid(): number[][][] {
    return this.temperatureGrid;
  }
}
