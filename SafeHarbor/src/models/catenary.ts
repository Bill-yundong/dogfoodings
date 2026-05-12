import type { CatenaryPoint, Ship, Anchorage, WeatherCondition, AnchorStatus } from '../types';

export class DynamicCatenaryModel {
  private readonly chainWeightPerMeter: number = 0.15;
  private readonly waterDensity: number = 1025;
  private readonly gravity: number = 9.81;

  calculateStaticCatenary(
    chainLength: number,
    waterDepth: number,
    horizontalTension: number
  ): CatenaryPoint[] {
    const points: CatenaryPoint[] = [];
    const c = horizontalTension / (this.chainWeightPerMeter * this.gravity);
    const numPoints = 50;

    for (let i = 0; i <= numPoints; i++) {
      const x = (i / numPoints) * chainLength * 0.8;
      const y = c * Math.cosh(x / c) - c;
      const tension = horizontalTension * Math.cosh(x / c);
      
      if (y <= waterDepth) {
        points.push({ x, y: waterDepth - y, tension });
      }
    }

    return points;
  }

  calculateEnvironmentalForces(
    ship: Ship,
    weather: WeatherCondition,
    currentSpeed: number,
    _currentDirection: number
  ): { horizontalForce: number; verticalForce: number } {
    const windArea = ship.length * ship.draft * 0.6;
    const windForce = 0.5 * 1.225 * windArea * Math.pow(weather.windSpeed, 2) * 0.8;

    const waterPlaneArea = ship.length * ship.width * 0.8;
    const currentForce = 0.5 * this.waterDensity * waterPlaneArea * Math.pow(currentSpeed, 2) * 0.5;

    const waveForce = ship.grossTonnage * this.gravity * weather.waveHeight * 0.02;

    const horizontalForce = windForce + currentForce * 0.5 + waveForce * 0.3;
    const verticalForce = waveForce * 0.1;

    return { horizontalForce, verticalForce };
  }

  calculateHoldingPower(
    anchorage: Anchorage,
    scope: number,
    anchorWeight: number
  ): number {
    const holdingCapacityFactor: Record<string, number> = {
      mud: 12,
      clay: 10,
      sand: 8,
      rock: 5,
      mixed: 9
    };

    const factor = holdingCapacityFactor[anchorage.geologyType] || 8;
    const scopeEffect = Math.min(scope / 5, 1.5);
    const depthEffect = Math.max(1 - (anchorage.depth - 20) / 100, 0.7);

    return anchorWeight * factor * scopeEffect * depthEffect * anchorage.holdingCapacity * 1000;
  }

  calculateDragRisk(
    holdingPower: number,
    environmentalForce: number,
    scope: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const safetyFactor = holdingPower / environmentalForce;

    if (safetyFactor > 3 && scope > 5) {
      return 'low';
    } else if (safetyFactor > 2 && scope > 4) {
      return 'medium';
    } else if (safetyFactor > 1.2) {
      return 'high';
    } else {
      return 'critical';
    }
  }

  async simulateAnchorStability(
    ship: Ship,
    anchorage: Anchorage,
    weather: WeatherCondition,
    currentSpeed: number,
    currentDirection: number,
    chainScope: number
  ): Promise<AnchorStatus> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const waterDepth = anchorage.depth;
        const chainLength = chainScope * waterDepth;
        
        const forces = this.calculateEnvironmentalForces(ship, weather, currentSpeed, currentDirection);
        this.calculateStaticCatenary(chainLength, waterDepth, forces.horizontalForce);
        const holdingPower = this.calculateHoldingPower(anchorage, chainScope, ship.anchorWeight);
        const dragRisk = this.calculateDragRisk(holdingPower, forces.horizontalForce, chainScope);

        resolve({
          shipId: ship.id,
          anchorageId: anchorage.id,
          timestamp: Date.now(),
          scope: chainScope,
          holdingPower,
          dragRisk,
          position: {
            latitude: anchorage.latitude + (Math.random() - 0.5) * 0.01,
            longitude: anchorage.longitude + (Math.random() - 0.5) * 0.01
          },
          weather
        });
      }, 100);
    });
  }

  async dynamicSimulation(
    ship: Ship,
    anchorage: Anchorage,
    initialWeather: WeatherCondition,
    currentSpeed: number,
    currentDirection: number,
    duration: number,
    interval: number
  ): Promise<AnchorStatus[]> {
    const results: AnchorStatus[] = [];
    const steps = Math.floor(duration / interval);

    for (let i = 0; i < steps; i++) {
      const weatherVariation = {
        windSpeed: initialWeather.windSpeed * (1 + (Math.random() - 0.5) * 0.2),
        windDirection: initialWeather.windDirection + (Math.random() - 0.5) * 10,
        waveHeight: initialWeather.waveHeight * (1 + (Math.random() - 0.5) * 0.3),
        wavePeriod: initialWeather.wavePeriod * (1 + (Math.random() - 0.5) * 0.1)
      };

      const scopeVariation = 5 + (Math.random() - 0.5) * 1;

      const status = await this.simulateAnchorStability(
        ship,
        anchorage,
        weatherVariation,
        currentSpeed * (1 + (Math.random() - 0.5) * 0.1),
        currentDirection,
        scopeVariation
      );

      status.timestamp = Date.now() + i * interval * 1000;
      results.push(status);
    }

    return results;
  }
}

export const catenaryModel = new DynamicCatenaryModel();

export const getRiskColor = (risk: 'low' | 'medium' | 'high' | 'critical'): string => {
  const colors = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
  };
  return colors[risk];
};

export const getRiskLabel = (risk: 'low' | 'medium' | 'high' | 'critical'): string => {
  const labels = {
    low: '低风险',
    medium: '中等风险',
    high: '高风险',
    critical: '危急风险'
  };
  return labels[risk];
};
