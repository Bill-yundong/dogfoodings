export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationConstraint {
  type: 'time_window' | 'must_visit' | 'avoid';
  startTime?: string;
  endTime?: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  duration: number;
  stayDuration?: number;
  priority: 1 | 2 | 3;
  openHours?: { start: string; end: string };
  constraints?: LocationConstraint[];
  orderIndex?: number;
  tripId?: string;
}

export type TripStatus = 'draft' | 'confirmed' | 'completed' | 'cancelled';
export type TransportMode = 'driving' | 'transit' | 'walking' | 'flying';
export type AlgorithmType = 'nearest_neighbor' | 'genetic' | 'simulated_annealing' | 'ant_colony';
export type OptimizationGoal = 'distance' | 'time' | 'cost' | 'balanced';
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'conflict' | 'error' | 'pending' | 'offline';
export type OperationType = 'create' | 'update' | 'delete';
export type EntityType = 'trip' | 'location' | 'snapshot';

export interface TripPreferences {
  transportMode: TransportMode;
  optimizationGoal: OptimizationGoal;
  dailyStartTime: string;
  dailyEndTime: string;
  defaultStayDuration: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  maxLat: number;
  minLat: number;
  maxLng: number;
  minLng: number;
}

export interface TSPSolveConstraints {
  dailyHours: { start: string; end: string };
  maxDailyDistance: number;
  avoidTolls: boolean;
}

export interface TSPSolveRequest {
  locations: Location[];
  startDate: string;
  endDate: string;
  transportMode: TransportMode;
  algorithm: AlgorithmType;
  optimizationGoal: OptimizationGoal;
  constraints: TSPSolveConstraints;
}

export interface PathSegment {
  id: string;
  from: Location;
  to: Location;
  distance: number;
  duration: number;
  cost: number;
  mode: TransportMode;
  polyline: string;
}

export interface ItineraryActivity {
  id: string;
  type: 'travel' | 'visit' | 'meal' | 'rest';
  location?: Location;
  locationName: string;
  address?: string;
  coordinates?: Coordinates;
  notes?: string;
  transportMode?: TransportMode;
  startTime: string;
  endTime: string;
  duration: number;
  description?: string;
  distance?: number;
}

export interface DailyItinerary {
  id: string;
  date: string;
  locations: Location[];
  activities: ItineraryActivity[];
  startTime: string;
  endTime: string;
  totalDistance: number;
  totalDuration: number;
  summary: string;
}

export interface TSPResult {
  id: string;
  optimalPath: Location[];
  optimizedOrder: Location[];
  totalDistance: number;
  totalDuration: number;
  totalTime: number;
  totalCost: number;
  segments: PathSegment[];
  routeLegs: PathSegment[];
  dailyItineraries: DailyItinerary[];
  algorithmUsed: AlgorithmType;
  fitnessScore: number;
  alternativePaths: TSPResult[];
}

export interface TSPSolveResponse {
  taskId: string;
  status: TaskStatus;
  progress: number;
  result?: TSPResult;
  error?: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  userId: string;
  description?: string;
  status: TripStatus;
  startDate: string | Date;
  endDate: string | Date;
  timestamp?: Date;
  transportMode: TransportMode;
  locations: Location[];
  tspResult?: TSPResult;
  preferences?: TripPreferences;
  createdAt: string | Date;
  updatedAt: string | Date;
  [key: `locations.${number}`]: unknown;
}

export interface TripSnapshot {
  id: string;
  tripId: string;
  name: string;
  tripName: string;
  description?: string;
  version: number;
  locationCount: number;
  data: TSPResult;
  createdAt: string;
  synced: boolean;
  syncStatus: SyncStatus;
  operations: OperationLog[];
  metadata?: {
    totalDistance: number;
    totalDuration: number;
    totalTime: number;
    algorithm: AlgorithmType;
    locationCount: number;
    createdAt: string;
    optimizationGoal: OptimizationGoal;
  };
}

export interface OperationLog {
  id: string;
  tripId: string;
  snapshotId?: string;
  entityId: string;
  type: OperationType;
  entityType: EntityType;
  payload: Record<string, unknown>;
  timestamp: string | Date;
  offline: boolean;
  status?: 'pending' | 'synced' | 'error';
  lamportTime?: number;
  data?: unknown;
}

export interface SyncQueueItem {
  id: string;
  type: 'trip' | 'snapshot' | 'calendar' | 'travel';
  status: 'pending' | 'processing' | 'failed';
  payload: Record<string, unknown>;
  retryCount: number;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
}

export interface UserSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  locationId?: string;
  externalId: string;
  provider: string;
  title: string;
  summary: string;
  description: string;
  start: string | Date;
  end: string | Date;
  location?: string;
  startTime: string;
  endTime: string;
  status: string;
  event1?: CalendarEvent;
  event2?: CalendarEvent;
}

export interface TravelApplication {
  id: string;
  tripId: string;
  externalId: string;
  system: string;
  status: string;
  estimatedCost: number;
  approvalFlow: Record<string, unknown>;
}

export interface ScheduleTask {
  id: string;
  name: string;
  type: 'tsp_solve' | 'multi_variable' | 'sync' | 'optimization';
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus | 'queued' | 'running' | 'cancelled' | 'paused';
  progress: number;
  progressMessage?: string;
  payload: Record<string, unknown>;
  createdAt: string | Date;
  startedAt?: string | Date;
  completedAt?: string | Date;
  result?: unknown;
  error?: string;
}

export interface NetworkState {
  online: boolean;
  since: string;
  latency: number;
}

export interface AlgorithmProgress {
  iteration: number;
  totalIterations: number;
  currentBest: number;
  temperature?: number;
  pheromone?: number[][];
}
