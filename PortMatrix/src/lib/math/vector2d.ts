import type { Vector2D } from '@/types';

export class Vector2DUtils {
  static create(x: number = 0, y: number = 0): Vector2D {
    return { x, y };
  }

  static clone(v: Vector2D): Vector2D {
    return { x: v.x, y: v.y };
  }

  static add(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  static sub(a: Vector2D, b: Vector2D): Vector2D {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  static mul(v: Vector2D, scalar: number): Vector2D {
    return { x: v.x * scalar, y: v.y * scalar };
  }

  static div(v: Vector2D, scalar: number): Vector2D {
    return { x: v.x / scalar, y: v.y / scalar };
  }

  static dot(a: Vector2D, b: Vector2D): number {
    return a.x * b.x + a.y * b.y;
  }

  static length(v: Vector2D): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  }

  static lengthSquared(v: Vector2D): number {
    return v.x * v.x + v.y * v.y;
  }

  static distance(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static distanceSquared(a: Vector2D, b: Vector2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  static normalize(v: Vector2D): Vector2D {
    const len = this.length(v);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }

  static limit(v: Vector2D, max: number): Vector2D {
    const lenSq = this.lengthSquared(v);
    if (lenSq > max * max) {
      const ratio = max / Math.sqrt(lenSq);
      return { x: v.x * ratio, y: v.y * ratio };
    }
    return v;
  }

  static setLength(v: Vector2D, len: number): Vector2D {
    const currentLen = this.length(v);
    if (currentLen === 0) return { x: len, y: 0 };
    return { x: (v.x / currentLen) * len, y: (v.y / currentLen) * len };
  }

  static neg(v: Vector2D): Vector2D {
    return { x: -v.x, y: -v.y };
  }

  static lerp(a: Vector2D, b: Vector2D, t: number): Vector2D {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }

  static angle(v: Vector2D): number {
    return Math.atan2(v.y, v.x);
  }

  static fromAngle(angle: number, length: number = 1): Vector2D {
    return {
      x: Math.cos(angle) * length,
      y: Math.sin(angle) * length,
    };
  }

  static rotate(v: Vector2D, angle: number): Vector2D {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos,
    };
  }

  static perpendicular(v: Vector2D): Vector2D {
    return { x: -v.y, y: v.x };
  }

  static reflect(v: Vector2D, normal: Vector2D): Vector2D {
    const d = 2 * this.dot(v, normal);
    return { x: v.x - d * normal.x, y: v.y - d * normal.y };
  }

  static random(minX: number, maxX: number, minY: number, maxY: number): Vector2D {
    return {
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
    };
  }

  static zero(): Vector2D {
    return { x: 0, y: 0 };
  }

  static equals(a: Vector2D, b: Vector2D, epsilon: number = 0.0001): boolean {
    return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
  }

  static toString(v: Vector2D, precision: number = 2): string {
    return `(${v.x.toFixed(precision)}, ${v.y.toFixed(precision)})`;
  }

  static toArray(v: Vector2D): [number, number] {
    return [v.x, v.y];
  }

  static fromArray(arr: [number, number]): Vector2D {
    return { x: arr[0], y: arr[1] };
  }
}

export const V = Vector2DUtils;

export class Geometry {
  static pointInPolygon(point: Vector2D, polygon: Vector2D[]): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if (((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  static distanceToSegment(p: Vector2D, a: Vector2D, b: Vector2D): number {
    const ab = V.sub(b, a);
    const ap = V.sub(p, a);
    const t = Math.max(0, Math.min(1, V.dot(ap, ab) / V.lengthSquared(ab)));
    const projection = V.add(a, V.mul(ab, t));
    return V.distance(p, projection);
  }

  static distanceToPolygon(p: Vector2D, polygon: Vector2D[]): number {
    let minDist = Infinity;
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const dist = this.distanceToSegment(p, a, b);
      minDist = Math.min(minDist, dist);
    }
    return minDist;
  }

  static polygonCenter(polygon: Vector2D[]): Vector2D {
    let cx = 0, cy = 0;
    for (const p of polygon) {
      cx += p.x;
      cy += p.y;
    }
    return { x: cx / polygon.length, y: cy / polygon.length };
  }

  static polygonArea(polygon: Vector2D[]): number {
    let area = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }
    return Math.abs(area) / 2;
  }
}

export class SpatialGrid {
  private cellSize: number;
  private grid: Map<string, string[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear(): void {
    this.grid.clear();
  }

  private getKey(x: number, y: number): string {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    return `${gx},${gy}`;
  }

  insert(id: string, x: number, y: number): void {
    const key = this.getKey(x, y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(id);
  }

  query(x: number, y: number, radius: number): string[] {
    const result: string[] = [];
    const minGx = Math.floor((x - radius) / this.cellSize);
    const maxGx = Math.floor((x + radius) / this.cellSize);
    const minGy = Math.floor((y - radius) / this.cellSize);
    const maxGy = Math.floor((y + radius) / this.cellSize);

    for (let gx = minGx; gx <= maxGx; gx++) {
      for (let gy = minGy; gy <= maxGy; gy++) {
        const key = `${gx},${gy}`;
        const cell = this.grid.get(key);
        if (cell) {
          result.push(...cell);
        }
      }
    }
    return result;
  }
}
