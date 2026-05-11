export interface Point2D {
  x: number;
  y: number;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floors: number;
  material: 'concrete' | 'glass' | 'brick';
}

export interface NoiseSource {
  id: string;
  x: number;
  y: number;
  frequency: number;
  baseDecibels: number;
  type: 'traffic' | 'industrial' | 'construction' | 'social';
  active: boolean;
}

export interface AcousticRay {
  id: string;
  origin: Point2D;
  direction: number;
  reflections: number;
  diffractions: number;
  currentPoint: Point2D;
  energy: number;
  terminated: boolean;
}

export interface NoiseSample {
  x: number;
  y: number;
  value: number;
}

export interface KrigingResult {
  x: number;
  y: number;
  value: number;
  variance: number;
}

export interface SnapshotData {
  id?: number;
  timestamp: number;
  gridData: number[][];
  sources: NoiseSource[];
  buildings: Building[];
  metadata: {
    avgDecibels: number;
    maxDecibels: number;
    minDecibels: number;
    gridSize: number;
  };
}

export interface AudioAnalysisResult {
  timestamp: number;
  frequencyData: number[];
  timeDomainData: number[];
  rms: number;
  peak: number;
  estimatedDecibels: number;
}
