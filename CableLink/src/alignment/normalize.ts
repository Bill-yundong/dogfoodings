import type { TemperaturePoint } from '@/types';

export interface RawSensorData {
  [key: string]: unknown;
}

export interface NormalizationRule {
  sourceField: string;
  targetField: string;
  transform: (value: unknown) => number | string | boolean;
  unit: string;
  required: boolean;
}

export const defaultNormalizationRules: NormalizationRule[] = [
  {
    sourceField: 'timestamp',
    targetField: 'timestamp',
    transform: (v) => typeof v === 'number' ? v : new Date(String(v)).getTime(),
    unit: 'ms',
    required: true
  },
  {
    sourceField: 'sensorId',
    targetField: 'sensorId',
    transform: (v) => String(v),
    unit: 'string',
    required: true
  },
  {
    sourceField: 'temperature',
    targetField: 'temperature',
    transform: (v) => Number(v),
    unit: '°C',
    required: true
  },
  {
    sourceField: 'current',
    targetField: 'current',
    transform: (v) => Number(v),
    unit: 'A',
    required: true
  },
  {
    sourceField: 'voltage',
    targetField: 'voltage',
    transform: (v) => Number(v),
    unit: 'kV',
    required: false
  },
  {
    sourceField: 'distance',
    targetField: 'position.distance',
    transform: (v) => Number(v),
    unit: 'm',
    required: true
  },
  {
    sourceField: 'depth',
    targetField: 'position.depth',
    transform: (v) => Number(v),
    unit: 'm',
    required: true
  },
  {
    sourceField: 'ambientTemp',
    targetField: 'ambientTemp',
    transform: (v) => Number(v),
    unit: '°C',
    required: false
  }
];

export function normalizeSensorData(
  rawData: RawSensorData,
  rules: NormalizationRule[] = defaultNormalizationRules
): Partial<TemperaturePoint> {
  const normalized: Partial<TemperaturePoint> = {};

  for (const rule of rules) {
    const value = getNestedValue(rawData, rule.sourceField);

    if (value === undefined || value === null) {
      if (rule.required) {
        throw new Error(`Missing required field: ${rule.sourceField}`);
      }
      continue;
    }

    try {
      const transformed = rule.transform(value);
      setNestedValue(normalized, rule.targetField, transformed);
    } catch (e) {
      if (rule.required) {
        throw new Error(`Failed to transform field ${rule.sourceField}: ${(e as Error).message}`);
      }
    }
  }

  return normalized;
}

function getNestedValue(obj: RawSensorData, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) {
      current[key] = {};
    }
    return current[key] as Record<string, unknown>;
  }, obj);
  target[lastKey] = value;
}

export function alignTimeSeries(
  dataStreams: Array<{ data: TemperaturePoint[]; sensorId: string }>,
  targetIntervalMs: number,
  startTime?: number,
  endTime?: number
): TemperaturePoint[][] {
  const actualStart = startTime || Math.min(...dataStreams.map(s =>
    Math.min(...s.data.map(d => d.timestamp))
  ));
  const actualEnd = endTime || Math.max(...dataStreams.map(s =>
    Math.max(...s.data.map(d => d.timestamp))
  ));

  const timestamps: number[] = [];
  for (let t = actualStart; t <= actualEnd; t += targetIntervalMs) {
    timestamps.push(t);
  }

  return dataStreams.map(stream =>
    timestamps.map(targetTime => {
      const interpolated = interpolateDataPoint(stream.data, targetTime);
      return { ...interpolated, sensorId: stream.sensorId };
    })
  );
}

function interpolateDataPoint(data: TemperaturePoint[], targetTime: number): TemperaturePoint {
  if (data.length === 0) {
    throw new Error('Empty data array');
  }

  if (data.length === 1) {
    return { ...data[0], timestamp: targetTime };
  }

  let before: TemperaturePoint | null = null;
  let after: TemperaturePoint | null = null;

  for (const point of data) {
    if (point.timestamp <= targetTime) {
      before = point;
    }
    if (point.timestamp >= targetTime) {
      after = point;
      break;
    }
  }

  if (!before) before = data[0];
  if (!after) after = data[data.length - 1];

  if (before.timestamp === after.timestamp) {
    return { ...before, timestamp: targetTime };
  }

  const ratio = (targetTime - before.timestamp) / (after.timestamp - before.timestamp);

  return {
    timestamp: targetTime,
    sensorId: before.sensorId,
    position: before.position,
    temperature: linearInterpolate(before.temperature, after.temperature, ratio),
    current: linearInterpolate(before.current, after.current, ratio),
    voltage: linearInterpolate(before.voltage, after.voltage, ratio),
    ambientTemp: linearInterpolate(before.ambientTemp, after.ambientTemp, ratio)
  };
}

function linearInterpolate(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}

export function validateDataQuality(
  data: TemperaturePoint[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (data.length === 0) {
    issues.push('Empty dataset');
    return { valid: false, issues };
  }

  const temperatureValues = data.map(d => d.temperature).filter(t => !isNaN(t));
  if (temperatureValues.length < data.length * 0.9) {
    issues.push(`High missing rate in temperature data: ${((data.length - temperatureValues.length) / data.length * 100).toFixed(1)}%`);
  }

  const tempRange = { min: -20, max: 150 };
  const outOfRange = temperatureValues.filter(t => t < tempRange.min || t > tempRange.max);
  if (outOfRange.length > 0) {
    issues.push(`${outOfRange.length} temperature values out of expected range [${tempRange.min}°C, ${tempRange.max}°C]`);
  }

  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
  for (let i = 1; i < sortedData.length; i++) {
    const tempDiff = Math.abs(sortedData[i].temperature - sortedData[i - 1].temperature);
    const timeDiff = (sortedData[i].timestamp - sortedData[i - 1].timestamp) / 1000;
    if (timeDiff > 0 && tempDiff / timeDiff > 10) {
      issues.push(`Abnormal temperature rate of change: ${(tempDiff / timeDiff).toFixed(2)}°C/s at ${new Date(sortedData[i].timestamp).toISOString()}`);
      break;
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

export function convertUnit(value: number, fromUnit: string, toUnit: string): number {
  const conversions: Record<string, Record<string, (v: number) => number>> = {
    '°C': {
      '°F': (c) => c * 9 / 5 + 32,
      'K': (c) => c + 273.15
    },
    '°F': {
      '°C': (f) => (f - 32) * 5 / 9,
      'K': (f) => (f + 459.67) * 5 / 9
    },
    'K': {
      '°C': (k) => k - 273.15,
      '°F': (k) => k * 9 / 5 - 459.67
    },
    'A': {
      'kA': (a) => a / 1000,
      'mA': (a) => a * 1000
    },
    'V': {
      'kV': (v) => v / 1000,
      'mV': (v) => v * 1000
    },
    'm': {
      'km': (m) => m / 1000,
      'ft': (m) => m * 3.28084
    }
  };

  if (fromUnit === toUnit) return value;

  const converter = conversions[fromUnit]?.[toUnit];
  if (!converter) {
    throw new Error(`No conversion available from ${fromUnit} to ${toUnit}`);
  }

  return converter(value);
}
