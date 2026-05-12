export interface BiometricHash {
  id: string;
  userId: string;
  hashType: 'fingerprint' | 'facial' | 'iris' | 'palm';
  hashValue: string;
  timestamp: number;
  confidence: number;
  nodeId: string;
}

export interface SecurityNode {
  id: string;
  name: string;
  type: 'door' | 'camera' | 'sensor' | 'vault';
  location: string;
  level: number;
  status: 'online' | 'offline' | 'warning' | 'error';
  lastHeartbeat: number;
  latency: number;
  coordinates: {
    x: number;
    y: number;
  };
}

export interface AccessEvent {
  id: string;
  nodeId: string;
  userId?: string;
  biometricHash?: BiometricHash;
  timestamp: number;
  result: 'granted' | 'denied' | 'pending';
  reason?: string;
  alignmentLatency: number;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  nodes: SecurityNode[];
  events: AccessEvent[];
  hash: string;
}

export interface AlignmentResult {
  success: boolean;
  latency: number;
  sourceNode: string;
  targetNodes: string[];
  timestamp: number;
  confidence: number;
}

export interface SpaceConsistencyCheck {
  id: string;
  nodes: string[];
  timestamp: number;
  isConsistent: boolean;
  confidence: number;
  duration: number;
}

export type NodeStatus = SecurityNode['status'];
export type BiometricType = BiometricHash['hashType'];
