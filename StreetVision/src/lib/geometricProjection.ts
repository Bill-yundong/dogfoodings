import type { Point, Building, Viewpoint, VisibilityAnalysisResult, VisibilityCell, StreetPerceptionScore, RoadSegment } from '../types';

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

function lineIntersectsBuilding(
  start: Point,
  end: Point,
  building: Building
): { intersects: boolean; distance?: number } {
  const points = building.polygon;

  for (let i = 0; i < points.length; i++) {
    const buildingStart = points[i];
    const buildingEnd = points[(i + 1) % points.length];

    const x1 = start.x;
    const y1 = start.y;
    const x2 = end.x;
    const y2 = end.y;
    const x3 = buildingStart.x;
    const y3 = buildingStart.y;
    const x4 = buildingEnd.x;
    const y4 = buildingEnd.y;

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (Math.abs(denom) < 0.0001) continue;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      const intersectionX = x1 + t * (x2 - x1);
      const intersectionY = y1 + t * (y2 - y1);
      const distance = Math.sqrt(
        Math.pow(intersectionX - start.x, 2) + Math.pow(intersectionY - start.y, 2)
      );
      return { intersects: true, distance };
    }
  }

  return { intersects: false };
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export async function asyncGeometricProjection(
  viewpoint: Viewpoint,
  buildings: Building[],
  gridResolution: number = 1
): Promise<VisibilityAnalysisResult> {
  const cells: VisibilityCell[] = [];
  const fovRad = degreesToRadians(viewpoint.fieldOfView);
  const directionRad = degreesToRadians(viewpoint.direction);
  const halfFov = fovRad / 2;
  const gridSize = Math.ceil(viewpoint.maxDistance / gridResolution);
  const cellsToAnalyze: VisibilityCell[] = [];

  for (let gy = -gridSize; gy <= gridSize; gy++) {
    for (let gx = -gridSize; gx <= gridSize; gx++) {
      const cellX = viewpoint.position.x + gx * gridResolution;
      const cellY = viewpoint.position.y + gy * gridResolution;

      const dx = cellX - viewpoint.position.x;
      const dy = cellY - viewpoint.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= viewpoint.maxDistance) {
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;

        let angleDiff = Math.abs(angle - directionRad);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff <= halfFov) {
          cellsToAnalyze.push({
            x: cellX,
            y: cellY,
            visible: false,
            distance,
            obstruction: null
          });
        }
      }
    }
  }

  const chunks = chunkArray(cellsToAnalyze, 100);

  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];

    for (const cell of chunk) {
      let isVisible = true;
      let obstructionDistance = Infinity;
      let obstructionId: string | null = null;

      for (const building of buildings) {
        const result = lineIntersectsBuilding(viewpoint.position, { x: cell.x, y: cell.y }, building);

        if (result.intersects && result.distance !== undefined) {
          if (result.distance < obstructionDistance && result.distance < cell.distance) {
            obstructionDistance = result.distance;
            obstructionId = building.id;
            isVisible = false;
          }
        }
      }

      cells.push({
        ...cell,
        visible: isVisible,
        obstruction: obstructionId
      });
    }

    if (ci % 5 === 0 && ci > 0) {
      await yieldToMain();
    }
  }

  const visibleCount = cells.filter((c) => c.visible).length;

  return {
    viewpointId: viewpoint.id,
    viewpointPosition: { ...viewpoint.position },
    cells,
    totalVisible: visibleCount,
    totalAnalyzed: cells.length,
    visibilityRatio: cells.length > 0 ? visibleCount / cells.length : 0,
    timestamp: Date.now()
  };
}

export function calculateStreetPerception(
  segment: RoadSegment,
  viewpointResults: VisibilityAnalysisResult[],
  _segmentLength: number
): StreetPerceptionScore {
  const contributingViewpoints: string[] = [];
  let totalVisibilityScore = 0;
  let nearbyViewpoints = 0;

  for (const result of viewpointResults) {
    let minDistance = Infinity;

    for (let i = 0; i < segment.points.length - 1; i++) {
      const dist = pointToLineDistance(
        result.viewpointPosition,
        segment.points[i],
        segment.points[i + 1]
      );
      minDistance = Math.min(minDistance, dist);
    }

    if (minDistance < 100) {
      contributingViewpoints.push(result.viewpointId);
      totalVisibilityScore += result.visibilityRatio;
      nearbyViewpoints++;
    }
  }

  const avgVisibility = nearbyViewpoints > 0 ? totalVisibilityScore / nearbyViewpoints : 0.3;

  const pedestrianAccessibility = Math.min(1, avgVisibility * (segment.type === 'pedestrian' ? 1.5 : 1));
  const visualConnectivity = avgVisibility;
  const safetyPerception = Math.min(1, avgVisibility * (segment.width / 20));

  const overallScore = (pedestrianAccessibility * 0.35 + visualConnectivity * 0.35 + safetyPerception * 0.3);

  return {
    segmentId: segment.id,
    pedestrianAccessibility,
    visualConnectivity,
    safetyPerception,
    overallScore,
    contributingViewpoints
  };
}

export function batchCalculatePerceptionScores(
  segments: RoadSegment[],
  viewpointResults: VisibilityAnalysisResult[]
): StreetPerceptionScore[] {
  return segments.map((segment) => {
    let length = 0;
    for (let i = 0; i < segment.points.length - 1; i++) {
      const dx = segment.points[i + 1].x - segment.points[i].x;
      const dy = segment.points[i + 1].y - segment.points[i].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return calculateStreetPerception(segment, viewpointResults, length);
  });
}
