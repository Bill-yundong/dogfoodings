export interface Building {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floors: number;
  facadeMaterial: FacadeMaterial;
}

export interface FacadeMaterial {
  id: string;
  name: string;
  reflectivity: number;
  emissivity: number;
  color: string;
  category: MaterialCategory;
}

export type MaterialCategory = 'glass' | 'concrete' | 'metal' | 'stone' | 'wood' | 'other';

export interface LightSource {
  id: string;
  x: number;
  y: number;
  intensity: number;
  wavelength: number;
  type: 'streetlight' | 'building' | 'advertisement';
}

export interface Ray {
  id: string;
  startX: number;
  startY: number;
  direction: number;
  intensity: number;
  reflections: number;
  maxReflections: number;
}

export interface LightPollutionPoint {
  x: number;
  y: number;
  intensity: number;
  wavelength: number;
  timestamp: number;
}

export interface AlignmentData {
  id: string;
  buildingId: string;
  epaReflectivity: number;
  planningReflectivity: number;
  alignedReflectivity: number;
  timestamp: number;
  status: 'aligned' | 'conflict' | 'pending';
}

export interface SimulationConfig {
  gridSize: number;
  maxReflections: number;
  rayCount: number;
  attenuationRate: number;
}

export interface SimulationResult {
  grid: LightPollutionPoint[][];
  totalIntensity: number;
  hotspots: LightPollutionPoint[];
  timestamp: number;
}
