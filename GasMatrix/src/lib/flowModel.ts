import type { PipeSegment, FlowModelResult, PressureStation, PredictionResult } from '@/types';

const GAS_CONSTANT = 518.3;
const GAS_DENSITY_STP = 0.7174;
const SPECIFIC_HEAT_RATIO = 1.3;

function calculateReynoldsNumber(
  velocity: number,
  diameter: number,
  viscosity: number = 1.1e-5
): number {
  return (velocity * diameter) / viscosity;
}

function calculateFrictionFactor(
  ReynoldsNumber: number,
  roughness: number,
  diameter: number
): number {
  if (ReynoldsNumber < 2300) {
    return 64 / ReynoldsNumber;
  }

  const relativeRoughness = roughness / diameter;
  let f = 0.02;
  
  for (let i = 0; i < 10; i++) {
    const left = 1 / Math.sqrt(f);
    const right =
      -2 *
      Math.log10(relativeRoughness / 3.7 + 2.51 / (ReynoldsNumber * Math.sqrt(f)));
    if (Math.abs(left - right) < 1e-6) break;
    f = 1 / Math.pow(right, 2);
  }

  return f;
}

export function calculateQuasi1DFlow(
  segment: PipeSegment,
  inletPressure: number,
  outletPressure: number,
  inletTemperature: number = 288.15,
  numNodes: number = 50
): FlowModelResult {
  const { length, diameter, roughness } = segment;
  const dx = length / numNodes;
  const area = (Math.PI * Math.pow(diameter, 2)) / 4;

  const pressureDistribution: number[] = new Array(numNodes).fill(0);
  const velocityDistribution: number[] = new Array(numNodes).fill(0);

  const avgPressure = (inletPressure + outletPressure) / 2;
  const avgDensity = avgPressure / (GAS_CONSTANT * inletTemperature);
  const pressureDrop = inletPressure - outletPressure;

  const initialVelocity = Math.sqrt(
    (2 * Math.abs(pressureDrop)) / avgDensity / length * diameter / 0.02
  );

  pressureDistribution[0] = inletPressure;
  velocityDistribution[0] = initialVelocity;

  for (let i = 1; i < numNodes; i++) {
    const prevPressure = pressureDistribution[i - 1];
    const prevVelocity = velocityDistribution[i - 1];

    const density = prevPressure / (GAS_CONSTANT * inletTemperature);
    const Re = calculateReynoldsNumber(prevVelocity, diameter);
    const f = calculateFrictionFactor(Re, roughness, diameter);

    const dPdx = -(f * density * Math.pow(prevVelocity, 2)) / (2 * diameter);
    const pressureDropSegment = dPdx * dx;

    pressureDistribution[i] = Math.max(prevPressure + pressureDropSegment, 1000);

    const newDensity = pressureDistribution[i] / (GAS_CONSTANT * inletTemperature);
    velocityDistribution[i] = (density * prevVelocity) / newDensity;
  }

  let totalVolume = 0;
  let totalMass = 0;

  for (let i = 0; i < numNodes; i++) {
    const density = pressureDistribution[i] / (GAS_CONSTANT * inletTemperature);
    totalVolume += area * dx;
    totalMass += density * area * dx;
  }

  const avgRe = calculateReynoldsNumber(
    velocityDistribution.reduce((a, b) => a + b, 0) / numNodes,
    diameter
  );
  const avgFriction = calculateFrictionFactor(avgRe, roughness, diameter);

  return {
    pressureDistribution,
    velocityDistribution,
    storageVolume: totalVolume,
    storageMass: totalMass,
    ReynoldsNumber: avgRe,
    frictionFactor: avgFriction,
  };
}

export function calculateNetworkStorage(
  stations: PressureStation[],
  segments: PipeSegment[],
  pressureData: Record<string, number>
): number {
  let totalStorage = 0;

  for (const segment of segments) {
    const fromPressure = pressureData[segment.fromStation] || 300000;
    const toPressure = pressureData[segment.toStation] || 300000;

    const result = calculateQuasi1DFlow(segment, fromPressure, toPressure);
    totalStorage += result.storageMass;
  }

  return totalStorage;
}

export function predictPressureTrend(
  historicalData: { timestamp: number; pressure: number; flow: number }[],
  hoursToPredict: number = 24,
  intervalMinutes: number = 15
): PredictionResult[] {
  const predictions: PredictionResult[] = [];
  const now = Date.now();

  if (historicalData.length < 10) {
    for (let i = 0; i < (hoursToPredict * 60) / intervalMinutes; i++) {
      const timestamp = now + i * intervalMinutes * 60 * 1000;
      const lastPressure = historicalData[historicalData.length - 1]?.pressure || 300000;
      predictions.push({
        timestamp,
        predictedPressure: lastPressure,
        predictedFlow: historicalData[historicalData.length - 1]?.flow || 100,
        confidence: 0.5,
        lowerBound: lastPressure * 0.95,
        upperBound: lastPressure * 1.05,
      });
    }
    return predictions;
  }

  const recentData = historicalData.slice(-100);
  const pressureValues = recentData.map((d) => d.pressure);
  const flowValues = recentData.map((d) => d.flow);

  const avgPressure = pressureValues.reduce((a, b) => a + b, 0) / pressureValues.length;
  const stdPressure = Math.sqrt(
    pressureValues.reduce((sum, val) => sum + Math.pow(val - avgPressure, 2), 0) / pressureValues.length
  );

  const avgFlow = flowValues.reduce((a, b) => a + b, 0) / flowValues.length;
  const stdFlow = Math.sqrt(
    flowValues.reduce((sum, val) => sum + Math.pow(val - avgFlow, 2), 0) / flowValues.length
  );

  const hourOfDay = new Date().getHours();
  const isPeakHour = hourOfDay >= 6 && hourOfDay <= 9 || hourOfDay >= 17 && hourOfDay <= 21;
  const peakFactor = isPeakHour ? 0.92 : 1.0;

  for (let i = 0; i < (hoursToPredict * 60) / intervalMinutes; i++) {
    const timestamp = now + i * intervalMinutes * 60 * 1000;
    const predictionHour = new Date(timestamp).getHours();
    const isPredictionPeak = predictionHour >= 6 && predictionHour <= 9 || predictionHour >= 17 && predictionHour <= 21;
    
    const timeFactor = i / ((hoursToPredict * 60) / intervalMinutes);
    const decayFactor = 1 - timeFactor * 0.3;
    const peakAdjustment = isPredictionPeak ? 0.93 : 1.0;

    const randomVariation = (Math.random() - 0.5) * 0.02;
    const trendComponent = Math.sin(i * 0.1) * stdPressure * 0.3;

    const predictedPressure = avgPressure * peakAdjustment * (1 + randomVariation) + trendComponent;
    const predictedFlow = avgFlow * peakAdjustment * (1 + (Math.random() - 0.5) * 0.1);

    const confidence = Math.max(0.3, 0.9 - timeFactor * 0.4);
    const uncertainty = stdPressure * (1 + timeFactor * 0.5);

    predictions.push({
      timestamp,
      predictedPressure: Math.round(predictedPressure),
      predictedFlow: Math.round(predictedFlow * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      lowerBound: Math.round(predictedPressure - uncertainty * decayFactor),
      upperBound: Math.round(predictedPressure + uncertainty * decayFactor),
    });
  }

  return predictions;
}

export function generatePeakingScheme(
  stations: PressureStation[],
  currentPressures: Record<string, number>,
  targetTotalStorage: number
): { stationId: string; targetPressure: number; priority: number }[] {
  const adjustments: { stationId: string; targetPressure: number; priority: number }[] = [];
  
  const avgPressure = Object.values(currentPressures).reduce((a, b) => a + b, 0) / Object.values(currentPressures).length;
  const pressureDeficit = targetTotalStorage > 0 ? 1.05 : 0.95;

  for (const station of stations) {
    const currentPressure = currentPressures[station.id] || station.normalPressure;
    const pressureDiff = currentPressure - station.normalPressure;
    
    let targetPressure = station.normalPressure;
    let priority = 5;

    if (pressureDiff > station.normalPressure * 0.1) {
      targetPressure = station.normalPressure * pressureDeficit;
      priority = 1;
    } else if (pressureDiff < -station.normalPressure * 0.1) {
      targetPressure = station.normalPressure * (2 - pressureDeficit);
      priority = 1;
    } else if (Math.abs(pressureDiff) > station.normalPressure * 0.05) {
      targetPressure = station.normalPressure * (1 + (targetTotalStorage > 0 ? 0.03 : -0.03));
      priority = 3;
    }

    targetPressure = Math.max(station.minPressure, Math.min(station.maxPressure, targetPressure));

    adjustments.push({
      stationId: station.id,
      targetPressure: Math.round(targetPressure),
      priority,
    });
  }

  return adjustments.sort((a, b) => a.priority - b.priority);
}

export function calculatePressureColor(pressure: number, min: number, max: number): string {
  const normalized = (pressure - min) / (max - min);
  
  if (normalized < 0.2) {
    return '#3B82F6';
  } else if (normalized < 0.4) {
    return '#10B981';
  } else if (normalized < 0.6) {
    return '#F59E0B';
  } else if (normalized < 0.8) {
    return '#F97316';
  } else {
    return '#EF4444';
  }
}

export function formatPressure(pressure: number, unit: 'kPa' | 'MPa' | 'bar' = 'kPa'): string {
  switch (unit) {
    case 'MPa':
      return (pressure / 1000000).toFixed(2) + ' MPa';
    case 'bar':
      return (pressure / 100000).toFixed(2) + ' bar';
    default:
      return (pressure / 1000).toFixed(1) + ' kPa';
  }
}

export function formatFlow(flow: number, unit: 'm³/h' | 'm³/s' = 'm³/h'): string {
  switch (unit) {
    case 'm³/s':
      return flow.toFixed(3) + ' m³/s';
    default:
      return (flow * 3600).toFixed(1) + ' m³/h';
  }
}
