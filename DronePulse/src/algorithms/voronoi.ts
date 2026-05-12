import { Delaunay } from 'd3-delaunay';
import { Point, VoronoiCell, Drone } from '../types';

export class AsyncVoronoiSolver {
  private width: number;
  private height: number;
  private padding: number = 20;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  async compute(drones: Drone[]): Promise<VoronoiCell[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const points = drones.map(d => [d.position.x, d.position.y] as [number, number]);
        const delaunay = Delaunay.from(points);
        const voronoi = delaunay.voronoi([
          this.padding,
          this.padding,
          this.width - this.padding,
          this.height - this.padding
        ]);

        const cells: VoronoiCell[] = drones.map((drone, index) => {
          const polygon = Array.from(voronoi.cellPolygon(index)) as Point[];
          const centroid = this.computeCentroid(polygon);
          const area = this.computePolygonArea(polygon);

          return {
            droneId: drone.id,
            polygon,
            centroid,
            area
          };
        });

        resolve(cells);
      }, 10);
    });
  }

  async optimizeWaypoints(
    cell: VoronoiCell,
    currentPosition: Point,
    coverageRadius: number = 50
  ): Promise<Point[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const waypoints: Point[] = [];
        const boundingBox = this.getBoundingBox(cell.polygon);
        
        const step = coverageRadius * 1.5;
        let alternate = false;

        for (let y = boundingBox.minY; y <= boundingBox.maxY; y += step) {
          const rowPoints: Point[] = [];
          
          for (let x = boundingBox.minX; x <= boundingBox.maxX; x += step) {
            const point = { x, y };
            if (this.isPointInPolygon(point, cell.polygon)) {
              rowPoints.push(point);
            }
          }

          if (alternate) {
            rowPoints.reverse();
          }
          waypoints.push(...rowPoints);
          alternate = !alternate;
        }

        const sortedWaypoints = this.optimizePath(currentPosition, waypoints);
        resolve(sortedWaypoints);
      }, 10);
    });
  }

  private computeCentroid(polygon: Point[]): Point {
    if (polygon.length < 3) return polygon[0] || { x: 0, y: 0 };

    let cx = 0, cy = 0, area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      const cross = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
      cx += (polygon[i].x + polygon[j].x) * cross;
      cy += (polygon[i].y + polygon[j].y) * cross;
      area += cross;
    }

    area *= 3;
    return { x: cx / area, y: cy / area };
  }

  private computePolygonArea(polygon: Point[]): number {
    if (polygon.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const j = (i + 1) % polygon.length;
      area += polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
    }
    return Math.abs(area) / 2;
  }

  private getBoundingBox(polygon: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
    const xs = polygon.map(p => p.x);
    const ys = polygon.map(p => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  }

  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private optimizePath(start: Point, points: Point[]): Point[] {
    if (points.length === 0) return [];

    const result: Point[] = [];
    const remaining = [...points];
    let current = start;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDist = this.distance(current, remaining[0]);

      for (let i = 1; i < remaining.length; i++) {
        const dist = this.distance(current, remaining[i]);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      }

      current = remaining[nearestIndex];
      result.push(remaining.splice(nearestIndex, 1)[0]);
    }

    return result;
  }

  private distance(a: Point, b: Point): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
}

export const calculateCoveragePercentage = (
  waypoints: Point[],
  cellArea: number,
  coverageRadius: number = 50
): number => {
  if (cellArea === 0) return 0;
  const coverageArea = waypoints.length * Math.PI * coverageRadius ** 2;
  return Math.min(100, (coverageArea / cellArea) * 100);
};
