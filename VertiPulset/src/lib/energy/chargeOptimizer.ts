import type { 
  ChargeSession, 
  GridSignal, 
  ChargeCurvePoint, 
  ChargingPlan, 
  V2GResponse,
  EnergyForecast 
} from '@/types';

const FAST_CHARGE_RATE = 1.0;
const NORMAL_CHARGE_RATE = 0.5;
const SLOW_CHARGE_RATE = 0.25;
const V2G_DISCHARGE_RATE = 0.75;

export class ChargeOptimizer {
  public generateChargingPlan(
    batteryId: string,
    currentSOC: number,
    targetSOC: number,
    deadline: Date,
    gridSignals: GridSignal[],
    priority: number = 5
  ): ChargingPlan {
    const now = new Date();
    const timeToDeadline = deadline.getTime() - now.getTime();
    const energyNeeded = targetSOC - currentSOC;
    
    let chargeType: 'fast' | 'normal' | 'slow' = 'normal';
    let scheduledStartTime = now;
    
    if (energyNeeded <= 0) {
      return {
        batteryId,
        priority,
        scheduledStartTime: now,
        scheduledDuration: 0,
        targetSOC,
        chargeType: 'normal',
        estimatedCost: 0,
        constraints: { deadline, minSOC: currentSOC }
      };
    }

    const futureSignals = gridSignals.filter(s => s.timestamp > now && s.timestamp <= deadline);
    
    if (futureSignals.length > 0) {
      const optimalWindow = this.findOptimalChargingWindow(futureSignals, energyNeeded, timeToDeadline);
      scheduledStartTime = optimalWindow.startTime;
      
      if (optimalWindow.signalType === 'valley') {
        chargeType = 'fast';
      } else if (optimalWindow.signalType === 'peak') {
        chargeType = 'slow';
      }
    }

    const chargeRate = chargeType === 'fast' ? FAST_CHARGE_RATE 
      : chargeType === 'normal' ? NORMAL_CHARGE_RATE 
      : SLOW_CHARGE_RATE;
    
    const durationMinutes = (energyNeeded / chargeRate) * 60;
    
    const avgPrice = futureSignals.length > 0
      ? futureSignals.reduce((sum, s) => sum + s.electricityPrice, 0) / futureSignals.length
      : 0.5;
    
    const estimatedCost = energyNeeded * avgPrice;

    return {
      batteryId,
      priority,
      scheduledStartTime,
      scheduledDuration: durationMinutes,
      targetSOC,
      chargeType,
      estimatedCost,
      constraints: { deadline, minSOC: currentSOC }
    };
  }

  private findOptimalChargingWindow(
    signals: GridSignal[],
    energyNeeded: number,
    maxWindowMs: number
  ): { startTime: Date; signalType: string } {
    const sortedSignals = [...signals].sort((a, b) => a.electricityPrice - b.electricityPrice);
    const optimalSignal = sortedSignals[0];
    
    return {
      startTime: optimalSignal.timestamp,
      signalType: optimalSignal.signalType
    };
  }

  public generateChargeCurve(
    startSOC: number,
    endSOC: number,
    durationMinutes: number,
    chargeType: 'fast' | 'normal' | 'slow'
  ): ChargeCurvePoint[] {
    const points: ChargeCurvePoint[] = [];
    const intervalMinutes = 1;
    const totalPoints = durationMinutes / intervalMinutes;
    const startTime = new Date();

    const chargeRate = chargeType === 'fast' ? FAST_CHARGE_RATE 
      : chargeType === 'normal' ? NORMAL_CHARGE_RATE 
      : SLOW_CHARGE_RATE;

    for (let i = 0; i <= totalPoints; i++) {
      const progress = i / totalPoints;
      const soc = startSOC + (endSOC - startSOC) * this.socCurve(progress);
      const power = chargeRate * this.powerCurve(progress);
      const voltage = 3.6 + 0.4 * progress;
      const current = power / voltage * 100;
      const temperature = 25 + 15 * progress;

      points.push({
        timestamp: new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000),
        power,
        soc,
        voltage,
        current,
        temperature
      });
    }

    return points;
  }

  private socCurve(progress: number): number {
    return progress;
  }

  private powerCurve(progress: number): number {
    if (progress < 0.2) return 0.8 + progress;
    if (progress < 0.8) return 1;
    return 1 - (progress - 0.8) * 2.5;
  }

  public optimizeForGridDemand(
    currentLoad: number,
    targetLoad: number,
    availableBatteries: Array<{ id: string; soc: number; maxPower: number }>
  ): V2GResponse[] {
    const loadDeficit = targetLoad - currentLoad;
    
    if (loadDeficit >= 0) {
      return [];
    }

    const requiredPower = Math.abs(loadDeficit);
    const sortedBatteries = [...availableBatteries]
      .filter(b => b.soc > 0.5)
      .sort((a, b) => b.soc - a.soc);

    const responses: V2GResponse[] = [];
    let accumulatedPower = 0;

    for (const battery of sortedBatteries) {
      if (accumulatedPower >= requiredPower) break;

      const dischargePower = Math.min(battery.maxPower * V2G_DISCHARGE_RATE, requiredPower - accumulatedPower);
      const duration = 30;
      const energyDischarged = dischargePower * duration / 60;

      responses.push({
        id: `v2g_${battery.id}_${Date.now()}`,
        sessionId: `session_${battery.id}`,
        requestTime: new Date(),
        targetPower: dischargePower,
        duration,
        energyDischarged,
        revenue: energyDischarged * 0.8,
        status: 'pending'
      });

      accumulatedPower += dischargePower;
    }

    return responses;
  }
}

export class LoadForecaster {
  public forecastLoad(
    historicalData: GridSignal[],
    hours: number = 24
  ): EnergyForecast[] {
    const forecasts: EnergyForecast[] = [];
    const now = new Date();
    
    const dailyPattern = this.extractDailyPattern(historicalData);
    
    for (let i = 0; i < hours; i++) {
      const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hourOfDay = forecastTime.getHours();
      const patternValue = dailyPattern[hourOfDay] || 0.5;
      
      const baseLoad = historicalData.length > 0
        ? historicalData.reduce((sum, d) => sum + d.gridLoad, 0) / historicalData.length
        : 100;
      
      const predictedLoad = baseLoad * patternValue;
      const predictedPrice = 0.4 + 0.4 * patternValue;
      const predictedRenewableRatio = 0.3 + 0.4 * (1 - patternValue);

      forecasts.push({
        timestamp: forecastTime,
        predictedLoad,
        predictedPrice,
        predictedRenewableRatio,
        confidence: 0.7 + Math.random() * 0.25
      });
    }

    return forecasts;
  }

  private extractDailyPattern(data: GridSignal[]): number[] {
    const hourlyLoads: number[][] = Array(24).fill(null).map(() => []);
    
    for (const item of data) {
      const hour = item.timestamp.getHours();
      hourlyLoads[hour].push(item.gridLoad);
    }

    const pattern = hourlyLoads.map(hourData => {
      if (hourData.length === 0) return 0.5;
      return hourData.reduce((a, b) => a + b, 0) / hourData.length;
    });

    const maxPattern = Math.max(...pattern);
    return pattern.map(p => p / maxPattern);
  }
}

export const chargeOptimizer = new ChargeOptimizer();
export const loadForecaster = new LoadForecaster();
