export interface MDPState {
  id: string;
  timestamp: Date;
  runwayUtilization: number[];
  flightQueueLength: number;
  averageWaitTime: number;
  batteryStates: BatteryMDPState[];
  gridLoad: number;
  weatherScore: number;
}

export interface BatteryMDPState {
  batteryId: string;
  soc: number;
  soh: number;
  isCharging: boolean;
}

export interface MDPOperation {
  type: 'allocate_runway' | 'reorder_queue' | 'start_charging' | 'stop_charging' | 'delay_flight' | 'v2g_discharge';
  targetId: string;
  parameters: Record<string, number | string | boolean>;
}

export interface MDPReward {
  value: number;
  components: {
    throughput: number;
    waitTime: number;
    energyCost: number;
    batteryHealth: number;
    gridStability: number;
  };
}

export interface MDPPolicy {
  stateId: string;
  action: MDPOperation;
  value: number;
  confidence: number;
}

export interface TurnoverPrediction {
  timestamp: Date;
  horizonMinutes: number;
  predictedTurnover: number;
  confidenceInterval: [number, number];
  confidence: number;
  factors: {
    name: string;
    contribution: number;
  }[];
}

export interface ScheduleOptimizationResult {
  allocations: Array<{
    runwayId: string;
    flightId: string;
    startTime: Date;
    endTime: Date;
  }>;
  expectedThroughput: number;
  expectedWaitTime: number;
  expectedEnergyCost: number;
  optimizationTime: number;
}

export interface ValueIterationConfig {
  gamma: number;
  theta: number;
  maxIterations: number;
  asyncUpdate: boolean;
  learningRate: number;
}
