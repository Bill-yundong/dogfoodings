import type { Vector3, Obstacle, PathPoint, PotentialFieldConfig, PlannedPath } from "@/types";

const DEFAULT_CONFIG: PotentialFieldConfig = {
  attractiveGain: 0.8,
  repulsiveGain: 15.0,
  influenceDistance: 2.5,
  stepSize: 0.05,
  maxIterations: 500,
  goalThreshold: 0.08,
};

function vectorSub(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vectorAdd(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function vectorScale(v: Vector3, s: number): Vector3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vectorMagnitude(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vectorNormalize(v: Vector3): Vector3 {
  const mag = vectorMagnitude(v);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return vectorScale(v, 1 / mag);
}

function vectorDistance(a: Vector3, b: Vector3): number {
  return vectorMagnitude(vectorSub(a, b));
}

function calculateObstacleDistance(point: Vector3, obstacle: Obstacle): { distance: number; closestPoint: Vector3 } {
  const halfSize = vectorScale(obstacle.size, 0.5);
  const min = vectorSub(obstacle.position, halfSize);
  const max = vectorAdd(obstacle.position, halfSize);

  const closest: Vector3 = {
    x: Math.max(min.x, Math.min(point.x, max.x)),
    y: Math.max(min.y, Math.min(point.y, max.y)),
    z: Math.max(min.z, Math.min(point.z, max.z)),
  };

  return {
    distance: vectorDistance(point, closest),
    closestPoint: closest,
  };
}

function calculateAttractiveForce(current: Vector3, goal: Vector3, gain: number): Vector3 {
  const direction = vectorSub(goal, current);
  const distance = vectorMagnitude(direction);
  const normalized = vectorNormalize(direction);
  return vectorScale(normalized, gain * Math.min(distance, 1.0));
}

function calculateRepulsiveForce(
  current: Vector3,
  obstacles: Obstacle[],
  config: PotentialFieldConfig
): Vector3 {
  let totalForce: Vector3 = { x: 0, y: 0, z: 0 };

  for (const obstacle of obstacles) {
    const { distance, closestPoint } = calculateObstacleDistance(current, obstacle);

    if (distance < config.influenceDistance && distance > 0.001) {
      const influence = config.influenceDistance;
      const repulsionStrength =
        config.repulsiveGain * (1 / distance - 1 / influence) * (1 / (distance * distance));

      const direction = vectorSub(current, closestPoint);
      const normalized = vectorNormalize(direction);

      totalForce = vectorAdd(totalForce, vectorScale(normalized, repulsionStrength));
    }
  }

  return totalForce;
}

function calculateTotalForce(
  current: Vector3,
  goal: Vector3,
  obstacles: Obstacle[],
  config: PotentialFieldConfig
): { force: Vector3; potential: number } {
  const attractive = calculateAttractiveForce(current, goal, config.attractiveGain);
  const repulsive = calculateRepulsiveForce(current, obstacles, config);
  const totalForce = vectorAdd(attractive, repulsive);

  const goalDist = vectorDistance(current, goal);
  const attractivePotential = 0.5 * config.attractiveGain * goalDist * goalDist;

  let repulsivePotential = 0;
  for (const obstacle of obstacles) {
    const { distance } = calculateObstacleDistance(current, obstacle);
    if (distance < config.influenceDistance) {
      const influence = config.influenceDistance;
      repulsivePotential += 0.5 * config.repulsiveGain * Math.pow(1 / distance - 1 / influence, 2);
    }
  }

  return {
    force: totalForce,
    potential: attractivePotential + repulsivePotential,
  };
}

export async function planPathAsync(
  robotId: string,
  start: Vector3,
  goal: Vector3,
  obstacles: Obstacle[],
  customConfig?: Partial<PotentialFieldConfig>
): Promise<PlannedPath> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const points: PathPoint[] = [];
  let current = { ...start };
  const startTime = Date.now();

  points.push({
    position: { ...current },
    timestamp: startTime,
    potential: 0,
  });

  for (let iteration = 0; iteration < config.maxIterations; iteration++) {
    if (iteration % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const distanceToGoal = vectorDistance(current, goal);
    if (distanceToGoal < config.goalThreshold) {
      points.push({
        position: { ...goal },
        timestamp: Date.now(),
        potential: 0,
      });
      break;
    }

    const { force, potential } = calculateTotalForce(current, goal, obstacles, config);
    const forceMag = vectorMagnitude(force);

    if (forceMag < 0.001) {
      const randomEscape: Vector3 = {
        x: (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.1,
        z: (Math.random() - 0.5) * 0.1,
      };
      current = vectorAdd(current, randomEscape);
      continue;
    }

    const normalizedForce = vectorNormalize(force);
    const step = vectorScale(normalizedForce, config.stepSize);
    current = vectorAdd(current, step);

    points.push({
      position: { ...current },
      timestamp: Date.now(),
      potential,
    });
  }

  const estimatedEndTime = startTime + (points.length - 1) * 50;

  return {
    robotId,
    points,
    startTime,
    estimatedEndTime,
    status: points.length < config.maxIterations ? "completed" : "aborted",
  };
}

export function smoothPath(points: PathPoint[], windowSize: number = 3): PathPoint[] {
  if (points.length < windowSize) return points;

  const smoothed: PathPoint[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < points.length; i++) {
    let sumX = 0,
      sumY = 0,
      sumZ = 0,
      count = 0;

    for (let j = Math.max(0, i - halfWindow); j <= Math.min(points.length - 1, i + halfWindow); j++) {
      sumX += points[j].position.x;
      sumY += points[j].position.y;
      sumZ += points[j].position.z;
      count++;
    }

    smoothed.push({
      position: {
        x: sumX / count,
        y: sumY / count,
        z: sumZ / count,
      },
      timestamp: points[i].timestamp,
      potential: points[i].potential,
    });
  }

  return smoothed;
}

export function checkPathCollision(
  points: PathPoint[],
  obstacles: Obstacle[],
  safeDistance: number = 0.3
): boolean {
  for (const point of points) {
    for (const obstacle of obstacles) {
      const { distance } = calculateObstacleDistance(point.position, obstacle);
      if (distance < safeDistance) {
        return true;
      }
    }
  }
  return false;
}

export class PathPlanner {
  private config: PotentialFieldConfig;

  constructor(customConfig?: Partial<PotentialFieldConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
  }

  updateConfig(customConfig: Partial<PotentialFieldConfig>): void {
    this.config = { ...this.config, ...customConfig };
  }

  getConfig(): PotentialFieldConfig {
    return { ...this.config };
  }

  async plan(
    robotId: string,
    start: Vector3,
    goal: Vector3,
    obstacles: Obstacle[]
  ): Promise<PlannedPath> {
    return planPathAsync(robotId, start, goal, obstacles, this.config);
  }
}
