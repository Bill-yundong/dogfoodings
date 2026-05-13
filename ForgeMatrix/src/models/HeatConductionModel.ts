import { TemperaturePoint, StressPoint, ProcessParams } from '../types';

export class AsyncHeatConductionModel {
  private params: ProcessParams;
  private grid: TemperaturePoint[][][];
  private gridSize: number;

  constructor(params: ProcessParams) {
    this.params = params;
    this.gridSize = params.gridSize;
    this.grid = this.initializeGrid();
  }

  private initializeGrid(): TemperaturePoint[][][] {
    const grid: TemperaturePoint[][][] = [];
    for (let i = 0; i < this.gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        grid[i][j] = [];
        for (let k = 0; k < this.gridSize; k++) {
          grid[i][j][k] = {
            x: i,
            y: j,
            z: k,
            temperature: this.params.ambientTemperature,
            timestamp: Date.now()
          };
        }
      }
    }
    return grid;
  }

  setInitialTemperature(temp: number): void {
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        for (let k = 0; k < this.gridSize; k++) {
          this.grid[i][j][k].temperature = temp;
        }
      }
    }
  }

  async simulateStepAsync(): Promise<TemperaturePoint[][]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newGrid = this.cloneGrid();
        const alpha = this.params.materialConductivity / 
                      (this.params.density * this.params.specificHeat);
        const dx = 1;

        for (let i = 1; i < this.gridSize - 1; i++) {
          for (let j = 1; j < this.gridSize - 1; j++) {
            for (let k = 1; k < this.gridSize - 1; k++) {
              const laplacian = 
                (this.grid[i + 1][j][k].temperature - 2 * this.grid[i][j][k].temperature + this.grid[i - 1][j][k].temperature) / (dx * dx) +
                (this.grid[i][j + 1][k].temperature - 2 * this.grid[i][j][k].temperature + this.grid[i][j - 1][k].temperature) / (dx * dx) +
                (this.grid[i][j][k + 1].temperature - 2 * this.grid[i][j][k].temperature + this.grid[i][j][k - 1].temperature) / (dx * dx);

              newGrid[i][j][k].temperature = this.grid[i][j][k].temperature + 
                alpha * this.params.timeStep * laplacian;
              newGrid[i][j][k].timestamp = Date.now();
            }
          }
        }

        this.applyBoundaryConditions(newGrid);
        this.grid = newGrid;

        resolve(this.getTemperatureSlice());
      }, 10);
    });
  }

  private applyBoundaryConditions(grid: TemperaturePoint[][][]): void {
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        for (let k = 0; k < this.gridSize; k++) {
          if (i === 0 || i === this.gridSize - 1 || 
              j === 0 || j === this.gridSize - 1 || 
              k === 0 || k === this.gridSize - 1) {
            const surfaceTemp = grid[i][j][k].temperature;
            const heatLoss = this.params.convectionCoefficient * 
              (surfaceTemp - this.params.ambientTemperature) * this.params.timeStep;
            grid[i][j][k].temperature -= heatLoss / 
              (this.params.density * this.params.specificHeat);
          }
        }
      }
    }
  }

  private cloneGrid(): TemperaturePoint[][][] {
    const newGrid: TemperaturePoint[][][] = [];
    for (let i = 0; i < this.gridSize; i++) {
      newGrid[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        newGrid[i][j] = [];
        for (let k = 0; k < this.gridSize; k++) {
          newGrid[i][j][k] = { ...this.grid[i][j][k] };
        }
      }
    }
    return newGrid;
  }

  getTemperatureSlice(zIndex: number = Math.floor(this.gridSize / 2)): TemperaturePoint[][] {
    const slice: TemperaturePoint[][] = [];
    for (let i = 0; i < this.gridSize; i++) {
      slice[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        slice[i][j] = { ...this.grid[i][j][zIndex] };
      }
    }
    return slice;
  }

  getAllTemperatures(): TemperaturePoint[] {
    const points: TemperaturePoint[] = [];
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        for (let k = 0; k < this.gridSize; k++) {
          points.push({ ...this.grid[i][j][k] });
        }
      }
    }
    return points;
  }

  calculateCoolingRate(previousTemp: number, currentTemp: number): number {
    return (previousTemp - currentTemp) / this.params.timeStep;
  }

  predictStressDistribution(): StressPoint[] {
    const stressPoints: StressPoint[] = [];
    const elasticModulus = 200e9;
    const thermalExpansionCoeff = 12e-6;
    const poissonsRatio = 0.3;

    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        for (let k = 0; k < this.gridSize; k++) {
          const deltaT = this.grid[i][j][k].temperature - this.params.ambientTemperature;
          const thermalStrain = thermalExpansionCoeff * deltaT;
          const stress = (elasticModulus / (1 - 2 * poissonsRatio)) * thermalStrain;

          stressPoints.push({
            x: i,
            y: j,
            z: k,
            stress: Math.abs(stress),
            principalStress: [stress * 0.8, stress * 0.5, stress * 0.3]
          });
        }
      }
    }
    return stressPoints;
  }

  getAverageTemperature(): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        for (let k = 0; k < this.gridSize; k++) {
          sum += this.grid[i][j][k].temperature;
          count++;
        }
      }
    }
    return sum / count;
  }

  getMaxTemperature(): number {
    let max = -Infinity;
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        for (let k = 0; k < this.gridSize; k++) {
          max = Math.max(max, this.grid[i][j][k].temperature);
        }
      }
    }
    return max;
  }

  getMinTemperature(): number {
    let min = Infinity;
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        for (let k = 0; k < this.gridSize; k++) {
          min = Math.min(min, this.grid[i][j][k].temperature);
        }
      }
    }
    return min;
  }

  updateParams(params: Partial<ProcessParams>): void {
    this.params = { ...this.params, ...params };
  }
}
