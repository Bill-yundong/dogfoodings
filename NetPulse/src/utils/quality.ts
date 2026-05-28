import type { ProbeResult, PathQuality, QualityLevel } from '@/types';
import { mean, ewma } from './math';
import type { ClientConfig } from '@shared/protocol';

export const calculateLatencyScore = (latency: number): number => {
  if (latency < 20) return 100;
  if (latency < 50) return 90 + ((50 - latency) / 30) * 10;
  if (latency < 100) return 70 + ((100 - latency) / 50) * 20;
  if (latency < 200) return 40 + ((200 - latency) / 100) * 30;
  if (latency < 500) return 10 + ((500 - latency) / 300) * 30;
  return Math.max(0, 10 - (latency - 500) / 50);
};

export const calculateJitterScore = (jitter: number): number => {
  if (jitter < 5) return 100;
  if (jitter < 15) return 85 + ((15 - jitter) / 10) * 15;
  if (jitter < 30) return 60 + ((30 - jitter) / 15) * 25;
  if (jitter < 50) return 30 + ((50 - jitter) / 20) * 30;
  if (jitter < 100) return 5 + ((100 - jitter) / 50) * 25;
  return Math.max(0, 5 - (jitter - 100) / 20);
};

export const calculateLossScore = (loss: number): number => {
  const lossPercent = loss * 100;
  if (lossPercent < 0.5) return 100;
  if (lossPercent < 1) return 90 + ((1 - lossPercent) / 0.5) * 10;
  if (lossPercent < 2) return 70 + ((2 - lossPercent) / 1) * 20;
  if (lossPercent < 5) return 40 + ((5 - lossPercent) / 3) * 30;
  if (lossPercent < 10) return 10 + ((10 - lossPercent) / 5) * 30;
  return Math.max(0, 10 - (lossPercent - 10) / 2);
};

export const calculateStability = (values: number[]): number => {
  if (values.length < 10) return 0.5;
  const recent = values.slice(-10);
  const avg = mean(recent);
  if (avg === 0) return 1;
  const variance = recent.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / recent.length;
  const coefficientOfVariation = Math.sqrt(variance) / avg;
  return Math.max(0, Math.min(1, 1 - coefficientOfVariation * 2));
};

export const calculateOverallScore = (
  latencyScore: number,
  jitterScore: number,
  lossScore: number,
  stability: number
): number => {
  const weights = {
    latency: 0.35,
    jitter: 0.35,
    loss: 0.20,
    stability: 0.10,
  };
  return (
    latencyScore * weights.latency +
    jitterScore * weights.jitter +
    lossScore * weights.loss +
    stability * 100 * weights.stability
  );
};

export const calculatePathQuality = (
  pathId: string,
  recentResults: ProbeResult[],
  prediction: {
    trend: 'improving' | 'stable' | 'deteriorating';
    next5sLatency: number;
    switchRisk: number;
  }
): PathQuality => {
  const latencies = recentResults.map(r => r.latency);
  const jitters = recentResults.map(r => r.jitter);
  const losses = recentResults.map(r => r.packetLoss);

  const smoothedLatency = ewma(latencies, 0.3);
  const smoothedJitter = ewma(jitters, 0.3);
  const smoothedLoss = ewma(losses, 0.3);

  const latencyScore = calculateLatencyScore(smoothedLatency);
  const jitterScore = calculateJitterScore(smoothedJitter);
  const lossScore = calculateLossScore(smoothedLoss);
  const stability = calculateStability(latencies);

  const overallScore = calculateOverallScore(latencyScore, jitterScore, lossScore, stability);

  return {
    pathId,
    overallScore,
    latencyScore,
    jitterScore,
    lossScore,
    stability,
    prediction,
  };
};

export const getQualityLevel = (score: number): QualityLevel => {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
};

export const getQualityColor = (level: QualityLevel): string => {
  switch (level) {
    case 'excellent':
      return 'text-alert-green';
    case 'good':
      return 'text-neon-cyan';
    case 'fair':
      return 'text-alert-orange';
    case 'poor':
      return 'text-alert-red';
  }
};

export const getQualityBgColor = (level: QualityLevel): string => {
  switch (level) {
    case 'excellent':
      return 'bg-alert-green/20';
    case 'good':
      return 'bg-neon-cyan/20';
    case 'fair':
      return 'bg-alert-orange/20';
    case 'poor':
      return 'bg-alert-red/20';
  }
};

export const shouldTriggerAlert = (
  result: ProbeResult,
  config: ClientConfig
): { shouldAlert: boolean; metric?: string; severity: 'warning' | 'critical' } => {
  if (result.latency > config.latencyThreshold * 2) {
    return { shouldAlert: true, metric: 'latency', severity: 'critical' };
  }
  if (result.latency > config.latencyThreshold) {
    return { shouldAlert: true, metric: 'latency', severity: 'warning' };
  }
  if (result.jitter > config.jitterThreshold * 2) {
    return { shouldAlert: true, metric: 'jitter', severity: 'critical' };
  }
  if (result.jitter > config.jitterThreshold) {
    return { shouldAlert: true, metric: 'jitter', severity: 'warning' };
  }
  if (result.packetLoss * 100 > config.lossThreshold * 2) {
    return { shouldAlert: true, metric: 'packetLoss', severity: 'critical' };
  }
  if (result.packetLoss * 100 > config.lossThreshold) {
    return { shouldAlert: true, metric: 'packetLoss', severity: 'warning' };
  }
  return { shouldAlert: false, severity: 'warning' };
};

export const getSensitivityMultiplier = (
  sensitivity: 'low' | 'medium' | 'high'
): number => {
  switch (sensitivity) {
    case 'low':
      return 1.5;
    case 'medium':
      return 1.0;
    case 'high':
      return 0.6;
  }
};
