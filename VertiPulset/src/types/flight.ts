import type { TimeRange } from './common';

export type FlightStatus = 
  | 'scheduled' 
  | 'boarding' 
  | 'ready' 
  | 'taxiing' 
  | 'takeoff' 
  | 'enroute' 
  | 'approach' 
  | 'landing' 
  | 'arrived' 
  | 'delayed' 
  | 'cancelled';

export type OperationType = 'takeoff' | 'landing';

export interface Flight {
  id: string;
  flightNumber: string;
  aircraftId: string;
  airline: string;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  actualDeparture?: Date;
  actualArrival?: Date;
  status: FlightStatus;
  passengers: number;
  origin: string;
  destination: string;
  priority: number;
  delayMinutes?: number;
}

export interface Aircraft {
  id: string;
  registration: string;
  model: string;
  capacity: number;
  batteryId: string;
  maxRange: number;
  cruiseSpeed: number;
  operator: string;
  status: 'available' | 'in-flight' | 'maintenance' | 'charging';
  currentLocation?: string;
}

export interface Runway {
  id: string;
  name: string;
  type: 'vertipad' | 'runway';
  length: number;
  status: 'available' | 'occupied' | 'closed' | 'maintenance';
  position: { x: number; y: number };
  heading: number;
}

export interface RunwayAllocation {
  id: string;
  runwayId: string;
  flightId: string;
  startTime: Date;
  endTime: Date;
  operationType: OperationType;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  sequence: number;
}

export interface FlightQueueItem {
  flight: Flight;
  estimatedWaitTime: number;
  priorityScore: number;
  allocation?: RunwayAllocation;
}
