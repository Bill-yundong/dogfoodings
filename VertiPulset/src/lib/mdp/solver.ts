import type { MDPState, MDPOperation, MDPReward, TurnoverPrediction, ScheduleOptimizationResult, ValueIterationConfig } from '@/types';

const DEFAULT_CONFIG: ValueIterationConfig = {
  gamma: 0.95,
  theta: 0.001,
  maxIterations: 1000,
  asyncUpdate: true,
  learningRate: 0.1,
};

export class MDPSolver {
  private valueFunction: Map<string, number>;
  private policy: Map<string, MDPOperation>;
  private config: ValueIterationConfig;
  private stateTransitionModel: Map<string, Map<string, { nextState: string; probability: number }>>;

  constructor(config?: Partial<ValueIterationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.valueFunction = new Map();
    this.policy = new Map();
    this.stateTransitionModel = new Map();
  }

  public getPossibleActions(state: MDPState): MDPOperation[] {
    const actions: MDPOperation[] = [];
    const availableRunways = state.runwayUtilization.filter(u => u < 0.8).length;
    
    if (state.flightQueueLength > 0 && availableRunways > 0) {
      actions.push({
        type: 'allocate_runway',
        targetId: 'next_flight',
        parameters: { priority: 'earliest' }
      });
    }

    if (state.flightQueueLength > 5) {
      actions.push({
        type: 'reorder_queue',
        targetId: 'queue',
        parameters: { strategy: 'min_wait' }
      });
    }

    state.batteryStates.forEach(battery => {
      if (battery.soc < 0.3 && !battery.isCharging) {
        actions.push({
          type: 'start_charging',
          targetId: battery.batteryId,
          parameters: { chargeRate: 'fast' }
        });
      }
      if (battery.soc > 0.7 && battery.isCharging && state.gridLoad > 0.8) {
        actions.push({
          type: 'v2g_discharge',
          targetId: battery.batteryId,
          parameters: { power: 0.5 }
        });
      }
    });

    if (state.weatherScore < 0.5) {
      actions.push({
        type: 'delay_flight',
        targetId: 'all',
        parameters: { delayMinutes: 15 }
      });
    }

    return actions;
  }

  public calculateReward(state: MDPState, action: MDPOperation): MDPReward {
    let throughput = 0;
    let waitTime = 0;
    let energyCost = 0;
    let batteryHealth = 0;
    let gridStability = 0;

    switch (action.type) {
      case 'allocate_runway':
        throughput = 10;
        waitTime = -state.averageWaitTime * 0.5;
        break;
      case 'reorder_queue':
        waitTime = state.flightQueueLength * 2;
        break;
      case 'start_charging':
        energyCost = -5;
        batteryHealth = 2;
        gridStability = state.gridLoad < 0.7 ? 3 : -2;
        break;
      case 'v2g_discharge':
        energyCost = 8;
        batteryHealth = -1;
        gridStability = 5;
        break;
      case 'delay_flight':
        throughput = -5;
        waitTime = -3;
        batteryHealth = 1;
        break;
    }

    const total = throughput + waitTime + energyCost + batteryHealth + gridStability;

    return {
      value: total,
      components: { throughput, waitTime, energyCost, batteryHealth, gridStability }
    };
  }

  public async asyncValueIteration(states: MDPState[]): Promise<void> {
    let iteration = 0;
    let delta = Infinity;

    while (delta > this.config.theta && iteration < this.config.maxIterations) {
      delta = 0;
      iteration++;

      const shuffledStates = [...states].sort(() => Math.random() - 0.5);

      for (const state of shuffledStates) {
        const stateId = state.id;
        const oldValue = this.valueFunction.get(stateId) || 0;
        
        const actions = this.getPossibleActions(state);
        let maxValue = -Infinity;
        let bestAction: MDPOperation | null = null;

        for (const action of actions) {
          const reward = this.calculateReward(state, action);
          const expectedFutureValue = await this.getExpectedFutureValue(state, action);
          const actionValue = reward.value + this.config.gamma * expectedFutureValue;

          if (actionValue > maxValue) {
            maxValue = actionValue;
            bestAction = action;
          }
        }

        const newValue = maxValue === -Infinity ? 0 : maxValue;
        this.valueFunction.set(stateId, newValue);
        
        if (bestAction) {
          this.policy.set(stateId, bestAction);
        }

        delta = Math.max(delta, Math.abs(oldValue - newValue));
      }

      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  private async getExpectedFutureValue(state: MDPState, action: MDPOperation): Promise<number> {
    const transitions = this.stateTransitionModel.get(state.id);
    if (!transitions) return 0;

    let expectedValue = 0;
    for (const { nextState, probability } of transitions.values()) {
      const value = this.valueFunction.get(nextState) || 0;
      expectedValue += probability * value;
    }

    return expectedValue;
  }

  public predictTurnover(
    currentState: MDPState,
    horizonMinutes: number,
    historicalData: MDPState[]
  ): TurnoverPrediction {
    const timeSteps = horizonMinutes / 5;
    let predictedTurnover = 0;
    let state = currentState;
    const varianceAccumulator: number[] = [];

    for (let i = 0; i < timeSteps; i++) {
      const actions = this.getPossibleActions(state);
      let maxImmediateReward = 0;

      for (const action of actions) {
        const reward = this.calculateReward(state, action);
        if (reward.components.throughput > maxImmediateReward) {
          maxImmediateReward = reward.components.throughput;
        }
      }

      predictedTurnover += maxImmediateReward / 10;

      const simulatedStates = this.simulateNextStates(state, actions);
      const values = simulatedStates.map(s => this.valueFunction.get(s.id) || 0);
      const variance = this.calculateVariance(values);
      varianceAccumulator.push(variance);

      state = simulatedStates[0] || state;
    }

    const meanVariance = varianceAccumulator.reduce((a, b) => a + b, 0) / varianceAccumulator.length;
    const stdDev = Math.sqrt(meanVariance);
    const confidence = 0.95;
    const marginOfError = stdDev * 1.96;

    return {
      timestamp: new Date(),
      horizonMinutes,
      predictedTurnover,
      confidenceInterval: [
        Math.max(0, predictedTurnover - marginOfError),
        predictedTurnover + marginOfError
      ],
      confidence,
      factors: [
        { name: '跑道利用率', contribution: state.runwayUtilization.reduce((a, b) => a + b, 0) / state.runwayUtilization.length },
        { name: '队列长度', contribution: Math.min(1, state.flightQueueLength / 10) },
        { name: '天气条件', contribution: state.weatherScore },
        { name: '电网负载', contribution: 1 - state.gridLoad }
      ]
    };
  }

  private simulateNextStates(state: MDPState, actions: MDPOperation[]): MDPState[] {
    return actions.map((action, index) => ({
      ...state,
      id: `${state.id}_sim_${index}`,
      timestamp: new Date(state.timestamp.getTime() + 5 * 60 * 1000),
      flightQueueLength: Math.max(0, state.flightQueueLength + (Math.random() - 0.5) * 2),
      gridLoad: Math.max(0, Math.min(1, state.gridLoad + (Math.random() - 0.5) * 0.1))
    }));
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  public optimizeSchedule(
    flights: Array<{ id: string; priority: number; earliestTime: Date }>,
    runways: Array<{ id: string; available: boolean }>,
    currentState: MDPState
  ): ScheduleOptimizationResult {
    const startTime = Date.now();
    const allocations: Array<{ runwayId: string; flightId: string; startTime: Date; endTime: Date }> = [];
    
    const sortedFlights = [...flights].sort((a, b) => {
      const priorityDiff = b.priority - a.priority;
      if (priorityDiff !== 0) return priorityDiff;
      return a.earliestTime.getTime() - b.earliestTime.getTime();
    });

    const availableRunways = runways.filter(r => r.available);
    let currentTime = new Date();

    for (let i = 0; i < sortedFlights.length; i++) {
      const flight = sortedFlights[i];
      const runway = availableRunways[i % availableRunways.length];
      
      if (!runway) break;

      const flightStartTime = new Date(Math.max(currentTime.getTime(), flight.earliestTime.getTime()));
      const flightEndTime = new Date(flightStartTime.getTime() + 5 * 60 * 1000);

      allocations.push({
        runwayId: runway.id,
        flightId: flight.id,
        startTime: flightStartTime,
        endTime: flightEndTime
      });

      currentTime = new Date(flightStartTime.getTime() + 2 * 60 * 1000);
    }

    const expectedThroughput = allocations.length;
    const expectedWaitTime = allocations.length > 0 
      ? (allocations[allocations.length - 1].startTime.getTime() - Date.now()) / 60000 
      : 0;
    const expectedEnergyCost = allocations.length * 2.5;

    return {
      allocations,
      expectedThroughput,
      expectedWaitTime,
      expectedEnergyCost,
      optimizationTime: Date.now() - startTime
    };
  }

  public getPolicy(stateId: string): MDPOperation | undefined {
    return this.policy.get(stateId);
  }

  public getValue(stateId: string): number {
    return this.valueFunction.get(stateId) || 0;
  }
}

export const createMDPSolver = (config?: Partial<ValueIterationConfig>) => new MDPSolver(config);
