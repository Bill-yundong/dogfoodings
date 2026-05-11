import { Point2D, Building, NoiseSource, AcousticRay } from '../types';

const SPEED_OF_SOUND = 343;
const MAX_REFLECTIONS = 5;
const MAX_DIFFRACTIONS = 3;
const AIR_ABSORPTION_COEFF = 0.005;

export const getReflectionCoefficient = (material: string): number => {
  const coefficients: Record<string, number> = {
    concrete: 0.95,
    glass: 0.9,
    brick: 0.85
  };
  return coefficients[material] || 0.8;
};

export const distance = (p1: Point2D, p2: Point2D): number => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};

export const lineIntersectsRect = (
  p1: Point2D,
  p2: Point2D,
  rect: { x: number; y: number; width: number; height: number }
): { intersects: boolean; point: Point2D | null; normal: Point2D | null } => {
  const edges = [
    { start: { x: rect.x, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y }, normal: { x: 0, y: -1 } },
    { start: { x: rect.x + rect.width, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y + rect.height }, normal: { x: 1, y: 0 } },
    { start: { x: rect.x + rect.width, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y + rect.height }, normal: { x: 0, y: 1 } },
    { start: { x: rect.x, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y }, normal: { x: -1, y: 0 } }
  ];

  let closestIntersection: Point2D | null = null;
  let closestNormal: Point2D | null = null;
  let minDist = Infinity;

  for (const edge of edges) {
    const intersection = lineLineIntersection(p1, p2, edge.start, edge.end);
    if (intersection) {
      const dist = distance(p1, intersection);
      if (dist < minDist && dist > 0.1) {
        minDist = dist;
        closestIntersection = intersection;
        closestNormal = edge.normal;
      }
    }
  }

  return { intersects: !!closestIntersection, point: closestIntersection, normal: closestNormal };
};

export const lineLineIntersection = (
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): Point2D | null => {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 0.0001) return null;

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y)
    };
  }
  return null;
};

export const reflectRay = (direction: Point2D, normal: Point2D): Point2D => {
  const dot = direction.x * normal.x + direction.y * normal.y;
  return {
    x: direction.x - 2 * dot * normal.x,
    y: direction.y - 2 * dot * normal.y
  };
};

export const diffractionAttenuation = (
  frequency: number,
  pathDifference: number,
  edgeType: 'sharp' | 'rounded' = 'sharp'
): number => {
  const wavelength = SPEED_OF_SOUND / frequency;
  const normalizedDiff = pathDifference / wavelength;
  const nu = Math.sqrt(Math.abs(normalizedDiff) * 2);
  
  const c = 0.618;
  const fresnelIntegral = c * Math.sin(Math.PI * nu * nu / 2) - c * Math.cos(Math.PI * nu * nu / 2);
  const attenuation = 20 * Math.log10(1 + Math.abs(fresnelIntegral));
  
  return edgeType === 'sharp' ? attenuation * 1.2 : attenuation;
};

export const airAbsorption = (distance: number, frequency: number, humidity: number = 50): number => {
  const f = frequency / 1000;
  const h = humidity;
  const t = 20;
  
  const frO = 24 + 4.04e4 * h * (0.02 + h) / (391 + h);
  const frN = (t / 24) ** 0.5 * (9 + 280 * h * Math.exp(-4.17 * ((t / 24 + 1) ** (-1 / 3) - 1)));
  
  const alphaO = 0.0106 * frO * (f * f) / (frO * frO + f * f);
  const alphaN = 0.00029 * (t / 293) ** (-5 / 2) * frN * (f * f) / (frN * frN + f * f);
  
  const alpha = (alphaO + alphaN) * distance / 1000;
  return alpha;
};

export const geometricSpreading = (distance: number): number => {
  if (distance < 1) return 0;
  return 20 * Math.log10(distance);
};

export const calculateAttenuation = (
  rayLength: number,
  frequency: number,
  reflections: number,
  diffractions: number,
  buildingMaterials: string[]
): number => {
  let attenuation = geometricSpreading(rayLength);
  attenuation += airAbsorption(rayLength, frequency);
  
  for (const material of buildingMaterials) {
    const coeff = getReflectionCoefficient(material);
    attenuation += 10 * Math.log10(1 / coeff);
  }
  
  attenuation += diffractions * 5;
  
  return attenuation;
};

export const generateRays = (source: NoiseSource, numRays: number = 360): AcousticRay[] => {
  const rays: AcousticRay[] = [];
  const angleStep = (2 * Math.PI) / numRays;
  
  for (let i = 0; i < numRays; i++) {
    const angle = i * angleStep;
    rays.push({
      id: `ray-${source.id}-${i}`,
      origin: { x: source.x, y: source.y },
      direction: angle,
      reflections: 0,
      diffractions: 0,
      currentPoint: { x: source.x, y: source.y },
      energy: source.baseDecibels,
      terminated: false
    });
  }
  
  return rays;
};

export const traceRay = (
  ray: AcousticRay,
  buildings: Building[],
  maxDistance: number = 1000,
  stepSize: number = 2
): { points: Point2D[]; finalEnergy: number } => {
  const points: Point2D[] = [{ ...ray.currentPoint }];
  let currentEnergy = ray.energy;
  let currentPoint = { ...ray.currentPoint };
  let direction = {
    x: Math.cos(ray.direction),
    y: Math.sin(ray.direction)
  };
  let totalDistance = 0;
  let reflections = 0;
  let reflectedMaterials: string[] = [];

  while (totalDistance < maxDistance && reflections < MAX_REFLECTIONS) {
    const nextPoint = {
      x: currentPoint.x + direction.x * stepSize,
      y: currentPoint.y + direction.y * stepSize
    };
    
    let hitBuilding = false;
    
    for (const building of buildings) {
      const intersection = lineIntersectsRect(currentPoint, nextPoint, building);
      
      if (intersection.intersects && intersection.point && intersection.normal) {
        points.push(intersection.point);
        totalDistance += distance(currentPoint, intersection.point);
        
        direction = reflectRay(direction, intersection.normal);
        reflectedMaterials.push(building.material);
        reflections++;
        
        currentPoint = {
          x: intersection.point.x + direction.x * 0.1,
          y: intersection.point.y + direction.y * 0.1
        };
        
        hitBuilding = true;
        break;
      }
    }
    
    if (!hitBuilding) {
      points.push(nextPoint);
      totalDistance += stepSize;
      currentPoint = nextPoint;
    }
  }
  
  const attenuation = calculateAttenuation(
    totalDistance,
    1000,
    reflections,
    0,
    reflectedMaterials
  );
  
  const finalEnergy = Math.max(0, currentEnergy - attenuation);
  
  return { points, finalEnergy };
};

export const calculateNoiseGrid = (
  sources: NoiseSource[],
  buildings: Building[],
  gridWidth: number,
  gridHeight: number,
  cellSize: number = 5
): number[][] => {
  const cols = Math.ceil(gridWidth / cellSize);
  const rows = Math.ceil(gridHeight / cellSize);
  const grid: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(0));
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const gridX = col * cellSize + cellSize / 2;
      const gridY = row * cellSize + cellSize / 2;
      
      let totalNoise = 0;
      
      for (const source of sources) {
        if (!source.active) continue;
        
        const dist = distance({ x: gridX, y: gridY }, { x: source.x, y: source.y });
        let directPath = true;
        
        for (const building of buildings) {
          const intersection = lineIntersectsRect(
            { x: source.x, y: source.y },
            { x: gridX, y: gridY },
            building
          );
          if (intersection.intersects) {
            directPath = false;
            break;
          }
        }
        
        let effectiveNoise = source.baseDecibels;
        
        if (directPath) {
          effectiveNoise -= geometricSpreading(dist);
          effectiveNoise -= airAbsorption(dist, source.frequency);
        } else {
          effectiveNoise -= geometricSpreading(dist) * 1.5;
          effectiveNoise -= 10;
        }
        
        effectiveNoise = Math.max(0, effectiveNoise);
        totalNoise = 10 * Math.log10(
          Math.pow(10, totalNoise / 10) + Math.pow(10, effectiveNoise / 10)
        );
      }
      
      grid[row][col] = totalNoise;
    }
  }
  
  return grid;
};
