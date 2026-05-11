import type { CrackPoint, Coordinate, InterpolationResult, TrendSimulation } from '../types';

type InterpolationMethod = 'linear' | 'kriging' | 'idw' | 'spline';

interface InterpolationParameters {
  searchRadius?: number;
  power?: number;
  nugget?: number;
  sill?: number;
  range?: number;
}

class SpatioTemporalInterpolationService {
  private activeSimulations: Map<string, TrendSimulation> = new Map();
  private simulationCompletionCallbacks: Map<string, ((sim: TrendSimulation) => void)[]> = new Map();

  onSimulationComplete(id: string, callback: (sim: TrendSimulation) => void): void {
    if (!this.simulationCompletionCallbacks.has(id)) {
      this.simulationCompletionCallbacks.set(id, []);
    }
    this.simulationCompletionCallbacks.get(id)!.push(callback);
  }

  private triggerCompletionCallbacks(id: string, simulation: TrendSimulation): void {
    const callbacks = this.simulationCompletionCallbacks.get(id);
    if (callbacks) {
      callbacks.forEach(cb => cb(simulation));
      this.simulationCompletionCallbacks.delete(id);
    }
  }

  async interpolateCrack(
    crack: CrackPoint,
    targetDate: string,
    method: InterpolationMethod = 'kriging',
    params: InterpolationParameters = {}
  ): Promise<InterpolationResult> {
    await this.simulateAsyncDelay();

    const targetTime = new Date(targetDate).getTime();
    const detectionTime = new Date(crack.detectionDate).getTime();
    const timeDelta = (targetTime - detectionTime) / (24 * 60 * 60 * 1000);

    let result: InterpolationResult;
    if (timeDelta <= 0) {
      result = this.createHistoricalResult(crack, targetDate, method, params);
    } else {
      const growthRate = this.calculateGrowthRate(crack.severity);
      const predictedPoints = this.generatePredictedPoints(crack, timeDelta, growthRate);
      const predictedWidth = crack.width * (1 + growthRate.width * timeDelta / 365);
      const predictedLength = crack.length * (1 + growthRate.length * timeDelta / 365);
      const confidence = Math.max(0.3, 0.95 - timeDelta * 0.001);

      result = {
        id: `INT-${Date.now()}`,
        crackId: crack.id,
        targetDate,
        predictedPoints,
        predictedWidth: Math.round(predictedWidth * 100) / 100,
        predictedLength: Math.round(predictedLength * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        method,
        parameters: params,
        generatedAt: new Date().toISOString()
      };
    }

    const simulation: TrendSimulation = {
      id: `SIM-${Date.now()}`,
      crackId: crack.id,
      startDate: targetDate,
      endDate: targetDate,
      steps: [result],
      status: 'completed',
      progress: 100,
      createdAt: new Date().toISOString(),
      simulationType: 'single',
      method
    };
    this.activeSimulations.set(simulation.id, simulation);

    return result;
  }

  private createHistoricalResult(
    crack: CrackPoint,
    targetDate: string,
    method: string,
    params: InterpolationParameters
  ): InterpolationResult {
    return {
      id: `INT-${Date.now()}`,
      crackId: crack.id,
      targetDate,
      predictedPoints: [{ ...crack.coordinate }],
      predictedWidth: crack.width,
      predictedLength: crack.length,
      confidence: 1.0,
      method,
      parameters: params,
      generatedAt: new Date().toISOString()
    };
  }

  private calculateGrowthRate(severity: CrackPoint['severity']): { width: number; length: number } {
    const rates: Record<CrackPoint['severity'], { width: number; length: number }> = {
      low: { width: 0.05, length: 0.08 },
      medium: { width: 0.12, length: 0.18 },
      high: { width: 0.25, length: 0.35 },
      critical: { width: 0.4, length: 0.55 }
    };
    return rates[severity];
  }

  private generatePredictedPoints(
    crack: CrackPoint,
    timeDelta: number,
    growthRate: { width: number; length: number }
  ): Coordinate[] {
    const points: Coordinate[] = [];
    const baseTime = new Date(crack.detectionDate).getTime();
    const stepCount = Math.min(Math.ceil(timeDelta / 30), 24);

    for (let i = 0; i <= stepCount; i++) {
      const progress = i / stepCount;
      const timeFactor = timeDelta * progress / 365;

      const newX = crack.coordinate.x + (Math.random() - 0.5) * growthRate.length * timeFactor * 50;
      const newY = crack.coordinate.y + (Math.random() - 0.5) * growthRate.length * timeFactor * 50;

      points.push({
        x: Math.round(newX * 100) / 100,
        y: Math.round(newY * 100) / 100,
        timestamp: baseTime + (timeDelta * 24 * 60 * 60 * 1000) * progress
      });
    }

    return points;
  }

  async startTrendSimulation(
    crack: CrackPoint,
    startDate: string,
    endDate: string,
    intervalDays: number = 30,
    method: InterpolationMethod = 'kriging'
  ): Promise<TrendSimulation> {
    const simulationId = `SIM-${Date.now()}`;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const interval = intervalDays * 24 * 60 * 60 * 1000;

    const simulation: TrendSimulation = {
      id: simulationId,
      crackId: crack.id,
      startDate,
      endDate,
      steps: [],
      status: 'running',
      progress: 0,
      createdAt: new Date().toISOString(),
      simulationType: 'trend',
      method
    };

    this.activeSimulations.set(simulationId, simulation);

    this.runSimulationAsync(simulation, crack, start, end, interval, method);

    return simulation;
  }

  private async runSimulationAsync(
    simulation: TrendSimulation,
    crack: CrackPoint,
    start: number,
    end: number,
    interval: number,
    method: InterpolationMethod
  ): Promise<void> {
    try {
      const totalSteps = Math.ceil((end - start) / interval) + 1;
      let completedSteps = 0;

      for (let time = start; time <= end; time += interval) {
        const targetDate = new Date(time).toISOString().split('T')[0];
        const result = await this.interpolateCrackInternal(crack, targetDate, method);

        simulation.steps.push(result);
        completedSteps++;
        simulation.progress = Math.round((completedSteps / totalSteps) * 100);

        this.activeSimulations.set(simulation.id, { ...simulation });

        await this.simulateAsyncDelay(100);
      }

      simulation.status = 'completed';
      simulation.progress = 100;
      this.activeSimulations.set(simulation.id, { ...simulation });
      this.triggerCompletionCallbacks(simulation.id, simulation);
    } catch (error) {
      simulation.status = 'error';
      this.activeSimulations.set(simulation.id, { ...simulation });
      this.triggerCompletionCallbacks(simulation.id, simulation);
    }
  }

  private async interpolateCrackInternal(
    crack: CrackPoint,
    targetDate: string,
    method: InterpolationMethod,
    params: InterpolationParameters = {}
  ): Promise<InterpolationResult> {
    await this.simulateAsyncDelay();

    const targetTime = new Date(targetDate).getTime();
    const detectionTime = new Date(crack.detectionDate).getTime();
    const timeDelta = (targetTime - detectionTime) / (24 * 60 * 60 * 1000);

    if (timeDelta <= 0) {
      return this.createHistoricalResult(crack, targetDate, method, params);
    }

    const growthRate = this.calculateGrowthRate(crack.severity);
    const predictedPoints = this.generatePredictedPoints(crack, timeDelta, growthRate);
    const predictedWidth = crack.width * (1 + growthRate.width * timeDelta / 365);
    const predictedLength = crack.length * (1 + growthRate.length * timeDelta / 365);
    const confidence = Math.max(0.3, 0.95 - timeDelta * 0.001);

    return {
      id: `INT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      crackId: crack.id,
      targetDate,
      predictedPoints,
      predictedWidth: Math.round(predictedWidth * 100) / 100,
      predictedLength: Math.round(predictedLength * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      method,
      parameters: params,
      generatedAt: new Date().toISOString()
    };
  }

  getSimulation(id: string): TrendSimulation | undefined {
    return this.activeSimulations.get(id);
  }

  getAllSimulations(): TrendSimulation[] {
    return Array.from(this.activeSimulations.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getAvailableMethods(): InterpolationMethod[] {
    return ['linear', 'kriging', 'idw', 'spline'];
  }

  getMethodDescription(method: InterpolationMethod): string {
    const descriptions: Record<InterpolationMethod, string> = {
      linear: '线性插值 - 简单的时间序列线性预测',
      kriging: '克里金插值 - 基于空间统计的最优无偏估计',
      idw: '反距离加权 - 距离越近权重越大的插值方法',
      spline: '样条插值 - 平滑曲线拟合预测'
    };
    return descriptions[method];
  }

  private async simulateAsyncDelay(ms: number = 50): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async interpolateMultipleCracks(
    cracks: CrackPoint[],
    targetDate: string,
    method: InterpolationMethod = 'kriging'
  ): Promise<InterpolationResult[]> {
    const results = await Promise.all(
      cracks.map(crack => this.interpolateCrack(crack, targetDate, method))
    );
    return results;
  }
}

export const interpolationService = new SpatioTemporalInterpolationService();
