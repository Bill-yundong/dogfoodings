import type {
  WaterQualityParam,
  SpatialCoordinate,
  HydrodynamicField,
  MonitoringPoint,
  ChemicalDriftTrajectory,
  DriftSimulationConfig,
} from '../types/hydrodynamics';

export class WaterQualityCalculator {
  private static readonly STANDARDS = {
    pH: { min: 6.5, max: 8.5, weight: 0.15 },
    turbidity: { max: 5, weight: 0.1 },
    dissolvedOxygen: { min: 6, weight: 0.2 },
    temperature: { max: 35, weight: 0.05 },
    conductivity: { max: 1500, weight: 0.1 },
    ammoniaNitrogen: { max: 0.5, weight: 0.15 },
    totalPhosphorus: { max: 0.1, weight: 0.1 },
    chemicalOxygenDemand: { max: 15, weight: 0.15 },
  };

  static calculateQualityScore(params: WaterQualityParam): number {
    let score = 0;
    let totalWeight = 0;

    for (const [key, config] of Object.entries(this.STANDARDS)) {
      const value = params[key as keyof WaterQualityParam];
      const weight = config.weight;
      totalWeight += weight;

      if ('min' in config && value < config.min) {
        score += weight * Math.max(0, value / config.min);
      } else if ('max' in config && value > config.max) {
        score += weight * Math.max(0, 1 - (value - config.max) / config.max);
      } else {
        score += weight;
      }
    }

    return (score / totalWeight) * 100;
  }

  static getStatusFromScore(score: number): MonitoringPoint['status'] {
    if (score >= 80) return 'normal';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'critical';
    return 'offline';
  }

  static interpolateQuality(
    points: WaterQualityParam[],
    weights: number[]
  ): WaterQualityParam {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    return {
      pH: this.weightedSum(points.map((p) => p.pH), normalizedWeights),
      turbidity: this.weightedSum(points.map((p) => p.turbidity), normalizedWeights),
      dissolvedOxygen: this.weightedSum(
        points.map((p) => p.dissolvedOxygen),
        normalizedWeights
      ),
      temperature: this.weightedSum(
        points.map((p) => p.temperature),
        normalizedWeights
      ),
      conductivity: this.weightedSum(
        points.map((p) => p.conductivity),
        normalizedWeights
      ),
      ammoniaNitrogen: this.weightedSum(
        points.map((p) => p.ammoniaNitrogen),
        normalizedWeights
      ),
      totalPhosphorus: this.weightedSum(
        points.map((p) => p.totalPhosphorus),
        normalizedWeights
      ),
      chemicalOxygenDemand: this.weightedSum(
        points.map((p) => p.chemicalOxygenDemand),
        normalizedWeights
      ),
    };
  }

  private static weightedSum(values: number[], weights: number[]): number {
    return values.reduce((sum, value, i) => sum + value * weights[i], 0);
  }
}

export class SpatialInterpolator {
  static inverseDistanceWeighting(
    target: SpatialCoordinate,
    points: { coordinate: SpatialCoordinate; value: number }[],
    power = 2
  ): number {
    let numerator = 0;
    let denominator = 0;

    for (const point of points) {
      const distance = this.euclideanDistance(target, point.coordinate);
      if (distance === 0) return point.value;

      const weight = 1 / Math.pow(distance, power);
      numerator += weight * point.value;
      denominator += weight;
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  static krigingInterpolation(
    target: SpatialCoordinate,
    points: { coordinate: SpatialCoordinate; value: number }[]
  ): number {
    if (points.length === 0) return 0;
    if (points.length === 1) return points[0].value;

    const distances = points.map((p) => this.euclideanDistance(target, p.coordinate));
    const variogram = this.calculateVariogram(points);

    let totalWeight = 0;
    let result = 0;

    for (let i = 0; i < points.length; i++) {
      const weight = 1 / (1 + variogram(distances[i]));
      totalWeight += weight;
      result += weight * points[i].value;
    }

    return result / totalWeight;
  }

  private static euclideanDistance(a: SpatialCoordinate, b: SpatialCoordinate): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
  }

  private static calculateVariogram(
    points: { coordinate: SpatialCoordinate; value: number }[]
  ): (distance: number) => number {
    const values = points.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const range = Math.sqrt(
      points.reduce((max, _, i) => {
        for (let j = i + 1; j < points.length; j++) {
          const d = this.euclideanDistance(points[i].coordinate, points[j].coordinate);
          max = Math.max(max, d);
        }
        return max;
      }, 0)
    );

    return (distance: number) => {
      if (distance === 0) return 0;
      return variance * (1.5 * (distance / range) - 0.5 * Math.pow(distance / range, 3));
    };
  }
}

export class ChemicalDriftSimulator {
  simulate(
    trajectory: ChemicalDriftTrajectory,
    field: HydrodynamicField,
    config: DriftSimulationConfig
  ): ChemicalDriftTrajectory {
    const newPositions: SpatialCoordinate[] = [...trajectory.positions];
    const newTimestamps: number[] = [...trajectory.timestamps];
    let currentPosition = { ...trajectory.currentPosition };
    let concentration = trajectory.concentration;

    const dt = field.time.timeStep;
    const gridIndex = this.getGridIndex(currentPosition, field);
    const velocity = this.getVelocityAtGrid(field, gridIndex);

    for (let step = 0; step < config.timeSteps; step++) {
      const advection = this.calculateAdvection(
        velocity,
        config.advectionCoefficient,
        dt
      );

      const diffusion = this.calculateDiffusion(
        config.diffusionCoefficient,
        dt
      );

      currentPosition = {
        x: currentPosition.x + advection.x + diffusion.x,
        y: currentPosition.y + advection.y + diffusion.y,
        z: currentPosition.z + advection.z + diffusion.z,
      };

      concentration *= 1 - config.decayRate * dt;

      this.applyBoundaryConditions(currentPosition, config.boundaryConditions);

      newPositions.push({ ...currentPosition });
      newTimestamps.push(field.time.timestamp + (step + 1) * dt);
    }

    return {
      ...trajectory,
      currentPosition,
      concentration,
      positions: newPositions,
      timestamps: newTimestamps,
      riskLevel: this.calculateRiskLevel(concentration),
    };
  }

  private getGridIndex(
    position: SpatialCoordinate,
    field: HydrodynamicField
  ): { ix: number; iy: number; iz: number } {
    return {
      ix: Math.floor(position.x / field.cellSize),
      iy: Math.floor(position.y / field.cellSize),
      iz: Math.floor(position.z / field.cellSize),
    };
  }

  private getVelocityAtGrid(
    field: HydrodynamicField,
    index: { ix: number; iy: number; iz: number }
  ): SpatialCoordinate {
    const { ix, iy, iz } = index;
    const { x: nx, y: ny, z: nz } = field.gridSize;

    const clampedIx = Math.max(0, Math.min(nx - 1, ix));
    const clampedIy = Math.max(0, Math.min(ny - 1, iy));
    const clampedIz = Math.max(0, Math.min(nz - 1, iz));

    const baseIndex = (clampedIz * ny + clampedIy) * nx + clampedIx;
    const vectorIndex = baseIndex * 3;

    return {
      x: field.velocityField[vectorIndex] || 0,
      y: field.velocityField[vectorIndex + 1] || 0,
      z: field.velocityField[vectorIndex + 2] || 0,
    };
  }

  private calculateAdvection(
    velocity: SpatialCoordinate,
    coefficient: number,
    dt: number
  ): SpatialCoordinate {
    return {
      x: velocity.x * coefficient * dt,
      y: velocity.y * coefficient * dt,
      z: velocity.z * coefficient * dt,
    };
  }

  private calculateDiffusion(coefficient: number, dt: number): SpatialCoordinate {
    const random = () => (Math.random() - 0.5) * 2;
    const sqrtDt = Math.sqrt(dt);

    return {
      x: coefficient * random() * sqrtDt,
      y: coefficient * random() * sqrtDt,
      z: coefficient * random() * sqrtDt,
    };
  }

  private applyBoundaryConditions(
    position: SpatialCoordinate,
    conditions: DriftSimulationConfig['boundaryConditions']
  ): void {
    for (const condition of conditions) {
      const inRegion =
        position.x >= condition.region.min.x &&
        position.x <= condition.region.max.x &&
        position.y >= condition.region.min.y &&
        position.y <= condition.region.max.y &&
        position.z >= condition.region.min.z &&
        position.z <= condition.region.max.z;

      if (inRegion) {
        if (condition.type === 'dirichlet') {
          position.x = Math.max(condition.region.min.x, Math.min(condition.region.max.x, position.x));
          position.y = Math.max(condition.region.min.y, Math.min(condition.region.max.y, position.y));
          position.z = Math.max(condition.region.min.z, Math.min(condition.region.max.z, position.z));
        }
      }
    }
  }

  private calculateRiskLevel(concentration: number): ChemicalDriftTrajectory['riskLevel'] {
    if (concentration > 0.8) return 'extreme';
    if (concentration > 0.5) return 'high';
    if (concentration > 0.2) return 'medium';
    return 'low';
  }
}

export class HydrodynamicFieldGenerator {
  static generateEmptyField(
    gridSize: { x: number; y: number; z: number },
    cellSize: number,
    timestamp: number
  ): HydrodynamicField {
    const totalCells = gridSize.x * gridSize.y * gridSize.z;

    return {
      gridSize,
      cellSize,
      velocityField: new Float32Array(totalCells * 3),
      pressureField: new Float32Array(totalCells),
      concentrationField: new Float32Array(totalCells),
      time: {
        timestamp,
        timeStep: 1,
      },
    };
  }

  static initializeVelocityField(
    field: HydrodynamicField,
    baseVelocity: SpatialCoordinate
  ): HydrodynamicField {
    const { x: nx, y: ny, z: nz } = field.gridSize;

    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          const index = (iz * ny + iy) * nx + ix;
          const vectorIndex = index * 3;

          const turbulence = (Math.random() - 0.5) * 0.1;
          field.velocityField[vectorIndex] = baseVelocity.x + turbulence;
          field.velocityField[vectorIndex + 1] = baseVelocity.y + turbulence;
          field.velocityField[vectorIndex + 2] = baseVelocity.z + turbulence;
        }
      }
    }

    return field;
  }

  static updateFieldFromMonitoringPoints(
    field: HydrodynamicField,
    points: MonitoringPoint[]
  ): HydrodynamicField {
    for (const point of points) {
      const gridIndex = this.getGridIndex(point.coordinate, field);
      const { ix, iy, iz } = gridIndex;

      if (this.isValidIndex(gridIndex, field.gridSize)) {
        const baseIndex = (iz * field.gridSize.y + iy) * field.gridSize.x + ix;
        const vectorIndex = baseIndex * 3;

        field.velocityField[vectorIndex] = point.velocity.x;
        field.velocityField[vectorIndex + 1] = point.velocity.y;
        field.velocityField[vectorIndex + 2] = point.velocity.z;
        field.pressureField[baseIndex] = point.pressure;
        field.concentrationField[baseIndex] = WaterQualityCalculator.calculateQualityScore(
          point.waterQuality
        );
      }
    }

    return this.smoothField(field);
  }

  private static getGridIndex(
    coordinate: SpatialCoordinate,
    field: HydrodynamicField
  ): { ix: number; iy: number; iz: number } {
    return {
      ix: Math.floor(coordinate.x / field.cellSize),
      iy: Math.floor(coordinate.y / field.cellSize),
      iz: Math.floor(coordinate.z / field.cellSize),
    };
  }

  private static isValidIndex(
    index: { ix: number; iy: number; iz: number },
    gridSize: { x: number; y: number; z: number }
  ): boolean {
    return (
      index.ix >= 0 &&
      index.ix < gridSize.x &&
      index.iy >= 0 &&
      index.iy < gridSize.y &&
      index.iz >= 0 &&
      index.iz < gridSize.z
    );
  }

  private static smoothField(field: HydrodynamicField): HydrodynamicField {
    const { x: nx, y: ny, z: nz } = field.gridSize;
    const kernelSize = 3;
    const offset = Math.floor(kernelSize / 2);

    const newVelocityField = new Float32Array(field.velocityField);
    const newPressureField = new Float32Array(field.pressureField);
    const newConcentrationField = new Float32Array(field.concentrationField);

    for (let iz = offset; iz < nz - offset; iz++) {
      for (let iy = offset; iy < ny - offset; iy++) {
        for (let ix = offset; ix < nx - offset; ix++) {
          const baseIndex = (iz * ny + iy) * nx + ix;
          const vectorIndex = baseIndex * 3;

          let vxSum = 0,
            vySum = 0,
            vzSum = 0,
            pSum = 0,
            cSum = 0,
            count = 0;

          for (let kz = -offset; kz <= offset; kz++) {
            for (let ky = -offset; ky <= offset; ky++) {
              for (let kx = -offset; kx <= offset; kx++) {
                const neighborIndex =
                  ((iz + kz) * ny + (iy + ky)) * nx + (ix + kx);
                const neighborVectorIndex = neighborIndex * 3;

                vxSum += field.velocityField[neighborVectorIndex];
                vySum += field.velocityField[neighborVectorIndex + 1];
                vzSum += field.velocityField[neighborVectorIndex + 2];
                pSum += field.pressureField[neighborIndex];
                cSum += field.concentrationField[neighborIndex];
                count++;
              }
            }
          }

          newVelocityField[vectorIndex] = vxSum / count;
          newVelocityField[vectorIndex + 1] = vySum / count;
          newVelocityField[vectorIndex + 2] = vzSum / count;
          newPressureField[baseIndex] = pSum / count;
          newConcentrationField[baseIndex] = cSum / count;
        }
      }
    }

    return {
      ...field,
      velocityField: newVelocityField,
      pressureField: newPressureField,
      concentrationField: newConcentrationField,
    };
  }
}
