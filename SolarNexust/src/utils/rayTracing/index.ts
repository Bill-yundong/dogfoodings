import type { Vector3, Building, SolarPanel, RayTracingResult } from '../../types/solar';
import type { Ray, RayHit, BoundingBox, BVHNode } from '../../types/simulation';

const EPSILON = 1e-6;

export function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function subtract(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function add(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function multiply(v: Vector3, scalar: number): Vector3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

export function dot(a: Vector3, b: Vector3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a: Vector3, b: Vector3): Vector3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(v: Vector3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function distance(a: Vector3, b: Vector3): number {
  return length(subtract(a, b));
}

export function rayTriangleIntersect(
  ray: Ray,
  v0: Vector3,
  v1: Vector3,
  v2: Vector3
): { hit: boolean; t: number; u: number; v: number } {
  const edge1 = subtract(v1, v0);
  const edge2 = subtract(v2, v0);
  const h = cross(ray.direction, edge2);
  const a = dot(edge1, h);

  if (a > -EPSILON && a < EPSILON) {
    return { hit: false, t: 0, u: 0, v: 0 };
  }

  const f = 1 / a;
  const s = subtract(ray.origin, v0);
  const u = f * dot(s, h);

  if (u < 0 || u > 1) {
    return { hit: false, t: 0, u: 0, v: 0 };
  }

  const q = cross(s, edge1);
  const v = f * dot(ray.direction, q);

  if (v < 0 || u + v > 1) {
    return { hit: false, t: 0, u: 0, v: 0 };
  }

  const t = f * dot(edge2, q);

  if (t > EPSILON) {
    return { hit: true, t, u, v };
  }

  return { hit: false, t: 0, u: 0, v: 0 };
}

export function buildingToTriangles(building: Building): Array<{ v0: Vector3; v1: Vector3; v2: Vector3; buildingId: string }> {
  const triangles: Array<{ v0: Vector3; v1: Vector3; v2: Vector3; buildingId: string }> = [];
  const { vertices, height, id } = building;

  if (vertices.length < 3) return triangles;

  const topVertices = vertices.map((v) => ({ x: v.x, y: v.y + height, z: v.z }));

  for (let i = 0; i < vertices.length; i++) {
    const next = (i + 1) % vertices.length;
    
    triangles.push({
      v0: vertices[i],
      v1: vertices[next],
      v2: topVertices[i],
      buildingId: id,
    });
    
    triangles.push({
      v0: vertices[next],
      v1: topVertices[next],
      v2: topVertices[i],
      buildingId: id,
    });
  }

  for (let i = 2; i < vertices.length; i++) {
    triangles.push({
      v0: vertices[0],
      v1: vertices[i - 1],
      v2: vertices[i],
      buildingId: id,
    });
  }

  for (let i = 2; i < topVertices.length; i++) {
    triangles.push({
      v0: topVertices[0],
      v1: topVertices[i],
      v2: topVertices[i - 1],
      buildingId: id,
    });
  }

  return triangles;
}

export function buildBoundingBox(vertices: Vector3[]): BoundingBox {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (const v of vertices) {
    min.x = Math.min(min.x, v.x);
    min.y = Math.min(min.y, v.y);
    min.z = Math.min(min.z, v.z);
    max.x = Math.max(max.x, v.x);
    max.y = Math.max(max.y, v.y);
    max.z = Math.max(max.z, v.z);
  }

  return { min, max };
}

export function rayBoundingBoxIntersect(ray: Ray, box: BoundingBox): boolean {
  let tmin = -Infinity;
  let tmax = Infinity;

  for (const axis of ['x', 'y', 'z'] as const) {
    if (ray.direction[axis] === 0) {
      if (ray.origin[axis] < box.min[axis] || ray.origin[axis] > box.max[axis]) {
        return false;
      }
    } else {
      let t1 = (box.min[axis] - ray.origin[axis]) / ray.direction[axis];
      let t2 = (box.max[axis] - ray.origin[axis]) / ray.direction[axis];
      
      if (t1 > t2) {
        [t1, t2] = [t2, t1];
      }
      
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      
      if (tmin > tmax) return false;
    }
  }

  return tmax >= 0;
}

export function buildBVH(
  triangles: Array<{ v0: Vector3; v1: Vector3; v2: Vector3; buildingId: string }>,
  depth: number = 0,
  maxDepth: number = 20
): BVHNode {
  if (triangles.length === 0) {
    return { bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } } };
  }

  if (triangles.length === 1 || depth >= maxDepth) {
    const allVertices = triangles.flatMap((t) => [t.v0, t.v1, t.v2]);
    return {
      bounds: buildBoundingBox(allVertices),
      buildingIndex: 0,
    };
  }

  const allVertices = triangles.flatMap((t) => [t.v0, t.v1, t.v2]);
  const bounds = buildBoundingBox(allVertices);

  const extent = {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };

  let axis: 'x' | 'y' | 'z' = 'x';
  if (extent.y > extent.x && extent.y > extent.z) axis = 'y';
  else if (extent.z > extent.x) axis = 'z';

  const mid = Math.floor(triangles.length / 2);
  
  triangles.sort((a, b) => {
    const centroidA = (a.v0[axis] + a.v1[axis] + a.v2[axis]) / 3;
    const centroidB = (b.v0[axis] + b.v1[axis] + b.v2[axis]) / 3;
    return centroidA - centroidB;
  });

  const leftTriangles = triangles.slice(0, mid);
  const rightTriangles = triangles.slice(mid);

  return {
    bounds,
    left: buildBVH(leftTriangles, depth + 1, maxDepth),
    right: buildBVH(rightTriangles, depth + 1, maxDepth),
  };
}

export function traverseBVH(
  ray: Ray,
  node: BVHNode,
  triangles: Array<{ v0: Vector3; v1: Vector3; v2: Vector3; buildingId: string }>
): RayHit | null {
  if (!rayBoundingBoxIntersect(ray, node.bounds)) {
    return null;
  }

  if (node.buildingIndex !== undefined) {
    let closestHit: RayHit | null = null;
    let closestT = Infinity;

    for (const triangle of triangles) {
      const result = rayTriangleIntersect(ray, triangle.v0, triangle.v1, triangle.v2);
      if (result.hit && result.t < closestT && result.t > 0) {
        closestT = result.t;
        const hitPoint = add(ray.origin, multiply(ray.direction, result.t));
        const edge1 = subtract(triangle.v1, triangle.v0);
        const edge2 = subtract(triangle.v2, triangle.v0);
        const normal = normalize(cross(edge1, edge2));
        
        closestHit = {
          distance: result.t,
          point: hitPoint,
          normal,
          buildingId: triangle.buildingId,
        };
      }
    }

    return closestHit;
  }

  const leftHit = node.left ? traverseBVH(ray, node.left, triangles) : null;
  const rightHit = node.right ? traverseBVH(ray, node.right, triangles) : null;

  if (leftHit && rightHit) {
    return leftHit.distance < rightHit.distance ? leftHit : rightHit;
  }

  return leftHit || rightHit;
}

export function getPanelSamplePoints(panel: SolarPanel, samplesPerSide: number = 5): Vector3[] {
  const points: Vector3[] = [];
  const step = 1 / (samplesPerSide + 1);
  const halfWidth = 0.5;
  const halfHeight = 0.5;

  for (let i = 1; i <= samplesPerSide; i++) {
    for (let j = 1; j <= samplesPerSide; j++) {
      const u = i * step;
      const v = j * step;
      
      const localX = (u - 0.5) * halfWidth * 2;
      const localZ = (v - 0.5) * halfHeight * 2;
      
      points.push({
        x: panel.position.x + localX,
        y: panel.position.y,
        z: panel.position.z + localZ,
      });
    }
  }

  return points;
}

export function calculateShadowCoverage(
  panel: SolarPanel,
  sunDirection: Vector3,
  bvh: BVHNode,
  triangles: Array<{ v0: Vector3; v1: Vector3; v2: Vector3; buildingId: string }>,
  samplesPerSide: number = 5
): { coverage: number; hitBuildingIds: Set<string> } {
  const samplePoints = getPanelSamplePoints(panel, samplesPerSide);
  let shadowedCount = 0;
  const hitBuildingIds = new Set<string>();

  const rayDirection = normalize(multiply(sunDirection, -1));

  for (const point of samplePoints) {
    const ray: Ray = {
      origin: add(point, { x: 0, y: 0.1, z: 0 }),
      direction: rayDirection,
    };

    const hit = traverseBVH(ray, bvh, triangles);
    if (hit) {
      shadowedCount++;
      hitBuildingIds.add(hit.buildingId);
    }
  }

  return {
    coverage: shadowedCount / samplePoints.length,
    hitBuildingIds,
  };
}

export function performRayTracing(
  panels: SolarPanel[],
  buildings: Building[],
  sunDirection: Vector3,
  sunIntensity: number,
  timestamp: number,
  sunAltitude: number,
  sunAzimuth: number,
  quality: 'low' | 'medium' | 'high' | 'ultra' = 'medium'
): RayTracingResult[] {
  const samplesMap = {
    low: 3,
    medium: 5,
    high: 8,
    ultra: 12,
  };
  const samplesPerSide = samplesMap[quality];

  const allTriangles = buildings.flatMap((b) => buildingToTriangles(b));
  const bvh = buildBVH(allTriangles);

  const results: RayTracingResult[] = [];
  const diffuseRatio = 0.2;

  for (const panel of panels) {
    const { coverage } = calculateShadowCoverage(
      panel,
      sunDirection,
      bvh,
      allTriangles,
      samplesPerSide
    );

    const directIrradiance = sunIntensity * (1 - coverage);
    const diffuseIrradiance = sunIntensity * diffuseRatio * (1 - coverage * 0.5);

    results.push({
      panelId: panel.id,
      shadowCoverage: coverage,
      directIrradiance,
      diffuseIrradiance,
      timestamp,
      sunAltitude,
      sunAzimuth,
    });
  }

  return results;
}
