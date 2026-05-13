import type { CraneState, SemanticAlignment } from '../types/crane';

export class SemanticAlignmentService {
  private fieldWeights: Record<keyof CraneState, number> = {
    id: 0,
    name: 0.05,
    position: 0.25,
    jibAngle: 0.15,
    jibLength: 0.1,
    trolleyPosition: 0.15,
    hookHeight: 0.1,
    loadWeight: 0.1,
    rotationSpeed: 0.05,
    trolleySpeed: 0.025,
    hoistSpeed: 0.025,
    timestamp: 0
  };

  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  private angleDifference(angle1: number, angle2: number): number {
    const diff = Math.abs(this.normalizeAngle(angle1) - this.normalizeAngle(angle2));
    return diff > 180 ? 360 - diff : diff;
  }

  private calculateFieldSimilarity(
    terminalValue: any,
    platformValue: any,
    field: keyof CraneState
  ): number {
    if (field === 'position') {
      const tPos = terminalValue as { x: number; y: number; z: number };
      const pPos = platformValue as { x: number; y: number; z: number };
      const distance = Math.sqrt(
        Math.pow(tPos.x - pPos.x, 2) +
        Math.pow(tPos.y - pPos.y, 2) +
        Math.pow(tPos.z - pPos.z, 2)
      );
      const maxDistance = 100;
      return Math.max(0, 1 - distance / maxDistance);
    }

    if (field === 'jibAngle') {
      const diff = this.angleDifference(terminalValue, platformValue);
      return Math.max(0, 1 - diff / 180);
    }

    if (typeof terminalValue === 'number' && typeof platformValue === 'number') {
      const maxVal = Math.max(Math.abs(terminalValue), Math.abs(platformValue), 1);
      return Math.max(0, 1 - Math.abs(terminalValue - platformValue) / maxVal);
    }

    if (typeof terminalValue === 'string' && typeof platformValue === 'string') {
      return terminalValue === platformValue ? 1 : 0;
    }

    return 0.5;
  }

  align(terminalData: CraneState, platformData: CraneState): SemanticAlignment {
    let totalScore = 0;
    let totalWeight = 0;

    const fields = Object.keys(this.fieldWeights) as (keyof CraneState)[];
    
    fields.forEach(field => {
      const weight = this.fieldWeights[field];
      if (weight > 0) {
        const similarity = this.calculateFieldSimilarity(
          terminalData[field],
          platformData[field],
          field
        );
        totalScore += similarity * weight;
        totalWeight += weight;
      }
    });

    const alignmentScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const timeDiff = Math.abs(terminalData.timestamp - platformData.timestamp);
    const timeDecay = Math.max(0, 1 - timeDiff / 5000);
    const finalScore = alignmentScore * timeDecay;

    return {
      terminalData,
      platformData,
      alignmentScore: finalScore,
      timestamp: Date.now(),
      confidence: timeDecay
    };
  }

  isAligned(alignment: SemanticAlignment, threshold: number = 0.8): boolean {
    return alignment.alignmentScore >= threshold;
  }

  mergeData(alignment: SemanticAlignment): CraneState {
    const alpha = alignment.alignmentScore;
    const terminal = alignment.terminalData;
    const platform = alignment.platformData;

    return {
      id: terminal.id,
      name: terminal.name,
      position: {
        x: terminal.position.x * alpha + platform.position.x * (1 - alpha),
        y: terminal.position.y * alpha + platform.position.y * (1 - alpha),
        z: terminal.position.z * alpha + platform.position.z * (1 - alpha)
      },
      jibAngle: this.lerpAngle(terminal.jibAngle, platform.jibAngle, alpha),
      jibLength: terminal.jibLength * alpha + platform.jibLength * (1 - alpha),
      trolleyPosition: terminal.trolleyPosition * alpha + platform.trolleyPosition * (1 - alpha),
      hookHeight: terminal.hookHeight * alpha + platform.hookHeight * (1 - alpha),
      loadWeight: terminal.loadWeight * alpha + platform.loadWeight * (1 - alpha),
      rotationSpeed: terminal.rotationSpeed * alpha + platform.rotationSpeed * (1 - alpha),
      trolleySpeed: terminal.trolleySpeed * alpha + platform.trolleySpeed * (1 - alpha),
      hoistSpeed: terminal.hoistSpeed * alpha + platform.hoistSpeed * (1 - alpha),
      timestamp: Date.now()
    };
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const diff = this.angleDifference(a, b);
    if (diff <= 180) {
      return a + (b - a) * t;
    }
    if (a < b) {
      return a - (360 - b + a) * t;
    }
    return a + (360 - a + b) * t;
  }
}

export const semanticAlignmentService = new SemanticAlignmentService();
