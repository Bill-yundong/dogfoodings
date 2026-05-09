export interface Coordinate {
  lat: number;
  lng: number;
  altitude: number;
}

export interface Waypoint {
  id: string;
  coordinate: Coordinate;
  name: string;
  type: "origin" | "destination" | "intermediate" | "holding";
  minAltitude?: number;
  maxAltitude?: number;
  speedLimit?: number;
}

export interface FlightRoute {
  id: string;
  name: string;
  waypoints: Waypoint[];
  distance: number;
  estimatedDuration: number;
  airspaceClass: "G" | "E" | "D" | "C" | "B" | "A";
  routeType: "commercial" | "private" | "logistics" | "emergency";
  createdAt: number;
  updatedAt: number;
}

export interface Aircraft {
  id: string;
  registration: string;
  type: string;
  model: string;
  maxSpeed: number;
  maxAltitude: number;
  maxPayload: number;
  status: "idle" | "taxiing" | "takeoff" | "cruise" | "landing" | "emergency";
}

export interface FlightPlan {
  id: string;
  aircraftId: string;
  routeId: string;
  departureTime: number;
  arrivalTime: number;
  altitude: number;
  speed: number;
  status: "planned" | "active" | "completed" | "cancelled" | "diverted";
  pilotName: string;
  flightNumber: string;
}

export interface FlightState {
  flightPlanId: string;
  timestamp: number;
  position: Coordinate;
  altitude: number;
  speed: number;
  heading: number;
  verticalSpeed: number;
  fuelLevel: number;
  engineStatus: string[];
  systemsStatus: Record<string, string>;
}

export interface BlackBoxSnapshot {
  id: string;
  flightPlanId: string;
  snapshotTime: number;
  flightState: FlightState;
  weatherData?: WeatherData;
  commsLog?: CommunicationLogEntry[];
  systemAlerts?: SystemAlert[];
}

export interface WeatherData {
  timestamp: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  cloudBase: number;
  precipitation: string;
}

export interface CommunicationLogEntry {
  id: string;
  timestamp: number;
  source: "atc" | "pilot" | "system";
  frequency: string;
  message: string;
  acknowledged: boolean;
}

export interface SystemAlert {
  id: string;
  timestamp: number;
  level: "info" | "warning" | "critical" | "emergency";
  source: string;
  message: string;
  resolved: boolean;
}

export interface ConflictDetectionResult {
  id: string;
  timestamp: number;
  flightPlanId1: string;
  flightPlanId2: string;
  predictedTime: number;
  predictedLocation: Coordinate;
  horizontalDistance: number;
  verticalDistance: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "detected" | "resolved" | "mitigation_in_progress";
}

export interface MitigationAction {
  id: string;
  conflictId: string;
  flightPlanId: string;
  actionType: "altitude_change" | "speed_change" | "route_diversion" | "holding_pattern";
  parameters: Record<string, number | string | Coordinate>;
  startTime: number;
  endTime: number;
  status: "pending" | "active" | "completed" | "failed";
}

export interface SemanticMapping {
  id: string;
  sourceSystem: "caac" | "operator" | "logistics";
  targetSystem: "caac" | "operator" | "logistics";
  entityType: "flight_plan" | "aircraft" | "route" | "waypoint";
  sourceField: string;
  targetField: string;
  transformation: string;
  mappingRules: MappingRule[];
}

export interface MappingRule {
  condition: string;
  sourceValue: string | number;
  targetValue: string | number;
  priority: number;
}

export interface AirspaceSegment {
  id: string;
  name: string;
  type: "restricted" | "controlled" | "uncontrolled" | "prohibited" | "military";
  boundaries: Coordinate[];
  floorAltitude: number;
  ceilingAltitude: number;
  activeHours: string;
  restrictions: string[];
}

export type SystemType = "caac" | "operator" | "logistics";

export interface SemanticAlignedData<T> {
  data: T;
  alignedAt: number;
  sourceSystem: SystemType;
  alignedFields: string[];
  alignmentConfidence: number;
}
