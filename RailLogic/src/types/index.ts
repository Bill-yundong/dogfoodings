export interface PantographContactState {
  id: string;
  timestamp: number;
  trainId: string;
  pantographId: string;
  contactForce: number;
  wearLevel: number;
  contactArea: number;
  arcDetection: boolean;
  vibrationFrequency: number;
  verticalDisplacement: number;
  horizontalDisplacement: number;
  speed: number;
  temperature: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface TrackGeometryParameter {
  id: string;
  timestamp: number;
  trackSegmentId: string;
  mileage: number;
  gauge: number;
  alignment: number;
  profile: number;
  twist: number;
  cant: number;
  cantDeficiency: number;
  acceleration: number;
  speedLimit: number;
  temperature: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface VisualFrame {
  id: string;
  timestamp: number;
  cameraId: string;
  trainId: string;
  frameData: ImageData;
  displacementX: number;
  displacementY: number;
  confidence: number;
}

export interface TrajectoryPoint {
  id: string;
  timestamp: number;
  mileage: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  acceleration: number;
  source: 'visual' | 'gps' | 'inertial' | 'fused';
}

export interface SystemCoordinateData {
  sourceSystem: 'catenary-detection' | 'operation-guarantee';
  trainId: string;
  timestamp: number;
  displacementData: {
    vertical: number;
    horizontal: number;
    longitudinal: number;
  };
  metadata: Record<string, unknown>;
  correlationId: string;
}

export interface SystemStatus {
  catenarySystem: {
    status: 'active' | 'standby' | 'error';
    lastSync: number;
    dataQuality: number;
  };
  operationSystem: {
    status: 'active' | 'standby' | 'error';
    lastSync: number;
    dataQuality: number;
  };
  trajectoryStatus: {
    isTracking: boolean;
    frameRate: number;
    lastUpdate: number;
  };
  databaseStatus: {
    connection: 'connected' | 'disconnected';
    cacheUsage: number;
    lastCleanup: number;
  };
}

export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';

export interface Alert {
  id: string;
  timestamp: number;
  level: AlertLevel;
  source: 'pantograph' | 'track' | 'trajectory' | 'system';
  message: string;
  trainId?: string;
  mileage?: number;
  acknowledged: boolean;
}
