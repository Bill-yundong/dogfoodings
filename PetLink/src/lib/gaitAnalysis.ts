import type { GaitData, AnomalyDetection, SeverityLevel } from '@/types';

export class GaitAnomalyDetector {
  private baselineSymmetry: number = 90;
  private baselineCadence: number = 120;
  private baselineStrideVariance: number = 0.05;

  computeDTWDistance(series1: number[], series2: number[]): number {
    const n = series1.length;
    const m = series2.length;
    const dtw: number[][] = Array(n + 1)
      .fill(null)
      .map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = Math.abs(series1[i - 1] - series2[j - 1]);
        dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
      }
    }

    return dtw[n][m];
  }

  computeSymmetryScore(accData: { x: number; y: number; z: number }[]): number {
    if (accData.length < 10) return 85;

    const leftPhases: number[] = [];
    const rightPhases: number[] = [];

    for (let i = 0; i < accData.length; i++) {
      const magnitude = Math.sqrt(
        accData[i].x ** 2 + accData[i].y ** 2 + accData[i].z ** 2
      );
      if (i % 2 === 0) {
        leftPhases.push(magnitude);
      } else {
        rightPhases.push(magnitude);
      }
    }

    const leftMean = leftPhases.reduce((a, b) => a + b, 0) / leftPhases.length;
    const rightMean = rightPhases.reduce((a, b) => a + b, 0) / rightPhases.length;

    const symmetry = 100 - Math.abs(leftMean - rightMean) * 10;
    return Math.max(0, Math.min(100, symmetry));
  }

  computeCadence(steps: number, durationMinutes: number): number {
    if (durationMinutes === 0) return 0;
    return steps / durationMinutes;
  }

  computeStrideVariance(strideLengths: number[]): number {
    if (strideLengths.length === 0) return 0;
    const mean = strideLengths.reduce((a, b) => a + b, 0) / strideLengths.length;
    const variance =
      strideLengths.reduce((a, b) => a + (b - mean) ** 2, 0) / strideLengths.length;
    return variance;
  }

  assessRisk(
    symmetryScore: number,
    cadence: number,
    strideVariance: number
  ): { severity: SeverityLevel; confidence: number; description: string } {
    let riskScore = 0;
    let factors: string[] = [];

    const symmetryDiff = this.baselineSymmetry - symmetryScore;
    if (symmetryDiff > 15) {
      riskScore += 40;
      factors.push('步态对称性严重下降');
    } else if (symmetryDiff > 8) {
      riskScore += 20;
      factors.push('步态对称性下降');
    }

    const cadenceDiff = Math.abs(cadence - this.baselineCadence);
    if (cadenceDiff > 40) {
      riskScore += 25;
      factors.push('步频异常');
    } else if (cadenceDiff > 20) {
      riskScore += 10;
    }

    if (strideVariance > this.baselineStrideVariance * 3) {
      riskScore += 35;
      factors.push('步长一致性差');
    } else if (strideVariance > this.baselineStrideVariance * 2) {
      riskScore += 15;
    }

    let severity: SeverityLevel = 'low';
    if (riskScore >= 60) {
      severity = 'high';
    } else if (riskScore >= 30) {
      severity = 'medium';
    }

    const confidence = Math.min(0.95, 0.5 + riskScore / 200);
    const description = factors.length > 0
      ? factors.join('，') + '，建议关注或咨询兽医'
      : '步态正常';

    return { severity, confidence, description };
  }

  analyzeGaitData(gaitData: GaitData): AnomalyDetection | null {
    const { symmetryScore, cadence, strideLength, acceleration, petId, timestamp } = gaitData;

    const strideLengths = [strideLength];
    const strideVariance = this.computeStrideVariance(strideLengths);

    const risk = this.assessRisk(symmetryScore, cadence, strideVariance);

    if (risk.severity === 'low' && risk.confidence < 0.6) {
      return null;
    }

    return {
      id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      petId,
      type: 'gait',
      severity: risk.severity,
      confidence: risk.confidence,
      timestamp,
      description: risk.description,
      acknowledged: false,
      synced: false,
      version: 1,
    };
  }

  detectTrend(history: GaitData[]): { trend: 'improving' | 'stable' | 'declining'; change: number } {
    if (history.length < 7) {
      return { trend: 'stable', change: 0 };
    }

    const recent = history.slice(-3);
    const earlier = history.slice(-7, -4);

    const recentSymmetry = recent.reduce((sum, d) => sum + d.symmetryScore, 0) / recent.length;
    const earlierSymmetry = earlier.reduce((sum, d) => sum + d.symmetryScore, 0) / earlier.length;

    const change = recentSymmetry - earlierSymmetry;

    if (change > 3) return { trend: 'improving', change };
    if (change < -3) return { trend: 'declining', change };
    return { trend: 'stable', change };
  }
}

export const gaitDetector = new GaitAnomalyDetector();
