import type { GeoCoordinate } from './common';

export interface Waypoint {
  coordinate: GeoCoordinate;
  timestamp: Date;
  speed: number;
  altitude: number;
}

export interface Trajectory4D {
  id: string;
  flightId: string;
  waypoints: Waypoint[];
  startTime: Date;
  endTime: Date;
  status: 'planned' | 'active' | 'completed' | 'modified';
  aircraftId: string;
}

export interface AirspaceSector {
  id: string;
  name: string;
  geometry: GeoCoordinate[];
  altitudeMin: number;
  altitudeMax: number;
  capacity: number;
  currentFlights: number;
  status: 'open' | 'restricted' | 'closed';
  restrictions?: string[];
}

export interface Conflict {
  id: string;
  flightId1: string;
  flightId2: string;
  detectionTime: Date;
  predictedTime: Date;
  minimumDistance: number;
  altitudeDifference: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'resolving' | 'resolved' | 'false-alarm';
  location: GeoCoordinate;
}

export interface ResolutionOption {
  id: string;
  conflictId: string;
  type: 'altitude' | 'speed' | 'route' | 'time';
  description: string;
  deviation: number;
  delayMinutes: number;
  fuelCost: number;
  safetyScore: number;
  recommended: boolean;
}

export interface TrafficFlowData {
  timestamp: Date;
  sectorId: string;
  entryCount: number;
  exitCount: number;
  transitCount: number;
  averageSpeed: number;
  density: number;
}

export interface FlowManagementPlan {
  id: string;
  sectorId: string;
  startTime: Date;
  endTime: Date;
  maxCapacity: number;
  entryRate: number;
  milesInTrail: number;
  altitudeConstraints?: number[];
}
