export type { ProbeResult, PathQuality, SwitchEvent } from '@shared/protocol';

export interface NetPulseDB {
  probeResults: {
    id: string;
    timestamp: number;
    pathId: string;
    latency: number;
    jitter: number;
    packetLoss: number;
    bandwidth: number;
    hopCount: number;
  };
  switchEvents: {
    id: string;
    timestamp: number;
    fromPath: string;
    toPath: string;
    reason: 'latency' | 'jitter' | 'loss' | 'manual' | 'predictive';
    switchTime: number;
    success: boolean;
  };
  dailySummaries: {
    date: string;
    avgLatency: number;
    avgJitter: number;
    avgPacketLoss: number;
    totalSwitches: number;
    uptime: number;
    qualityDistribution: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
  };
  environmentProfiles: {
    id: string;
    createdAt: number;
    period: 'peak' | 'off-peak' | 'weekend' | 'holiday';
    typicalLatency: number;
    typicalJitter: number;
    typicalLoss: number;
    recommendedPaths: string[];
  };
}

export interface AppState {
  isMonitoring: boolean;
  activePath: string | null;
  connected: boolean;
  lastUpdateTime: number;
  alerts: Alert[];
}

export interface Alert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  pathId?: string;
  dismissed: boolean;
}

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface PredictionResult {
  predictedLatency: number;
  predictedJitter: number;
  predictedLoss: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  recommendation: 'hold' | 'prepare-switch' | 'switch-now';
}
