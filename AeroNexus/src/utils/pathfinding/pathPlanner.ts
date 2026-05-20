import type { Position, PathPoint } from '@/types';
import { getDynamicsParams, type DynamicsParams } from '../dynamics/multiBodyDynamics';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
  heading: number;
}

interface Obstacle {
  x: number;
  y: number;
  radius: number;
}

interface PathPlanningConfig {
  gridSize: number;
  maxIterations: number;
  connectionRadius: number;
  safetyMargin: number;
  smoothingIterations: number;
}

const DEFAULT_CONFIG: PathPlanningConfig = {
  gridSize: 0.5,
  maxIterations: 10000,
  connectionRadius: 5.0,
  safetyMargin: 1.0,
  smoothingIterations: 50,
};

export class PathPlanner {
  private config: PathPlanningConfig;
  private dynamicsParams: DynamicsParams;

  constructor(equipmentType: string, config?: Partial<PathPlanningConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dynamicsParams = getDynamicsParams(equipmentType);
  }

  planPath(
    start: Position,
    goal: Position,
    obstacles: Obstacle[]
  ): PathPoint[] | null {
    const path = this.aStarSearch(start, goal, obstacles);
    
    if (!path) return null;
    
    const smoothedPath = this.smoothPath(path, obstacles);
    const timeStampedPath = this.addTimeStamps(smoothedPath);
    
    return timeStampedPath;
  }

  private aStarSearch(
    start: Position,
    goal: Position,
    obstacles: Obstacle[]
  ): Position[] | null {
    const { gridSize, maxIterations } = this.config;
    
    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, goal),
      f: this.heuristic(start, goal),
      parent: null,
      heading: start.heading,
    };
    
    const openSet: Node[] = [startNode];
    const closedSet = new Set<string>();
    
    const getKey = (x: number, y: number) => `${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`;
    
    let iterations = 0;
    
    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;
      
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      
      if (this.isAtGoal(current, goal)) {
        return this.reconstructPath(current);
      }
      
      const currentKey = getKey(current.x, current.y);
      closedSet.add(currentKey);
      
      const neighbors = this.getNeighbors(current, goal, obstacles);
      
      for (const neighbor of neighbors) {
        const neighborKey = getKey(neighbor.x, neighbor.y);
        
        if (closedSet.has(neighborKey)) continue;
        
        const existingNode = openSet.find(
          (n) => getKey(n.x, n.y) === neighborKey
        );
        
        if (!existingNode) {
          openSet.push(neighbor);
        } else if (neighbor.g < existingNode.g) {
          existingNode.g = neighbor.g;
          existingNode.f = neighbor.f;
          existingNode.parent = neighbor.parent;
          existingNode.heading = neighbor.heading;
        }
      }
    }
    
    return null;
  }

  private heuristic(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private isAtGoal(node: Node, goal: Position): boolean {
    const dx = node.x - goal.x;
    const dy = node.y - goal.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.config.gridSize * 2;
  }

  private reconstructPath(goalNode: Node): Position[] {
    const path: Position[] = [];
    let current: Node | null = goalNode;
    
    while (current) {
      path.unshift({
        x: current.x,
        y: current.y,
        heading: current.heading,
      });
      current = current.parent;
    }
    
    return path;
  }

  private getNeighbors(
    current: Node,
    goal: Position,
    obstacles: Obstacle[]
  ): Node[] {
    const { gridSize, safetyMargin } = this.config;
    const { maxSteeringAngle, wheelBase } = this.dynamicsParams;
    
    const neighbors: Node[] = [];
    const directions = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: -1 },
    ];
    
    for (const dir of directions) {
      const newX = current.x + dir.dx * gridSize;
      const newY = current.y + dir.dy * gridSize;
      
      let collision = false;
      for (const obs of obstacles) {
        const dx = newX - obs.x;
        const dy = newY - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < obs.radius + safetyMargin) {
          collision = true;
          break;
        }
      }
      
      if (collision) continue;
      
      const moveCost = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy) * gridSize;
      const newHeading = Math.atan2(dir.dy, dir.dx);
      const headingDiff = Math.abs(this.normalizeAngle(newHeading - current.heading));
      
      const curvaturePenalty = headingDiff > maxSteeringAngle ? headingDiff * 2 : 0;
      
      const g = current.g + moveCost + curvaturePenalty;
      const h = this.heuristic({ x: newX, y: newY, heading: newHeading }, goal);
      
      neighbors.push({
        x: newX,
        y: newY,
        g,
        h,
        f: g + h,
        parent: current,
        heading: newHeading,
      });
    }
    
    return neighbors;
  }

  private smoothPath(path: Position[], obstacles: Obstacle[]): Position[] {
    if (path.length < 3) return path;
    
    const { smoothingIterations, safetyMargin } = this.config;
    let smoothed = [...path];
    
    for (let iter = 0; iter < smoothingIterations; iter++) {
      const newPath = [...smoothed];
      
      for (let i = 1; i < smoothed.length - 1; i++) {
        const prev = smoothed[i - 1];
        const curr = smoothed[i];
        const next = smoothed[i + 1];
        
        const newX = (prev.x + 2 * curr.x + next.x) / 4;
        const newY = (prev.y + 2 * curr.y + next.y) / 4;
        
        let collision = false;
        for (const obs of obstacles) {
          const dx = newX - obs.x;
          const dy = newY - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < obs.radius + safetyMargin) {
            collision = true;
            break;
          }
        }
        
        if (!collision) {
          newPath[i] = {
            x: newX,
            y: newY,
            heading: Math.atan2(next.y - prev.y, next.x - prev.x),
          };
        }
      }
      
      smoothed = newPath;
    }
    
    return smoothed;
  }

  private addTimeStamps(path: Position[]): PathPoint[] {
    const { maxSpeed, maxAcceleration } = this.dynamicsParams;
    const timeStamped: PathPoint[] = [];
    
    let currentSpeed = 0;
    let totalTime = 0;
    
    timeStamped.push({
      x: path[0].x,
      y: path[0].y,
      t: 0,
      v: 0,
    });
    
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const targetSpeed = Math.min(maxSpeed, Math.sqrt(2 * maxAcceleration * distance) + currentSpeed);
      const avgSpeed = (currentSpeed + targetSpeed) / 2;
      const segmentTime = distance / avgSpeed;
      
      totalTime += segmentTime;
      
      timeStamped.push({
        x: curr.x,
        y: curr.y,
        t: totalTime,
        v: targetSpeed,
      });
      
      currentSpeed = targetSpeed;
    }
    
    return timeStamped;
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  optimizeForDynamicObstacles(
    path: PathPoint[],
    dynamicObstacles: { position: Position; velocity: { x: number; y: number } }[],
    horizon: number
  ): PathPoint[] {
    const optimizedPath = [...path];
    const { safetyMargin } = this.config;
    
    for (let i = 0; i < optimizedPath.length; i++) {
      const point = optimizedPath[i];
      const t = point.t;
      
      if (t > horizon) break;
      
      for (const obs of dynamicObstacles) {
        const futureX = obs.position.x + obs.velocity.x * t;
        const futureY = obs.position.y + obs.velocity.y * t;
        
        const dx = point.x - futureX;
        const dy = point.y - futureY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < safetyMargin * 2) {
          const pushX = (dx / dist) * safetyMargin * 2;
          const pushY = (dy / dist) * safetyMargin * 2;
          optimizedPath[i] = {
            ...point,
            x: futureX + pushX,
            y: futureY + pushY,
          };
        }
      }
    }
    
    return optimizedPath;
  }
}

export function createPathPlanner(
  equipmentType: string,
  config?: Partial<PathPlanningConfig>
): PathPlanner {
  return new PathPlanner(equipmentType, config);
}
