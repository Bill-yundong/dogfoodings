export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface CraneState {
  id: string;
  name: string;
  position: Point3D;
  jibAngle: number;
  jibLength: number;
  trolleyPosition: number;
  hookHeight: number;
  loadWeight: number;
  rotationSpeed: number;
  trolleySpeed: number;
  hoistSpeed: number;
  timestamp: number;
}

export interface EnvelopePoint {
  position: Point3D;
  timestamp: number;
  velocity: Point3D;
}

export interface CraneEnvelope {
  craneId: string;
  points: EnvelopePoint[];
  startTime: number;
  endTime: number;
}

export interface CollisionRisk {
  id: string;
  craneA: string;
  craneB: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  distance: number;
  predictedTime: number;
  kineticEnergyA: number;
  kineticEnergyB: number;
  positionA: Point3D;
  positionB: Point3D;
  timestamp: number;
}

export interface WarningAlert {
  id: string;
  craneId: string;
  type: 'collision' | 'overload' | 'speed' | 'boundary';
  level: 'warning' | 'danger' | 'emergency';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface BlackBoxRecord {
  id?: number;
  craneId: string;
  state: CraneState;
  envelope: CraneEnvelope;
  timestamp: number;
  sessionId: string;
}

export interface SemanticAlignment {
  terminalData: CraneState;
  platformData: CraneState;
  alignmentScore: number;
  timestamp: number;
  confidence: number;
}
