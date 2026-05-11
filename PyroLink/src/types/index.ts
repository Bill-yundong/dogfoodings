export interface TerrainPoint {
  x: number;
  y: number;
  elevation: number;
}

export interface FirePoint {
  id: string;
  x: number;
  y: number;
  intensity: number;
  temperature: number;
  spreadRate: number;
}

export interface WindVector {
  u: number;
  v: number;
  speed: number;
  direction: number;
}

export interface Command {
  id: string;
  type: 'deploy' | 'evacuate' | 'contain' | 'monitor';
  priority: 'critical' | 'high' | 'medium' | 'low';
  target: { x: number; y: number };
  timestamp: number;
  status: 'pending' | 'acknowledged' | 'completed';
  fromCenter: string;
  toCenter: string;
}

export interface RescueUnit {
  id: string;
  name: string;
  type: 'firefighter' | 'helicopter' | 'truck' | 'water_tanker';
  position: { x: number; y: number };
  status: 'available' | 'deployed' | 'en_route';
  capacity: number;
  lastUpdate: number;
}

export interface SimulationState {
  terrain: TerrainPoint[][];
  fires: FirePoint[];
  windField: WindVector[][];
  time: number;
  isRunning: boolean;
}

export interface OfflinePlan {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  units: RescueUnit[];
  commands: Command[];
  scenario: string;
}
