import type { BatterySnapshot, Battery, SOHTrendPoint, BatteryHealthPrediction, BatteryAlert } from '@/types';

const SOH_DEGRADATION_RATE = 0.0002;
const CYCLE_DEGRADATION_FACTOR = 0.0001;
const TEMPERATURE_DEGRADATION_FACTOR = 0.001;
const CRITICAL_SOH_THRESHOLD = 0.7;
const WARNING_SOH_THRESHOLD = 0.85;

export class SOHCalculator {
  public calculateSOH(
    battery: Battery,
    recentSnapshots: BatterySnapshot[]
  ): number {
    if (recentSnapshots.length === 0) {
      return 1 - (battery.cycleCount * CYCLE_DEGRADATION_FACTOR);
    }

    const cycleDegradation = battery.cycleCount * CYCLE_DEGRADATION_FACTOR;
    
    const avgTemperature = recentSnapshots.reduce((sum, s) => sum + s.temperature, 0) / recentSnapshots.length;
    const temperatureStress = Math.max(0, avgTemperature - 35) * TEMPERATURE_DEGRADATION_FACTOR;
    
    const capacityFade = recentSnapshots.reduce((sum, s) => {
      return sum + Math.abs(s.voltage - battery.nominalVoltage) / battery.nominalVoltage;
    }, 0) / recentSnapshots.length * 0.1;

    const soh = 1 - cycleDegradation - temperatureStress - capacityFade;
    
    return Math.max(0, Math.min(1, soh));
  }

  public calculateSOHFromSnapshot(snapshot: BatterySnapshot, nominalCapacity: number): number {
    const capacityRatio = snapshot.energy / (nominalCapacity * snapshot.soc);
    return Math.max(0, Math.min(1, capacityRatio));
  }

  public analyzeTrend(snapshots: BatterySnapshot[]): SOHTrendPoint[] {
    return snapshots
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(s => ({
        timestamp: s.timestamp,
        soh: s.soh,
        cycleCount: s.cycleCount,
        temperature: s.temperature
      }));
  }

  public detectAnomalies(snapshots: BatterySnapshot[]): BatteryAlert[] {
    const alerts: BatteryAlert[] = [];
    
    for (const snapshot of snapshots) {
      if (snapshot.temperature > 55) {
        alerts.push({
          id: `overheat_${snapshot.id}`,
          batteryId: snapshot.batteryId,
          type: 'overheat',
          severity: 'critical',
          timestamp: snapshot.timestamp,
          value: snapshot.temperature,
          threshold: 55,
          acknowledged: false
        });
      }

      if (snapshot.soh < CRITICAL_SOH_THRESHOLD) {
        alerts.push({
          id: `low_soh_${snapshot.id}`,
          batteryId: snapshot.batteryId,
          type: 'low_soh',
          severity: snapshot.soh < 0.6 ? 'critical' : 'warning',
          timestamp: snapshot.timestamp,
          value: snapshot.soh,
          threshold: CRITICAL_SOH_THRESHOLD,
          acknowledged: false
        });
      }

      if (snapshot.cellData.length > 1) {
        const voltages = snapshot.cellData.map(c => c.voltage);
        const maxVoltage = Math.max(...voltages);
        const minVoltage = Math.min(...voltages);
        const imbalance = maxVoltage - minVoltage;
        
        if (imbalance > 0.05) {
          alerts.push({
            id: `imbalance_${snapshot.id}`,
            batteryId: snapshot.batteryId,
            type: 'cell_imbalance',
            severity: imbalance > 0.1 ? 'critical' : 'warning',
            timestamp: snapshot.timestamp,
            value: imbalance,
            threshold: 0.05,
            acknowledged: false
          });
        }
      }
    }

    return alerts;
  }
}

export class DegradationModel {
  private baselineDegradationRate: number;

  constructor(baselineRate: number = SOH_DEGRADATION_RATE) {
    this.baselineDegradationRate = baselineRate;
  }

  public predictDegradation(
    initialSOH: number,
    cycles: number,
    avgTemperature: number,
    avgDOD: number
  ): number {
    const cycleFactor = Math.pow(cycles * 0.001, 0.5);
    const tempFactor = 1 + Math.max(0, (avgTemperature - 25) / 20);
    const dodFactor = 1 + Math.max(0, (avgDOD - 0.5) / 2);
    
    const degradation = this.baselineDegradationRate * cycleFactor * tempFactor * dodFactor * cycles;
    
    return Math.max(0, initialSOH - degradation);
  }

  public predictRemainingLife(
    currentSOH: number,
    currentCycles: number,
    dailyCycles: number,
    avgTemperature: number,
    avgDOD: number,
    endOfLifeSOH: number = CRITICAL_SOH_THRESHOLD
  ): { days: number; cycles: number } {
    if (currentSOH <= endOfLifeSOH) {
      return { days: 0, cycles: 0 };
    }

    let remainingSOH = currentSOH - endOfLifeSOH;
    let cycles = currentCycles;
    let days = 0;

    while (remainingSOH > 0 && days < 3650) {
      cycles += dailyCycles;
      const newSOH = this.predictDegradation(currentSOH, cycles - currentCycles, avgTemperature, avgDOD);
      remainingSOH = newSOH - endOfLifeSOH;
      days++;
    }

    return {
      days,
      cycles: cycles - currentCycles
    };
  }

  public generateHealthPrediction(
    battery: Battery,
    recentSnapshots: BatterySnapshot[],
    predictionDays: number = 365
  ): BatteryHealthPrediction {
    const calculator = new SOHCalculator();
    const currentSOH = calculator.calculateSOH(battery, recentSnapshots);
    
    const avgTemperature = recentSnapshots.length > 0
      ? recentSnapshots.reduce((sum, s) => sum + s.temperature, 0) / recentSnapshots.length
      : 25;
    
    const dailyCycles = recentSnapshots.length > 0
      ? recentSnapshots.filter(s => s.operationPhase === 'takeoff' || s.operationPhase === 'landing').length / 7
      : 3;

    const projectedSOH: number[] = [];
    const projectedCycles: number[] = [];
    let cycles = battery.cycleCount;

    for (let day = 0; day <= predictionDays; day += 7) {
      const soh = this.predictDegradation(currentSOH, cycles - battery.cycleCount, avgTemperature, 0.6);
      projectedSOH.push(soh);
      projectedCycles.push(cycles);
      cycles += dailyCycles * 7;
    }

    const remainingLife = this.predictRemainingLife(currentSOH, battery.cycleCount, dailyCycles, avgTemperature, 0.6);
    const expectedEndOfLife = new Date(Date.now() + remainingLife.days * 24 * 60 * 60 * 1000);
    
    const riskLevel = currentSOH < 0.7 ? 'critical' 
      : currentSOH < 0.8 ? 'high' 
      : currentSOH < 0.9 ? 'medium' 
      : 'low';

    return {
      batteryId: battery.id,
      predictionDate: new Date(),
      projectedSOH,
      projectedCycles,
      expectedEndOfLife,
      confidence: 0.85,
      recommendedReplacementDate: currentSOH < WARNING_SOH_THRESHOLD ? expectedEndOfLife : undefined,
      riskLevel
    };
  }
}

export const sohCalculator = new SOHCalculator();
export const degradationModel = new DegradationModel();
