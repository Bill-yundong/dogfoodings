export interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat' | 'other';
  breed: string;
  age: number;
  weight: number;
  avatar: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface VitalSigns {
  id: string;
  petId: string;
  timestamp: number;
  heartRate: number;
  temperature: number;
  respiratoryRate: number;
  activityLevel: number;
  source: 'wearable' | 'manual';
  synced: boolean;
  version: number;
}

export interface GaitData {
  id: string;
  petId: string;
  timestamp: number;
  stepCount: number;
  strideLength: number;
  cadence: number;
  symmetryScore: number;
  acceleration: { x: number; y: number; z: number }[];
  synced: boolean;
  version: number;
}

export type AnomalyType = 'gait' | 'vital' | 'behavior';
export type SeverityLevel = 'low' | 'medium' | 'high';

export interface AnomalyDetection {
  id: string;
  petId: string;
  type: AnomalyType;
  severity: SeverityLevel;
  confidence: number;
  timestamp: number;
  description: string;
  acknowledged: boolean;
  synced: boolean;
  version: number;
}

export type HealthRecordType = 'checkup' | 'vaccination' | 'treatment' | 'surgery';

export interface HealthRecord {
  id: string;
  petId: string;
  type: HealthRecordType;
  date: number;
  veterinarianId?: string;
  veterinarianName?: string;
  notes: string;
  attachments: string[];
  synced: boolean;
  version: number;
}

export interface Device {
  id: string;
  petId: string;
  name: string;
  type: string;
  macAddress: string;
  batteryLevel: number;
  connected: boolean;
  lastSync: number;
}

export interface SyncQueueItem {
  id?: number;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  version: number;
  timestamp: number;
  source: string;
  retryCount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'veterinarian' | 'admin';
  avatar?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  avatar: string;
  rating: number;
  online: boolean;
}

export interface HealthScore {
  overall: number;
  vitality: number;
  mobility: number;
  behavior: number;
  timestamp: number;
}
