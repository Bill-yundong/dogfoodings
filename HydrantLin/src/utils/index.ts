import { Position, PressureReading, HydrantStatus } from '../types';
import { PRESSURE_THRESHOLDS } from '../constants';

export const generateId = (): string => {
  return `HYD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const calculateDistance = (p1: Position, p2: Position): number => {
  const R = 6371000;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const determineHydrantStatus = (pressure: number): HydrantStatus => {
  if (pressure <= PRESSURE_THRESHOLDS.CRITICAL) {
    return HydrantStatus.CRITICAL;
  }
  if (pressure <= PRESSURE_THRESHOLDS.LOW) {
    return HydrantStatus.LOW_PRESSURE;
  }
  return HydrantStatus.NORMAL;
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const calculatePressureTrend = (
  readings: number[]
): 'rising' | 'falling' | 'stable' => {
  if (readings.length < 2) return 'stable';
  const recent = readings.slice(-5);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const current = readings[readings.length - 1];
  const threshold = 0.02;

  if (current > avg * (1 + threshold)) return 'rising';
  if (current < avg * (1 - threshold)) return 'falling';
  return 'stable';
};

export const calculateAnomalyScore = (
  readings: number[],
  current: number
): number => {
  if (readings.length < 5) return 0;
  const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
  const variance =
    readings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    readings.length;
  const stdDev = Math.sqrt(variance);
  return stdDev === 0 ? 0 : Math.abs(current - mean) / (3 * stdDev);
};

export const mergePressureReadings = (
  reading1: PressureReading,
  reading2: PressureReading
): PressureReading => {
  const totalConfidence = reading1.confidence + reading2.confidence;
  const weightedPressure =
    (reading1.pressure * reading1.confidence +
      reading2.pressure * reading2.confidence) /
    totalConfidence;

  return {
    hydrantId: reading1.hydrantId,
    pressure: weightedPressure,
    timestamp: Math.max(reading1.timestamp, reading2.timestamp),
    source: reading1.source,
    confidence: totalConfidence / 2,
    flowRate:
      reading1.flowRate && reading2.flowRate
        ? (reading1.flowRate + reading2.flowRate) / 2
        : reading1.flowRate || reading2.flowRate,
    temperature:
      reading1.temperature && reading2.temperature
        ? (reading1.temperature + reading2.temperature) / 2
        : reading1.temperature || reading2.temperature,
  };
};
