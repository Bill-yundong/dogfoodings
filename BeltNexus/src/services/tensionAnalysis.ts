import type { SensorData, TensionAnalysisResult, StressPoint, AnomalyPoint } from '@/types';
import { interpolateTensionProfile } from './sensorService';
import { mean, stdDev, findPeaks } from '@/utils/math';

const BELT_LENGTH = 100;
const PROFILE_RESOLUTION = 100;

export function analyzeTension(sensorData: SensorData[]): TensionAnalysisResult {
  const profile = interpolateTensionProfile(sensorData, BELT_LENGTH, PROFILE_RESOLUTION);
  const stressPoints = detectStressConcentration(profile);
  const anomalies = detectAnomalies(profile, sensorData);
  const healthScore = calculateHealthScore(profile, anomalies);
  
  return {
    profile,
    stressPoints,
    anomalies,
    healthScore,
  };
}

function detectStressConcentration(profile: number[]): StressPoint[] {
  const stressPoints: StressPoint[] = [];
  const avgTension = mean(profile);
  const std = stdDev(profile);
  const threshold = avgTension + std * 1.5;
  
  const peaks = findPeaks(profile, threshold, 3);
  
  for (const peakIdx of peaks) {
    const position = (peakIdx / (profile.length - 1)) * BELT_LENGTH;
    const tension = profile[peakIdx];
    const ratio = tension / avgTension;
    
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (ratio > 1.5) severity = 'high';
    else if (ratio > 1.2) severity = 'medium';
    
    stressPoints.push({
      position,
      tension,
      severity,
    });
  }
  
  return stressPoints;
}

function detectAnomalies(profile: number[], sensorData: SensorData[]): AnomalyPoint[] {
  const anomalies: AnomalyPoint[] = [];
  const avgTension = mean(profile);
  const std = stdDev(profile);
  
  const tensionWarning = avgTension + std * 2;
  const tensionCritical = avgTension + std * 3;
  
  for (let i = 0; i < profile.length; i++) {
    const tension = profile[i];
    const position = (i / (profile.length - 1)) * BELT_LENGTH;
    
    if (tension > tensionCritical) {
      anomalies.push({
        position,
        type: 'tension',
        value: tension,
        threshold: tensionCritical,
        severity: 'critical',
      });
    } else if (tension > tensionWarning) {
      anomalies.push({
        position,
        type: 'tension',
        value: tension,
        threshold: tensionWarning,
        severity: 'warning',
      });
    }
  }
  
  for (const data of sensorData) {
    if (data.temperature > 75) {
      anomalies.push({
        position: data.position,
        type: 'temperature',
        value: data.temperature,
        threshold: 75,
        severity: data.temperature > 85 ? 'critical' : 'warning',
      });
    }
    if (data.vibration > 5) {
      anomalies.push({
        position: data.position,
        type: 'vibration',
        value: data.vibration,
        threshold: 5,
        severity: data.vibration > 7 ? 'critical' : 'warning',
      });
    }
  }
  
  return anomalies;
}

function calculateHealthScore(
  profile: number[],
  anomalies: AnomalyPoint[]
): number {
  const avgTension = mean(profile);
  const std = stdDev(profile);
  const cv = std / avgTension;
  
  let score = 100;
  
  const cvPenalty = Math.min(30, cv * 100);
  score -= cvPenalty;
  
  for (const anomaly of anomalies) {
    if (anomaly.severity === 'critical') {
      score -= 15;
    } else {
      score -= 5;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

export function predictWear(
  currentWear: number,
  tensionHistory: number[],
  operatingHours: number
): number {
  const avgTension = mean(tensionHistory);
  const wearRate = 0.001 * avgTension;
  const predictedWear = currentWear + wearRate * operatingHours;
  return predictedWear;
}
