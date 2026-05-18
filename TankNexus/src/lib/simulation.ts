import type { WeldPoint, RealTimeData, WaveformFeatures, DefectRisk, DeviceStatus } from '@/types';

const WELD_PROGRAMS = ['Steel_Thin_001', 'Steel_Thick_002', 'Aluminum_003', 'Stainless_004', 'Titanium_005'];
const ROBOT_IDS = ['ROBOT-001', 'ROBOT-002', 'ROBOT-003'];

function generateId(): string {
  return `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function generateWaveform(
  baseValue: number,
  variation: number,
  hasDefect: boolean,
  length: number = 200
): number[] {
  const waveform: number[] = [];
  const freq = 0.05 + Math.random() * 0.03;
  
  for (let i = 0; i < length; i++) {
    let value = baseValue;
    value += Math.sin(i * freq) * variation;
    value += Math.sin(i * freq * 2.5) * (variation * 0.3);
    value += Math.sin(i * freq * 4.7) * (variation * 0.15);
    value += (Math.random() - 0.5) * variation * 0.4;
    
    if (hasDefect && i > length * 0.3 && i < length * 0.7) {
      const defectPhase = (i - length * 0.3) / (length * 0.4);
      const defectAmplitude = Math.sin(defectPhase * Math.PI) * variation * 2.5;
      value += defectAmplitude * (0.5 + Math.random() * 0.5);
    }
    
    waveform.push(value);
  }
  
  return waveform;
}

export function extractWaveformFeatures(waveform: number[]): WaveformFeatures {
  const n = waveform.length;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let peakCount = 0;
  let riseTimeSum = 0;
  let decayTimeSum = 0;
  let riseCount = 0;
  let decayCount = 0;
  
  for (let i = 0; i < n; i++) {
    sum += waveform[i];
    if (waveform[i] < min) min = waveform[i];
    if (waveform[i] > max) max = waveform[i];
    
    if (i > 0 && i < n - 1) {
      if (waveform[i] > waveform[i - 1] && waveform[i] > waveform[i + 1]) {
        peakCount++;
      }
      if (waveform[i] > waveform[i - 1]) {
        riseTimeSum++;
      } else if (waveform[i] < waveform[i - 1]) {
        decayTimeSum++;
        if (waveform[i - 1] > waveform[i - 2]) {
          riseCount++;
        }
      }
      if (waveform[i] < waveform[i - 1] && waveform[i - 1] >= waveform[i - 2]) {
        decayCount++;
      }
    }
  }
  
  const avg = sum / n;
  const avgAmplitude = (max - min) / 2;
  
  let variance = 0;
  for (let i = 0; i < n; i++) {
    variance += Math.pow(waveform[i] - avg, 2);
  }
  variance /= n;
  const stdDev = Math.sqrt(variance);
  const frequency = peakCount / (n / 50);
  
  const harmonics: number[] = [];
  for (let h = 1; h <= 5; h++) {
    let harmonicSum = 0;
    for (let i = 0; i < n; i++) {
      harmonicSum += waveform[i] * Math.sin(2 * Math.PI * h * i / n);
    }
    harmonics.push(Math.abs(harmonicSum) / n);
  }
  
  return {
    peakCount,
    avgAmplitude,
    frequency,
    riseTime: riseCount > 0 ? riseTimeSum / riseCount : 0,
    decayTime: decayCount > 0 ? decayTimeSum / decayCount : 0,
    harmonics,
  };
}

export function assessDefectRisk(features: WaveformFeatures, hasDefect: boolean): DefectRisk {
  let score = 0;
  
  if (features.avgAmplitude > 15) score += 2;
  else if (features.avgAmplitude > 10) score += 1;
  
  if (features.frequency > 3) score += 2;
  else if (features.frequency > 2) score += 1;
  
  if (features.peakCount > 15) score += 1;
  
  if (hasDefect) score += 2;
  
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

export function generateWeldPoint(timestamp?: number): WeldPoint {
  const ts = timestamp ?? Date.now();
  const robotId = ROBOT_IDS[Math.floor(Math.random() * ROBOT_IDS.length)];
  const weldProgram = WELD_PROGRAMS[Math.floor(Math.random() * WELD_PROGRAMS.length)];
  const hasDefect = Math.random() < 0.15;
  
  const baseTemp = 1500 + Math.random() * 300;
  const baseCurrent = 180 + Math.random() * 60;
  const baseVoltage = 28 + Math.random() * 8;
  const baseOscillation = 2 + Math.random() * 3;
  
  const poolTemperature = generateWaveform(baseTemp, 50 + Math.random() * 30, hasDefect);
  const current = generateWaveform(baseCurrent, 15 + Math.random() * 10, hasDefect);
  const voltage = generateWaveform(baseVoltage, 3 + Math.random() * 2, hasDefect);
  const oscillation = generateWaveform(baseOscillation, 1 + Math.random() * 0.5, hasDefect);
  
  const features = extractWaveformFeatures(poolTemperature);
  const defectRisk = assessDefectRisk(features, hasDefect);
  
  let stabilityIndex = 100 - features.avgAmplitude * 2 - features.frequency * 5;
  if (hasDefect) stabilityIndex -= 30;
  stabilityIndex = clamp(stabilityIndex, 0, 100);
  
  const defectTypes = ['气孔', '裂纹', '未熔合', '咬边', '焊瘤'];
  const defectType = defectRisk === 'high' ? defectTypes[Math.floor(Math.random() * defectTypes.length)] : undefined;
  
  return {
    id: generateId(),
    timestamp: ts,
    robotId,
    weldProgram,
    poolTemperature,
    current,
    voltage,
    oscillation,
    stabilityIndex,
    defectRisk,
    defectType,
    features,
  };
}

export function generateRealTimeData(
  robotId: string,
  previousData?: RealTimeData
): RealTimeData {
  const hasAnomaly = Math.random() < 0.05;
  
  let poolTemp = 1500 + Math.random() * 300;
  let current = 180 + Math.random() * 60;
  let voltage = 28 + Math.random() * 8;
  let stability = 70 + Math.random() * 30;
  
  if (previousData) {
    poolTemp = previousData.poolTemp + (Math.random() - 0.5) * 50;
    current = previousData.current + (Math.random() - 0.5) * 20;
    voltage = previousData.voltage + (Math.random() - 0.5) * 3;
    stability = previousData.stability + (Math.random() - 0.5) * 10;
  }
  
  if (hasAnomaly) {
    poolTemp += (Math.random() - 0.3) * 200;
    stability -= 20 + Math.random() * 30;
  }
  
  poolTemp = clamp(poolTemp, 1200, 2000);
  current = clamp(current, 100, 300);
  voltage = clamp(voltage, 15, 45);
  stability = clamp(stability, 0, 100);
  
  let status: DeviceStatus = 'normal';
  if (stability < 40) status = 'error';
  else if (stability < 60) status = 'warning';
  
  return {
    timestamp: Date.now(),
    robotId,
    poolTemp: Math.round(poolTemp * 10) / 10,
    current: Math.round(current * 10) / 10,
    voltage: Math.round(voltage * 10) / 10,
    stability: Math.round(stability * 10) / 10,
    status,
  };
}

export function generateHistoricalData(count: number): WeldPoint[] {
  const points: WeldPoint[] = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * 3000;
    points.push(generateWeldPoint(timestamp));
  }
  
  return points;
}
