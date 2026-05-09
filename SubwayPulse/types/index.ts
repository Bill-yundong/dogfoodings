export interface Station {
  id: string;
  name: string;
  line: string;
  platforms: number;
  maxCapacity: number;
  location: {
    x: number;
    y: number;
  };
}

export interface CrowdPressure {
  stationId: string;
  timestamp: number;
  currentDensity: number;
  maxDensity: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  entryRate: number;
  exitRate: number;
  platformLoad: number[];
}

export interface TrainSchedule {
  id: string;
  line: string;
  stationId: string;
  arrivalTime: number;
  departureTime: number;
  capacity: number;
  currentLoad: number;
  status: "on-time" | "delayed" | "cancelled";
}

export interface CapacityPrediction {
  stationId: string;
  timestamp: number;
  predictedArrivalRate: number;
  predictedServiceRate: number;
  averageWaitTime: number;
  queueLength: number;
  utilization: number;
  capacityGap: number;
  confidence: number;
}

export interface TrafficSnapshot {
  id: string;
  stationId: string;
  timestamp: number;
  crowdPressure: CrowdPressure;
  trainSchedules: TrainSchedule[];
  capacityPrediction: CapacityPrediction;
}

export interface SyncMessage {
  type: "crowd-pressure" | "train-schedule" | "capacity-prediction" | "snapshot";
  data: CrowdPressure | TrainSchedule[] | CapacityPrediction | TrafficSnapshot;
  timestamp: number;
  source: "security" | "dispatch";
}
