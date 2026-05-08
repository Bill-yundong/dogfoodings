import type { CrowdPressure, TrainSchedule, CapacityPrediction } from "@/types";

export class QueuingEngine {
  private arrivalRate: number;
  private serviceRate: number;
  private numServers: number;
  
  constructor(arrivalRate: number = 0, serviceRate: number = 0, numServers: number = 1) {
    this.arrivalRate = arrivalRate;
    this.serviceRate = serviceRate;
    this.numServers = numServers;
  }
  
  setParams(arrivalRate: number, serviceRate: number, numServers: number = 1): void {
    this.arrivalRate = arrivalRate;
    this.serviceRate = serviceRate;
    this.numServers = numServers;
  }
  
  private factorial(n: number): number {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }
  
  private calculateTrafficIntensity(): number {
    return this.arrivalRate / (this.numServers * this.serviceRate);
  }
  
  private mmnProbabilityOfZero(): number {
    const rho = this.calculateTrafficIntensity();
    if (rho >= 1) return 0;
    
    let sum = 0;
    for (let n = 0; n < this.numServers; n++) {
      sum += Math.pow(this.arrivalRate / this.serviceRate, n) / this.factorial(n);
    }
    
    const lastTerm = Math.pow(this.arrivalRate / this.serviceRate, this.numServers) / 
      (this.factorial(this.numServers) * (1 - rho));
    
    return 1 / (sum + lastTerm);
  }
  
  public calculateAverageQueueLength(): number {
    const rho = this.calculateTrafficIntensity();
    if (rho >= 1) return Number.POSITIVE_INFINITY;
    
    if (this.numServers === 1) {
      return (rho * rho) / (1 - rho);
    }
    
    const p0 = this.mmnProbabilityOfZero();
    const numerator = p0 * Math.pow(this.arrivalRate / this.serviceRate, this.numServers) * rho;
    const denominator = this.factorial(this.numServers) * Math.pow(1 - rho, 2);
    
    return numerator / denominator;
  }
  
  public calculateAverageWaitTime(): number {
    if (this.arrivalRate <= 0) return 0;
    return this.calculateAverageQueueLength() / this.arrivalRate;
  }
  
  public calculateUtilization(): number {
    return this.calculateTrafficIntensity();
  }
  
  public predictCapacityGap(currentDemand: number): number {
    const currentCapacity = this.numServers * this.serviceRate * 0.85;
    return Math.max(0, currentDemand - currentCapacity);
  }
  
  public async predict(
    stationId: string,
    crowdPressure: CrowdPressure,
    trainSchedules: TrainSchedule[]
  ): Promise<CapacityPrediction> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const arrivalRate = crowdPressure.entryRate;
        const serviceRate = trainSchedules.length * (trainSchedules[0]?.capacity || 1000) / 3;
        const numServers = trainSchedules.length;
        
        this.setParams(arrivalRate, serviceRate, numServers);
        
        const trafficIntensity = this.calculateTrafficIntensity();
        const queueLength = this.calculateAverageQueueLength();
        const averageWaitTime = this.calculateAverageWaitTime();
        const utilization = Math.min(1, trafficIntensity);
        const capacityGap = this.predictCapacityGap(arrivalRate);
        const confidence = 0.7 + Math.random() * 0.25;
        
        resolve({
          stationId,
          timestamp: Date.now(),
          predictedArrivalRate: arrivalRate,
          predictedServiceRate: serviceRate,
          averageWaitTime: isFinite(averageWaitTime) ? averageWaitTime : 999,
          queueLength: isFinite(queueLength) ? queueLength : 9999,
          utilization,
          capacityGap,
          confidence,
        });
      }, 100);
    });
  }
}

export const queuingEngine = new QueuingEngine();
