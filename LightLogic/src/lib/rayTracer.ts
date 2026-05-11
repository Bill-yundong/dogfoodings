import {
  Building,
  LightSource,
  LightPollutionPoint,
  SimulationConfig,
  SimulationResult,
  Ray,
} from './types';

const DEFAULT_CONFIG: SimulationConfig = {
  gridSize: 100,
  maxReflections: 5,
  rayCount: 1000,
  attenuationRate: 0.1,
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class AsyncRayTracer {
  private config: SimulationConfig;
  private buildings: Building[];
  private lightSources: LightSource[];
  private grid: LightPollutionPoint[][];

  constructor(
    buildings: Building[],
    lightSources: LightSource[],
    config: Partial<SimulationConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.buildings = buildings;
    this.lightSources = lightSources;
    this.grid = this.initializeGrid();
  }

  private initializeGrid(): LightPollutionPoint[][] {
    const { gridSize } = this.config;
    const grid: LightPollutionPoint[][] = [];
    const timestamp = Date.now();

    for (let y = 0; y < gridSize; y++) {
      const row: LightPollutionPoint[] = [];
      for (let x = 0; x < gridSize; x++) {
        row.push({
          x,
          y,
          intensity: 0,
          wavelength: 550,
          timestamp,
        });
      }
      grid.push(row);
    }

    return grid;
  }

  private checkBuildingIntersection(
    rayX: number,
    rayY: number,
    dx: number,
    dy: number
  ): { building: Building; hitX: number; hitY: number } | null {
    let closest: {
      building: Building;
      hitX: number;
      hitY: number;
      distance: number;
    } | null = null;

    for (const building of this.buildings) {
      const { x, y, width, height } = building;

      const edges = [
        { x1: x, y1: y, x2: x + width, y2: y },
        {
          x1: x + width,
          y1: y,
          x2: x + width,
          y2: y + height,
        },
        {
          x1: x + width,
          y1: y + height,
          x2: x,
          y2: y + height,
        },
        { x1: x, y1: y + height, x2: x, y2: y },
      ];

      for (const edge of edges) {
        const intersection = this.lineIntersection(
          rayX,
          rayY,
          rayX + dx * 1000,
          rayY + dy * 1000,
          edge.x1,
          edge.y1,
          edge.x2,
          edge.y2
        );

        if (intersection) {
          const distance = Math.sqrt(
            Math.pow(intersection.x - rayX, 2) +
              Math.pow(intersection.y - rayY, 2)
          );

          if (distance > 0.1 && (!closest || distance < closest.distance)) {
            closest = {
              building,
              hitX: intersection.x,
              hitY: intersection.y,
              distance,
            };
          }
        }
      }
    }

    return closest
      ? { building: closest.building, hitX: closest.hitX, hitY: closest.hitY }
      : null;
  }

  private lineIntersection(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number
  ): { x: number; y: number } | null {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      };
    }

    return null;
  }

  private calculateReflection(
    dx: number,
    dy: number,
    building: Building,
    hitX: number,
    hitY: number
  ): { dx: number; dy: number } {
    const { x, y, width, height } = building;
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    let normalX = 0;
    let normalY = 0;

    if (Math.abs(hitX - x) < 0.1) {
      normalX = -1;
    } else if (Math.abs(hitX - (x + width)) < 0.1) {
      normalX = 1;
    } else if (Math.abs(hitY - y) < 0.1) {
      normalY = -1;
    } else if (Math.abs(hitY - (y + height)) < 0.1) {
      normalY = 1;
    } else {
      normalX = hitX - centerX;
      normalY = hitY - centerY;
      const length = Math.sqrt(normalX * normalX + normalY * normalY);
      normalX /= length;
      normalY /= length;
    }

    const dot = dx * normalX + dy * normalY;
    const reflectX = dx - 2 * dot * normalX;
    const reflectY = dy - 2 * dot * normalY;

    const reflectLength = Math.sqrt(
      reflectX * reflectX + reflectY * reflectY
    );

    return {
      dx: reflectX / reflectLength,
      dy: reflectY / reflectLength,
    };
  }

  private async traceRay(
    ray: Ray,
    wavelength: number
  ): Promise<void> {
    let { startX, startY, direction, intensity, reflections, maxReflections } =
      ray;
    let dx = Math.cos(direction);
    let dy = Math.sin(direction);

    while (reflections <= maxReflections) {
      const intersection = this.checkBuildingIntersection(
        startX,
        startY,
        dx,
        dy
      );

      if (intersection) {
        const { building, hitX, hitY } = intersection;

        this.updateGridWithLine(startX, startY, hitX, hitY, intensity, wavelength);

        const reflectivity = building.facadeMaterial.reflectivity;
        const reflectedIntensity = intensity * reflectivity;

        if (reflectedIntensity > 0.01) {
          const reflection = this.calculateReflection(dx, dy, building, hitX, hitY);
          dx = reflection.dx;
          dy = reflection.dy;
          intensity = reflectedIntensity;
          startX = hitX + dx * 0.1;
          startY = hitY + dy * 0.1;
          reflections++;
        } else {
          break;
        }
      } else {
        const endX = startX + dx * this.config.gridSize;
        const endY = startY + dy * this.config.gridSize;
        this.updateGridWithLine(startX, startY, endX, endY, intensity, wavelength);
        break;
      }
    }
  }

  private updateGridWithLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    intensity: number,
    wavelength: number
  ): void {
    const { gridSize, attenuationRate } = this.config;
    const steps = Math.max(
      Math.abs(x2 - x1),
      Math.abs(y2 - y1)
    );
    const dx = (x2 - x1) / Math.max(steps, 1);
    const dy = (y2 - y1) / Math.max(steps, 1);

    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x1 + dx * i);
      const y = Math.round(y1 + dy * i);

      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        const distance = Math.sqrt(
          Math.pow(x - x1, 2) + Math.pow(y - y1, 2)
        );
        const attenuation = Math.exp(-attenuationRate * distance);
        const pointIntensity = intensity * attenuation;

        if (pointIntensity > this.grid[y][x].intensity) {
          this.grid[y][x] = {
            x,
            y,
            intensity: pointIntensity,
            wavelength,
            timestamp: Date.now(),
          };
        }
      }
    }
  }

  private async processLightSource(source: LightSource): Promise<void> {
    const { rayCount, maxReflections } = this.config;
    const rays: Ray[] = [];

    for (let i = 0; i < rayCount; i++) {
      const direction = (2 * Math.PI * i) / rayCount + Math.random() * 0.01;
      rays.push({
        id: generateUUID(),
        startX: source.x,
        startY: source.y,
        direction,
        intensity: source.intensity,
        reflections: 0,
        maxReflections,
      });
    }

    await Promise.all(
      rays.map((ray) => this.traceRay(ray, source.wavelength))
    );
  }

  async runSimulation(): Promise<SimulationResult> {
    const batches = [];
    const batchSize = 10;

    for (let i = 0; i < this.lightSources.length; i += batchSize) {
      const batch = this.lightSources.slice(i, i + batchSize);
      batches.push(batch);
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map((source) => this.processLightSource(source))
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return this.getSimulationResult();
  }

  private getSimulationResult(): SimulationResult {
    const { gridSize } = this.config;
    let totalIntensity = 0;
    const hotspots: LightPollutionPoint[] = [];
    const intensityThreshold = 0.5;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const point = this.grid[y][x];
        totalIntensity += point.intensity;

        if (point.intensity > intensityThreshold) {
          hotspots.push(point);
        }
      }
    }

    hotspots.sort((a, b) => b.intensity - a.intensity);

    return {
      grid: this.grid,
      totalIntensity,
      hotspots: hotspots.slice(0, 100),
      timestamp: Date.now(),
    };
  }
}

export async function runLightPollutionSimulation(
  buildings: Building[],
  lightSources: LightSource[],
  config: Partial<SimulationConfig> = {}
): Promise<SimulationResult> {
  const tracer = new AsyncRayTracer(buildings, lightSources, config);
  return tracer.runSimulation();
}
